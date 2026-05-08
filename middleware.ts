import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth
  const userRole = req.auth?.user?.role

  // Redirect authenticated users from home page to their dashboard
  if (pathname === "/" && isAuthenticated) {
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/super-admin", req.url))
    } else if (userRole === "SUB_ADMIN") {
      return NextResponse.redirect(new URL("/sub-admin", req.url))
    }
  }

  // Redirect authenticated users from sign-in page to their dashboard
  if (pathname === "/auth/signin" && isAuthenticated) {
    if (userRole === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/super-admin", req.url))
    } else if (userRole === "SUB_ADMIN") {
      return NextResponse.redirect(new URL("/sub-admin", req.url))
    }
  }

  // Protect all admin routes
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/sub-admin")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/signin", req.url)
      signInUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signInUrl)
    }
  }

  // Super admin routes - only accessible to SUPER_ADMIN role
  if (pathname.startsWith("/super-admin")) {
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Sub admin routes - only accessible to SUB_ADMIN role
  if (pathname.startsWith("/sub-admin")) {
    if (userRole !== "SUB_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Restrict Super Admin from accessing public pages (teams, players, home)
  if (userRole === "SUPER_ADMIN") {
    // Allow only super-admin routes and auth routes
    if (!pathname.startsWith("/super-admin") && 
        !pathname.startsWith("/auth") && 
        !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/super-admin", req.url))
    }
  }

  // Restrict Sub Admin from accessing public pages (teams, players, home)
  if (userRole === "SUB_ADMIN") {
    // Allow only sub-admin routes and auth routes
    if (!pathname.startsWith("/sub-admin") && 
        !pathname.startsWith("/auth") && 
        !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/sub-admin", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ]
}
