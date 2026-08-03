// app/api/producer/login/route.ts
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import { createProducerSessionToken } from "@/lib/producer-auth"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "producer-login")
  if (rateLimited) return rateLimited

  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: authRecord, error } = await (supabase as any)
      .from("producer_auth")
      .select("password_hash")
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[Producer Login API DB Error]:", error)
      return NextResponse.json({ error: "Database error during authentication" }, { status: 500 })
    }

    if (!authRecord || !authRecord.password_hash) {
      console.error("[Producer Login API Error]: No producer password hash configured in producer_auth table.")
      return NextResponse.json({ error: "Server authentication misconfiguration." }, { status: 500 })
    }

    const isValid = await bcrypt.compare(password, authRecord.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid producer password" }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set("producer_auth", createProducerSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return res
  } catch (err) {
    console.error("[Producer Login API Error]:", err)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete("producer_auth")
  return res
}
