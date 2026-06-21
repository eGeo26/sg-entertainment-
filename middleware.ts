// middleware.ts
// Protect all /admin routes — redirect to /admin/login if no valid Supabase session.
// Uses @supabase/ssr createServerClient so auth cookies are refreshed transparently.

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Propagate any refreshed tokens to both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add any logic between createServerClient and getSession.
  // A simple mistake here can cause hard-to-debug auth issues.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { nextUrl } = request
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isLoginPage = nextUrl.pathname === "/admin/login"

  // Unauthenticated user trying to access admin — send to login
  if (isAdminRoute && !isLoginPage && !session) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  // Already authenticated — don't show the login page again
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  // Return the supabaseResponse so that refreshed session cookies are forwarded
  return supabaseResponse
}

export const config = {
  matcher: ["/admin/:path*"],
}
