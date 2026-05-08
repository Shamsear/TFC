import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

// Middleware-compatible auth config (no Prisma)
export const authConfig: NextAuthConfig = {
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [], // Providers are defined in the API route
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const userRole = auth?.user?.role
      const pathname = nextUrl.pathname

      // Allow public routes
      if (pathname.startsWith("/api") || 
          pathname.startsWith("/_next") || 
          pathname.startsWith("/auth")) {
        return true
      }

      // Protect admin routes
      if (pathname.startsWith("/super-admin") || pathname.startsWith("/sub-admin")) {
        if (!isLoggedIn) return false
        
        if (pathname.startsWith("/super-admin") && userRole !== "SUPER_ADMIN") {
          return false
        }
        
        if (pathname.startsWith("/sub-admin") && userRole !== "SUB_ADMIN") {
          return false
        }
      }

      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
}

export const { auth, signIn, signOut } = NextAuth(authConfig)
