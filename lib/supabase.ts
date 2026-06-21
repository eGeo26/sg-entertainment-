// lib/supabase.ts
// Supabase client singletons — S&G Entertainment Studio Booking System
//
// SECURITY RULES:
//   - createServiceClient()   → uses SUPABASE_SERVICE_ROLE_KEY. NEVER import in client components.
//   - createSessionClient()   → uses NEXT_PUBLIC_SUPABASE_ANON_KEY + user's JWT cookie. Server-side only.
//   - getAdminSession()       → call at the top of every admin API route handler.
//   - createBrowserClient()   → uses NEXT_PUBLIC_SUPABASE_ANON_KEY. Client components only.

import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { Database } from "@/types/supabase"

// ── Service role client ───────────────────────────────────────────────────────
// Bypasses Row Level Security. Use ONLY in server-side admin API routes.
// Never import this in any file with "use client".
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "Add them to .env.local — see .env.example for the required variable names."
    )
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

// ── Session-aware server client ───────────────────────────────────────────────
// Reads the user's JWT from the incoming request cookies.
// Use in API route handlers and Server Components to check auth.
export async function createSessionClient() {
  // Dynamic import keeps `next/headers` out of the browser bundle
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — cookies are read-only there, that's fine.
        }
      },
    },
  })
}

// ── getAdminSession ───────────────────────────────────────────────────────────
// Drop-in replacement for `auth()` from NextAuth.
// Call at the top of every admin API route to verify the session.
//
// Usage:
//   const session = await getAdminSession()
//   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
//
export async function getAdminSession() {
  try {
    const supabase = await createSessionClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("[Supabase Auth] getSession error:", error.message)
      return null
    }

    return session
  } catch (err) {
    console.error("[Supabase Auth] Could not get session:", err)
    return null
  }
}

// ── Browser client factory ────────────────────────────────────────────────────
// Use in "use client" components for sign-in, sign-out, etc.
// Returns a fresh client — do not call at module level; call inside component/effect.
export function createBrowserSupabaseClient() {
  const { createBrowserClient } = require("@supabase/ssr") as typeof import("@supabase/ssr")

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
