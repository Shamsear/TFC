import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const userRole = req.auth?.user?.role

  // Allow API, static files, and auth routes
  if (pathname.startsWith("/api") || 
      pathname.startsWith("/_next") || 
      pathname.startsWith("/auth")) {
    return NextResponse.next()
  }

  // Redirect authenticated users from home page to their dashboard
  if (pathname === "/" && isAuthenticated) {
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/super-admin", req.url))
    } else if (userRole === "SUB_ADMIN") {
      return NextResponse.redirect(new URL("/sub-admin", req.url))
    } else if (userRole === "TEAM_MANAGER") {
      return NextResponse.redirect(new URL("/team", req.url))
    }
  }

  // Define role-based home routes
  const roleRoutes = {
    SUPER_ADMIN: "/super-admin",
    SUB_ADMIN: "/sub-admin",
    TEAM_MANAGER: "/team"
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
    if (pathname.startsWith("/team")) {
      if (userRole !== "TEAM_MANAGER") {
        return NextResponse.redirect(new URL(userHomeRoute, req.url))
      }
      return NextResponse.next()
    }

    // Allow authenticated users to access public pages
    // Only redirect if they're trying to access another role's protected route
    return NextResponse.next()
  }

  // Protect team routes from unauthenticated access
  if (pathname.startsWith("/team") && !isAuthenticated) {
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
