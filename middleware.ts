import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const userRole = req.auth?.user?.role

  // Root path redirect logic based on authentication
  if (nextUrl.pathname === "/") {
    if (isLoggedIn) {
      // Redirect authenticated users to their dashboard
      if (userRole === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/super-admin", nextUrl))
      } else if (userRole === "SUB_ADMIN") {
        return NextResponse.redirect(new URL("/sub-admin", nextUrl))
      } else if (userRole === "TEAM_MANAGER") {
        return NextResponse.redirect(new URL("/team", nextUrl))
      }
    }
    // Allow unauthenticated users to see the public landing page
    return NextResponse.next()
  }

  // Let auth config handle other route protections
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.wasm|sw.js|manifest.json|offline.html).*)"]
}
