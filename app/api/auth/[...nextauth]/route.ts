import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  // Remove PrismaAdapter - use JWT sessions only
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string
        }
        if (token.role) {
          session.user.role = token.role as any
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Get the user's session to check their role
      // If signing in, redirect based on role
      if (url === baseUrl || url === `${baseUrl}/`) {
        // This will be handled by middleware
        return baseUrl
      }
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
}

const { handlers } = NextAuth(authConfig)

export const GET = handlers.GET
export const POST = handlers.POST
