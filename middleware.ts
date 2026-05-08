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

  // Protect admin routes
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/sub-admin")) {
    if (!isAuthenticated) {
      const signInUrl = new URL("/auth/signin", req.url)
      signInUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Check role-based access
    if (pathname.startsWith("/super-admin") && userRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (pathname.startsWith("/sub-admin") && userRole !== "SUB_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  // Restrict admins from accessing public pages
  if (isAuthenticated) {
    const isPublicPage = !pathname.startsWith("/super-admin") && 
                         !pathname.startsWith("/sub-admin") && 
                         !pathname.startsWith("/auth") && 
                         !pathname.startsWith("/api") &&
                         pathname !== "/"

    if (isPublicPage) {
      if (userRole === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/super-admin", req.url))
      } else if (userRole === "SUB_ADMIN") {
        return NextResponse.redirect(new URL("/sub-admin", req.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sql-wasm.wasm|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm)$).*)",
  ]
}
