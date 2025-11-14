import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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
  },

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    // JWT callback: Customize the JWT token
    async jwt({ token, user, account }) {
      if (account && user) {
        token.id = user.id;
        
        // Fetch fresh emailVerified status from database
        // (linkAccount event might have just updated it)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });
        
        token.emailVerified = dbUser?.emailVerified ?? null;
      }
      return token;
    },
    
    // Session callback: Customize the session object
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.emailVerified = token.emailVerified as Date | null;
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };