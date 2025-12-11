import { UserRole } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      organizationId?: string | null
      emailVerified: Date | null // Added emailVerified
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: UserRole
    organizationId?: string | null
    emailVerified: Date | null // Added emailVerified
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    organizationId?: string | null
    emailVerified: Date | null // Added emailVerified
  }
}