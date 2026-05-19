import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const mustChange = !!(req.auth?.user as any)?.mustChangePassword
  const userRole = req.auth?.user?.role

  // Allow API and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next()
  }

  // Enforce password change for users who have the mustChangePassword flag
  if (isAuthenticated && mustChange) {
    if (pathname !== "/auth/change-password") {
      return NextResponse.redirect(new URL("/auth/change-password", req.url))
    }
    return NextResponse.next()
  }

  // Define role-based home routes
  const roleRoutes = {
    SUPER_ADMIN: "/super-admin",
    SUB_ADMIN: "/sub-admin",
    TEAM_MANAGER: "/team"
  }

  // Redirect authenticated users trying to access auth pages
  if (pathname.startsWith("/auth")) {
    if (isAuthenticated && userRole) {
      const userHomeRoute = roleRoutes[userRole as keyof typeof roleRoutes]
      return NextResponse.redirect(new URL(userHomeRoute, req.url))
    }
    return NextResponse.next()
  }


  // Protect and restrict role-specific routes
  if (isAuthenticated && userRole) {
    const userHomeRoute = roleRoutes[userRole as keyof typeof roleRoutes]

    // Super Admin routes
    if (pathname.startsWith("/super-admin")) {
      if (userRole !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL(userHomeRoute, req.url))
      }
      return NextResponse.next()
    }

    // Sub Admin routes
    if (pathname.startsWith("/sub-admin")) {
      if (userRole !== "SUB_ADMIN") {
        return NextResponse.redirect(new URL(userHomeRoute, req.url))
      }
      return NextResponse.next()
    }

    // Team Manager routes
    // Use exact match or /team/ to avoid catching /teams (public page)
    if (pathname === "/team" || pathname.startsWith("/team/")) {
      if (userRole !== "TEAM_MANAGER") {
        return NextResponse.redirect(new URL(userHomeRoute, req.url))
      }
      return NextResponse.next()
    }

    // Redirect authenticated users trying to access public pages to their respective dashboard
    return NextResponse.redirect(new URL(userHomeRoute, req.url))
  }

  // Protect team manager routes from unauthenticated access
  // Use exact match or /team/ to avoid catching /teams (public page)
  if ((pathname === "/team" || pathname.startsWith("/team/")) && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Protect admin routes from unauthenticated access
  if ((pathname.startsWith("/super-admin") || pathname.startsWith("/sub-admin")) && !isAuthenticated) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sql-wasm.wasm|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)",
  ]
}
