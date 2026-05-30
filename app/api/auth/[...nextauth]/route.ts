import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { authConfig } from "@/lib/auth"

// Extend the base config with Prisma-dependent providers
const handler = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const emailOrUsername = credentials.email as string

        // Try to find user by email or name (username)
        const user = await prisma.users.findFirst({
          where: {
            OR: [
              { email: emailOrUsername },
              { name: emailOrUsername }
            ]
          }
        })

        if (!user || !await compare(credentials.password as string, user.passwordHash)) {
          return null
        }

        // Check if user is active
        if (!user.isActive) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          teamId: user.teamId,
          managerId: user.managerId,
          mustChangePassword: user.mustChangePassword
        }
      }
    })
  ],
})

export const GET = handler.handlers.GET
export const POST = handler.handlers.POST
export { authConfig }
