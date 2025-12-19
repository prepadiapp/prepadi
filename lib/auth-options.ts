import { NextAuthOptions } from 'next-auth';
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
        // 1. Attempt to get Role from Intent Cookie
        let role = UserRole.STUDENT; 
        try {
          const cookieStore = await cookies();
          const intentCookie = cookieStore.get('prepadi_signup_intent');
          if (intentCookie) {
            const intent = JSON.parse(intentCookie.value);
            // If invited or skipping plan, FORCE role to STUDENT
            if (intent.inviteToken || intent.skipPlan) {
                role = UserRole.STUDENT;
            } else if (intent.role && Object.values(UserRole).includes(intent.role)) {
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

    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const cookieStore = await cookies(); 
          const intentCookie = cookieStore.get('prepadi_signup_intent');

          if (intentCookie) {
            const intent = JSON.parse(intentCookie.value);
            const { planId, role, orgName, inviteToken, skipPlan } = intent;

            const dbUser = await prisma.user.findUnique({ 
              where: { id: user.id },
              include: { 
                subscription: true, 
                ownedOrganization: { include: { subscription: true } }
              }
            });

            if (!dbUser) return;

            // --- BRANCH 1: DIRECT INVITE ---
            if (inviteToken) {
                console.log(`[AUTH EVENT] Processing Invite for ${user.email}`);
                const invite = await prisma.orgInvite.findUnique({ where: { token: inviteToken } });
                
                if (invite && invite.status === 'PENDING' && !dbUser.organizationId) {
                    await prisma.$transaction(async (tx) => {
                        await tx.user.update({
                            where: { id: dbUser.id },
                            data: { 
                                organizationId: invite.organizationId,
                                role: UserRole.STUDENT 
                            }
                        });
                        await tx.orgInvite.delete({ where: { id: invite.id } });
                    });
                }
                return;
            }

            // --- BRANCH 2: SKIP PLAN (General Join) ---
            if (skipPlan) {
                // Just allow creation (role is already set via profile callback)
                // No subscription needed.
                console.log(`[AUTH EVENT] Skipping plan for ${user.email} (General Join Flow)`);
                return;
            }

            // --- BRANCH 3: STANDARD FLOW (Plan Purchase) ---
            const hasUserSub = !!dbUser.subscription;
            const hasOrgSub = !!dbUser.ownedOrganization?.subscription;

            if (!hasUserSub && !hasOrgSub && planId) {
               const plan = await prisma.plan.findUnique({ where: { id: planId } });
               
               if (plan) {
                 await prisma.$transaction(async (tx) => {
                    if (dbUser.role !== role) {
                        await tx.user.update({
                            where: { id: dbUser.id },
                            data: { role: role as UserRole },
                        });
                    }

                    let orgId = null;
                    if (role === UserRole.ORGANIZATION) {
                      if (orgName) {
                          const existingOrg = await tx.organization.findUnique({ where: { ownerId: dbUser.id } });
                          if (!existingOrg) {
                            const org = await tx.organization.create({
                              data: { name: orgName, ownerId: dbUser.id }
                            });
                            orgId = org.id;
                            await tx.user.update({
                              where: { id: dbUser.id },
                              data: { ownedOrganization: { connect: { id: org.id } } }
                            });
                          } else {
                            orgId = existingOrg.id;
                          }
                      }
                    }

                    const isPaid = plan.price > 0;
                    const userIdToLink = role === UserRole.STUDENT ? dbUser.id : null;
                    const orgIdToLink = role === UserRole.ORGANIZATION ? orgId : null;

                    if (userIdToLink || orgIdToLink) {
                        await tx.subscription.create({
                            data: {
                                planId: plan.id,
                                startDate: new Date(),
                                endDate: calculateEndDate(plan.interval),
                                isActive: !isPaid,
                                userId: userIdToLink,
                                organizationId: orgIdToLink,
                            },
                        });
                    }
                 });
               }
            }
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