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

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
          role: UserRole.STUDENT, // Default role
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

  events: {
    async linkAccount({ user, account }) {
      if (account.provider === 'google') {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
    },

    // --- SIGN IN EVENT ---
    async signIn({ user, account }) {
      // 1. Update Last Login
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });
      } catch (e) { 
        console.error("Login tracking error", e); 
      }

      // 2. CHECK FOR SIGNUP INTENT
      if (account && account.provider === 'google') {
        try {
          // Await cookies()
          const cookieStore = await cookies(); 
          const intentCookie = cookieStore.get('prepadi_signup_intent');

          if (intentCookie) {
            const intent = JSON.parse(intentCookie.value);
            const { planId, role, orgName } = intent;

            // Ensure user doesn't already have a subscription
            const existingSub = await prisma.subscription.findFirst({ 
              where: { userId: user.id } 
            });

            if (!existingSub) {
              const plan = await prisma.plan.findUnique({ where: { id: planId } });
              
              if (plan) {
                console.log(`[AUTH EVENT] Processing Intent for ${user.email}: ${plan.name}`);
                
                await prisma.$transaction(async (tx) => {
                  // A. Update Role
                  await tx.user.update({
                    where: { id: user.id },
                    data: { role: role as UserRole },
                  });

                  // B. Handle Org
                  let orgId = null;
                  if (role === UserRole.ORGANIZATION && orgName) {
                    const org = await tx.organization.create({
                      data: { name: orgName, ownerId: user.id }
                    });
                    orgId = org.id;
                    await tx.user.update({
                      where: { id: user.id },
                      data: { ownedOrganization: { connect: { id: org.id } } }
                    });
                  }

                  // C. Create Subscription
                  const isPaid = plan.price > 0;
                  const userIdToLink = role === UserRole.STUDENT ? user.id : null;
                  const orgIdToLink = role === UserRole.ORGANIZATION ? orgId : null;

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
              }
            }
          }
        } catch (error) {
          console.error("[AUTH EVENT] Failed to process signup intent:", error);
        }
      }
    },
  },

  session: {
    strategy: 'jwt',
  },

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
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };