// app/api/admin/bookings/[id]/confirm/route.ts
// POST — mark booking as session confirmed (adds entry to booking_status_history)

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient()

  try {
    // Check if booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("id", params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Check if already session confirmed
    const { data: existingConfirmation } = await (supabase as any)
      .from("booking_status_history")
      .select("*")
      .eq("booking_id", params.id)
      .eq("status", "session_confirmed")
      .single()

    if (existingConfirmation) {
      return NextResponse.json({ error: "Booking already session confirmed" }, { status: 400 })
    }

    // Insert session confirmed status into booking_status_history
    const { data: historyEntry, error: historyError } = await (supabase as any)
      .from("booking_status_history")
      .insert({
        booking_id: params.id,
        status: "session_confirmed",
        label: "Session confirmed by studio.",
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (historyError) throw historyError

    return NextResponse.json({ success: true, historyEntry })
  } catch (err) {
    console.error("[Admin Booking Confirm] Error:", err)
    return NextResponse.json({ error: "Failed to mark booking as session confirmed" }, { status: 500 })
  }
}
