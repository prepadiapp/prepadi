import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole, PlanInterval } from '@prisma/client';
import { cookies } from 'next/headers';

// Helper for date calculation
function calculateEndDate(interval: PlanInterval): Date | null {
  const date = new Date();
  switch (interval) {
    case PlanInterval.MONTHLY: date.setMonth(date.getMonth() + 1); return date;
    case PlanInterval.QUARTERLY: date.setMonth(date.getMonth() + 3); return date;
    case PlanInterval.BIANNUALLY: date.setMonth(date.getMonth() + 6); return date;
    case PlanInterval.YEARLY: date.setFullYear(date.getFullYear() + 1); return date;
    case PlanInterval.LIFETIME: return null;
    default: return new Date();
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      async profile(profile) {
        // 1. Attempt to get Role from Intent Cookie immediately
        let role = UserRole.STUDENT; 
        try {
          const cookieStore = await cookies();
          const intentCookie = cookieStore.get('prepadi_signup_intent');
          if (intentCookie) {
            const intent = JSON.parse(intentCookie.value);
            // Verify role validity
            if (intent.role && Object.values(UserRole).includes(intent.role)) {
              role = intent.role;
            }
          }
        } catch (error) {
          console.error("Error reading intent cookie in profile:", error);
        }

        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
          role: role, 
        };
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) return null;
        if (!user.emailVerified) return null;

        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.emailVerified = token.emailVerified as Date | null;
        session.user.role = token.role as UserRole;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },

  events: {
    async linkAccount({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },

    // Handled in EVENT to ensure User exists in DB
    async signIn({ user, account }) {
      // We only care about Google signups that need setup
      if (account?.provider === 'google') {
        try {
          const cookieStore = await cookies(); 
          const intentCookie = cookieStore.get('prepadi_signup_intent');

          if (intentCookie) {
            console.log(`[AUTH EVENT] Processing Intent for ${user.email}`);
            const intent = JSON.parse(intentCookie.value);
            const { planId, role, orgName } = intent;

            // 1. Check if user already has a subscription (User OR Org owner)
            // We need to fetch the fresh user from DB to check relations
            const dbUser = await prisma.user.findUnique({ 
              where: { id: user.id },
              include: { 
                subscription: true, 
                ownedOrganization: { include: { subscription: true } } // Fetch owned org info
              }
            });

            if (!dbUser) return; // Should not happen if adapter works

            // Check if Subscription exists either on User OR on their Owned Organization
            const hasUserSub = !!dbUser.subscription;
            const hasOrgSub = !!dbUser.ownedOrganization?.subscription;

            // If they have NO subscription at all, proceed
            if (!hasUserSub && !hasOrgSub) {
               const plan = await prisma.plan.findUnique({ where: { id: planId } });
               
               if (plan) {
                 await prisma.$transaction(async (tx) => {
                    // A. Ensure Role Matches (Fix if profile callback missed it)
                    if (dbUser.role !== role) {
                        console.log(`[AUTH EVENT] correcting role to ${role}`);
                        await tx.user.update({
                            where: { id: dbUser.id },
                            data: { role: role as UserRole },
                        });
                    }

                    // B. Handle Org Creation
                    let orgId = null;
                    if (role === UserRole.ORGANIZATION) {
                      if (!orgName) {
                          console.error("[AUTH EVENT] Missing Org Name for Organization Role");
                          // Fallback or error? For now, we log.
                          // If we can't create org, we can't create subscription.
                          return; 
                      }

                      // Check idempotency
                      const existingOrg = await tx.organization.findUnique({ where: { ownerId: dbUser.id } });
                      
                      if (!existingOrg) {
                        console.log(`[AUTH EVENT] Creating Organization: ${orgName}`);
                        const org = await tx.organization.create({
                          data: { name: orgName, ownerId: dbUser.id }
                        });
                        orgId = org.id;
                        
                        // Link User to Org
                        await tx.user.update({
                          where: { id: dbUser.id },
                          data: { ownedOrganization: { connect: { id: org.id } } }
                        });
                      } else {
                        orgId = existingOrg.id;
                      }
                    }

                    // C. Create Subscription
                    const isPaid = plan.price > 0;
                    
                    // CRITICAL FIX: Explicitly handle ID assignment
                    let userIdToLink = undefined;
                    let orgIdToLink = undefined;

                    if (role === UserRole.STUDENT) {
                        userIdToLink = dbUser.id;
                    } else if (role === UserRole.ORGANIZATION) {
                        if (orgId) {
                            orgIdToLink = orgId;
                        } else {
                            console.error("[AUTH EVENT] Cannot create subscription: Org ID is missing");
                            return; 
                        }
                    }

                    console.log(`[AUTH EVENT] Creating Sub. User: ${userIdToLink}, Org: ${orgIdToLink}, Plan: ${plan.name}`);

                    await tx.subscription.create({
                        data: {
                            planId: plan.id,
                            startDate: new Date(),
                            endDate: calculateEndDate(plan.interval),
                            isActive: !isPaid, // Active if Free, Inactive if Paid
                            userId: userIdToLink,
                            organizationId: orgIdToLink,
                        },
                    });
                 });
               } else {
                   console.error(`[AUTH EVENT] Plan not found: ${planId}`);
               }
            } else {
                console.log(`[AUTH EVENT] User already has subscription. Skipping setup.`);
            }
          } else {
              console.log("[AUTH EVENT] No intent cookie found.");
          }
        } catch (error) {
          console.error("[AUTH EVENT] Error processing signup intent:", error);
        }
      }
    }
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };