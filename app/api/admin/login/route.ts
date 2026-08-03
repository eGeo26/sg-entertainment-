export const dynamic = "force-dynamic"

import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(1_000),
})

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "admin-login")
  if (rateLimited) return rateLimited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error || data.user?.app_metadata?.role !== "admin") {
    if (data.session) await supabase.auth.signOut()
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  }

  return response
}
