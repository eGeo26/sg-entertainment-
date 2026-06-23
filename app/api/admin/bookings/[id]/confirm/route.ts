// app/api/admin/bookings/[id]/confirm/route.ts
// POST — mark booking as session confirmed (writes current status columns + history)
export const dynamic = "force-dynamic"

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
    const { data: booking, error: bookingError } = await (supabase as any)
      .from("bookings")
      .select("id, status_payment, status_reviewed, status_confirmed")
      .eq("id", params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.status_confirmed) {
      return NextResponse.json({ error: "Booking already session confirmed" }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updateData: any = {
      status: "CONFIRMED",
      status_confirmed: true,
      status_confirmed_at: now,
    }

    if (!booking.status_payment) {
      updateData.status_payment = true
      updateData.status_payment_at = now
    }

    if (!booking.status_reviewed) {
      updateData.status_reviewed = true
      updateData.status_reviewed_at = now
    }

    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from("bookings")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) throw updateError

    const { data: historyEntry, error: historyError } = await (supabase as any)
      .from("booking_status_history")
      .insert({
        booking_id: params.id,
        status: "session_confirmed",
        label: "Session confirmed by studio.",
        created_at: now
      })
      .select()
      .single()

    if (historyError) throw historyError

    return NextResponse.json({ success: true, booking: updatedBooking, historyEntry })
  } catch (err) {
    console.error("[Admin Booking Confirm] Error:", err)
    return NextResponse.json({ error: "Failed to mark booking as session confirmed" }, { status: 500 })
  }
}
