// app/api/bookings/[id]/history/route.ts
// GET /api/bookings/:id/history — fetch booking status history with customer messages

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()

    // First, find the booking by either id or booking_code
    const { data: booking, error: bookingError } = await (supabase as any)
      .from("bookings")
      .select("id")
      .or(`id.eq.${params.id},booking_code.eq.${params.id}`)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Then fetch history using the actual booking id
    const { data: history, error } = await (supabase as any)
      .from("booking_status_history")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json(history ?? [])
  } catch (err) {
    console.error("[Booking History] Error:", err)
    return NextResponse.json({ error: "Failed to fetch booking history" }, { status: 500 })
  }
}
