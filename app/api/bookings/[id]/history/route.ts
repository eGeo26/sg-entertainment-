// app/api/bookings/[id]/history/route.ts
// GET /api/bookings/:id/history — fetch booking status history with customer messages

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { findGuestBooking, getGuestContact } from "@/lib/guest-booking"
import { enforceRateLimit } from "@/lib/rate-limit"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()
    const rateLimited = enforceRateLimit(req, "guest-booking-history", 40)
    if (rateLimited) return rateLimited

    const booking = await findGuestBooking(
      supabase as any,
      params.id,
      "id, customer_email, customer_phone",
      getGuestContact(req.nextUrl.searchParams)
    )

    if (!booking) {
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
