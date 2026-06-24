// app/api/admin/payments/refund/route.ts
// POST /api/admin/payments/refund — mark a booking as refunded
// NOTE: Hubtel does not expose a programmatic refund API endpoint.
// Refunds must be initiated manually through the Hubtel merchant dashboard.
// This route updates the booking status in the database to REFUNDED so the
// admin panel reflects the change immediately after processing in Hubtel.
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId, reason } = await req.json()

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: booking, error: selectError } = await (supabase as any)
    .from("bookings")
    .select("*")
    .or(`id.eq.${bookingId},booking_code.eq.${bookingId}`)
    .maybeSingle()

  if (selectError || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  if (booking.hubtel_status !== "SUCCESS") {
    return NextResponse.json(
      { error: "Booking has no successful payment to refund" },
      { status: 400 }
    )
  }

  if (!booking.hubtel_reference) {
    return NextResponse.json(
      { error: "No Hubtel client reference on this booking" },
      { status: 400 }
    )
  }

  try {
    // Mark the booking as refunded in the database.
    // The actual refund must be processed via the Hubtel merchant dashboard
    // using clientReference: booking.hubtel_reference
    const { data: updated, error: updateError } = await (supabase as any)
      .from("bookings")
      .update({
        hubtel_status: "REVERSED",
        status: "REFUNDED",
      })
      .eq("id", booking.id)
      .select()
      .single()

    if (updateError || !updated) throw updateError ?? new Error("Failed to update status")

    // Map DB row to camelCase response format
    const formattedBooking = {
      id: updated.id,
      customerName: updated.customer_name,
      customerEmail: updated.customer_email,
      customerPhone: updated.customer_phone,
      sessionDate: updated.session_date,
      startTime: updated.start_time,
      endTime: updated.end_time,
      durationHours: Number(updated.duration_hours),
      studio: updated.studio,
      equipment: updated.equipment ?? [],
      notes: updated.notes,
      amountGHS: updated.amount_ghs / 100,
      status: updated.status,
      hubtelReference: updated.hubtel_reference,
      hubtelStatus: updated.hubtel_status,
      isPaid: updated.is_paid,
      createdAt: updated.created_at,
    }

    return NextResponse.json({
      success: true,
      booking: formattedBooking,
      message: `Booking marked as refunded. Please complete the refund in the Hubtel dashboard using reference: ${booking.hubtel_reference}`,
    })
  } catch (err) {
    console.error("[Admin Refund] Error:", err)
    return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
  }
}
