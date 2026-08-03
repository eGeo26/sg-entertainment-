// app/api/producer/change-password/route.ts
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyProducerSession } from "@/lib/producer-auth"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  if (!verifyProducerSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json()

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 })
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Fetch existing producer_auth hash
    const { data: authRecord, error: fetchErr } = await (supabase as any)
      .from("producer_auth")
      .select("id, password_hash")
      .limit(1)
      .maybeSingle()

    if (fetchErr || !authRecord) {
      console.error("[Producer Change Password Error]: Failed to fetch auth record", fetchErr)
      return NextResponse.json({ error: "Authentication system error" }, { status: 500 })
    }

    // Verify current password against stored hash
    const isValid = await bcrypt.compare(currentPassword, authRecord.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10)

    // Update row
    const { error: updateErr } = await (supabase as any)
      .from("producer_auth")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authRecord.id)

    if (updateErr) {
      console.error("[Producer Change Password Update Error]:", updateErr)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (err) {
    console.error("[Producer Change Password Route Error]:", err)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
