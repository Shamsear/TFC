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
        token.teamId = user.teamId
        token.mustChangePassword = (user as any).mustChangePassword
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
        if (token.teamId) {
          session.user.teamId = token.teamId as string
        }
        ;(session.user as any).mustChangePassword = !!token.mustChangePassword
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const userRole = auth?.user?.role
      const pathname = nextUrl.pathname

      // Allow API, static files, and auth routes
      if (pathname.startsWith("/api") || 
          pathname.startsWith("/_next") || 
          pathname.startsWith("/auth")) {
        return true
      }

      // Allow home page for everyone
      if (pathname === "/") {
        return true
      }

      // Protect and restrict super-admin routes
      if (pathname.startsWith("/super-admin")) {
        if (!isLoggedIn) return false
        if (userRole !== "SUPER_ADMIN") return false
        return true
      }
      
      // Protect and restrict sub-admin routes
      if (pathname.startsWith("/sub-admin")) {
        if (!isLoggedIn) return false
        if (userRole !== "SUB_ADMIN") return false
        return true
      }

      // Protect and restrict team routes
      if (pathname.startsWith("/team")) {
        if (!isLoggedIn) return false
        if (userRole !== "TEAM_MANAGER") return false
        return true
      }

      // Public pages - only allow if NOT logged in
      if (isLoggedIn) {
        return false // Logged-in users cannot access public pages
      }

      return true // Allow unauthenticated users to access public pages
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
}

export const { auth, signIn, signOut } = NextAuth(authConfig)
