import { User } from 'next-auth';
import { JWT } from 'next-auth/jwt';

/**
 * Module augmentation for 'next-auth'.
 * This allows us to add custom properties to the
 * built-in session and user types.
 */

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on
   * the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's database ID. */
      id: string;
      /** The user's email verification status. */
      emailVerified: Date | null;
    } & User; //... and the default fields (name, email, image)
  }

  /**
   * The default user model. We are adding `emailVerified` to it
   * so it matches our database schema.
   */
  interface User {
    emailVerified: Date | null;
  }
}

/**
 * Module augmentation for 'next-auth/jwt'
 * This adds our custom properties to the JWT token.
 */
declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback */
  interface JWT {
    /** The user's database ID. */
    id: string;
    /** The user's email verification status. */
    emailVerified: Date | null;
  }
}