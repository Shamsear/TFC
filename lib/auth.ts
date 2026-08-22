import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import { prisma } from "./prisma"

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
        // Always resolve current teamId to reflect team reassignments
        if (token.role === "TEAM_MANAGER" && token.id) {
          try {
            // 1. Try via users.managerId → managers → manager_teams.isCurrent
            const mgrLink = await prisma.manager_teams.findFirst({
              where: { manager: { user: { id: token.id as string } }, isCurrent: true },
              select: { teamId: true }
            })
            if (mgrLink) {
              session.user.teamId = mgrLink.teamId
            } else {
              // 2. Try via users.name → managers.name → manager_teams.isCurrent
              const user = await prisma.users.findUnique({
                where: { id: token.id as string },
                select: { teamId: true, name: true, managerId: true }
              })
              if (user?.name) {
                const mgrByName = await prisma.managers.findFirst({
                  where: { name: { equals: user.name, mode: 'insensitive' } },
                  select: { id: true }
                })
                if (mgrByName) {
                  const mgrTeam = await prisma.manager_teams.findFirst({
                    where: { managerId: mgrByName.id, isCurrent: true },
                    select: { teamId: true }
                  })
                  if (mgrTeam) {
                    session.user.teamId = mgrTeam.teamId
                  }
                }
              }
              // 3. If still no teamId, use DB users.teamId or JWT token
              if (!session.user.teamId) {
                session.user.teamId = user?.teamId || (token.teamId as string) || undefined
              }
            }
          } catch {
            session.user.teamId = token.teamId as string
          }
        } else if (token.teamId) {
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
      if (pathname === "/team" || pathname.startsWith("/team/")) {
        if (!isLoggedIn) return false
        if (userRole !== "TEAM_MANAGER") return false
        return true
      }

      return true // Allow all users (including logged-in) to access public pages
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
}

export const { auth, signIn, signOut } = NextAuth(authConfig)
