// middleware.ts
// Protect admin routes with Supabase auth and producer settings with its portal cookie.
// Uses @supabase/ssr createServerClient so auth cookies are refreshed transparently.

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PRODUCER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24

async function hasValidProducerSession(request: NextRequest) {
  const token = request.cookies.get("producer_auth")?.value
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!token || !secret) return false

  const parts = token.split(".")
  if (parts.length !== 3) return false

  const [issuedAtRaw, nonce, signature] = parts
  const issuedAt = Number(issuedAtRaw)
  const age = Math.floor(Date.now() / 1000) - issuedAt
  if (!Number.isFinite(issuedAt) || age < 0 || age > PRODUCER_SESSION_MAX_AGE_SECONDS) return false

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    const normalizedSignature = signature.replaceAll("-", "+").replaceAll("_", "/")
    const suppliedSignature = Uint8Array.from(
      atob(normalizedSignature.padEnd(Math.ceil(normalizedSignature.length / 4) * 4, "=")),
      (char) => char.charCodeAt(0)
    )
    return crypto.subtle.verify(
      "HMAC",
      key,
      suppliedSignature,
      new TextEncoder().encode(`${issuedAtRaw}.${nonce}`)
    )
  } catch {
    return false
  }
}

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
    data: { user },
  } = await supabase.auth.getUser()

  const { nextUrl } = request

  // Reject /admin requests explicitly or redirect neutrally so it doesn't reveal dashboard existed
  if (nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/")) {
    return new NextResponse("Not Found", { status: 404 })
  }

  const isAdminRoute = nextUrl.pathname.startsWith("/prof-boss")
  const isLoginPage = nextUrl.pathname === "/prof-boss/login"
  const isProducerSettingsRoute = nextUrl.pathname.startsWith("/beatsbylouder/settings")
  const isAdminUser = user?.app_metadata?.role === "admin"

  if (isProducerSettingsRoute && !(await hasValidProducerSession(request))) {
    return NextResponse.redirect(new URL("/beatsbylouder", request.url))
  }

  // Unauthenticated user trying to access admin — send to login
  if (isAdminRoute && !isLoginPage && !isAdminUser) {
    return NextResponse.redirect(new URL("/prof-boss/login", request.url))
  }

  // Already authenticated — don't show the login page again
  if (isLoginPage && isAdminUser) {
    return NextResponse.redirect(new URL("/prof-boss", request.url))
  }

  // Return the supabaseResponse so that refreshed session cookies are forwarded
  return supabaseResponse
}

export const config = {
  matcher: ["/admin/:path*", "/prof-boss/:path*", "/beatsbylouder/settings/:path*"],
}
