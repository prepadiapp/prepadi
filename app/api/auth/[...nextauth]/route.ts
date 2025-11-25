import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Email/Password Provider
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }
        
        if (!user.emailVerified) {
          return null;
        }

        return user;
      },
    }),
  ],

  // Event hooks for side effects
  events: {
    // Fires when an OAuth account is linked to a user
    async linkAccount({ user, account, profile }) {
      if (account.provider === 'google') {
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            emailVerified: new Date(),
          },
        });
      }
    },

    async signIn({ user }) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
      } catch (error) {
        console.error("Error updating lastLogin:", error);
        // Don't block login if this fails
      }
    },
  },

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    // JWT callback: Customize the JWT token
    async jwt({ token, user, account }) {
      if (account && user) {
        token.id = user.id;

        token.role = user.role;
        // Fetch fresh emailVerified status from database
        // (linkAccount event might have just updated it)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });
        
        token.emailVerified = dbUser?.emailVerified ?? null;
      } else if (token.id) {
        // This runs on subsequent loads
        // We just need to make sure the role is still there
        if (!token.role) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true }
          });
          token.role = dbUser?.role ?? UserRole.STUDENT;
        }
      }
      return token;
    },
    
    // Session callback: Customize the session object
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.emailVerified = token.emailVerified as Date | null;
      session.user.role = token.role;
      return session;
    },

     async redirect({ url, baseUrl, token }) {
      // If a token exists (i.e., user is logged in)
      if (token) {
        console.log(`--- [Prepadi REDIRECT] Token role: ${token.role}`);
        
        // Check the role on the token
        if (token.role === UserRole.ADMIN) {
          // If they are an ADMIN, send them to the admin dashboard
          // But only if they are trying to go to the base /dashboard
          const defaultDashboardUrl = `${baseUrl}/dashboard`;
          if (url === defaultDashboardUrl || url === baseUrl + '/') {
            return `${baseUrl}/admin`;
          }
        }
      }
      // Otherwise, return the URL they were trying to go to
      return url;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };