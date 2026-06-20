// middleware.ts
// Protect all /admin routes — redirect to /admin/login if not authenticated

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isLoginPage = nextUrl.pathname === "/admin/login"

  if (isAdminRoute && !isLoginPage && !session) {
    return NextResponse.redirect(new URL("/admin/login", req.url))
  }

  // Already logged in, redirect away from login page
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/admin", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*"],
}
