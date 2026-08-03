// app/api/admin/producer-reset/route.ts
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Generate secure random plaintext password (12 chars alphanumeric + symbols)
    const rawBytes = crypto.randomBytes(8).toString("hex")
    const newPlaintextPassword = `SG-Prod-${rawBytes.slice(0, 8)}!`

    const newHash = await bcrypt.hash(newPlaintextPassword, 10)
    const supabase = createServiceClient()

    // Check if producer_auth record exists
    const { data: authRecord } = await (supabase as any)
      .from("producer_auth")
      .select("id")
      .limit(1)
      .maybeSingle()

    if (authRecord) {
      const { error: updateErr } = await (supabase as any)
        .from("producer_auth")
        .update({
          password_hash: newHash,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authRecord.id)

      if (updateErr) throw updateErr
    } else {
      const { error: insertErr } = await (supabase as any)
        .from("producer_auth")
        .insert({
          id: "00000000-0000-0000-0000-000000000001",
          password_hash: newHash,
          updated_at: new Date().toISOString(),
        })

      if (insertErr) throw insertErr
    }

    return NextResponse.json({
      success: true,
      newPassword: newPlaintextPassword,
    })
  } catch (err) {
    console.error("[Admin Reset Producer Password API Error]:", err)
    return NextResponse.json({ error: "Failed to reset producer password" }, { status: 500 })
  }
}
