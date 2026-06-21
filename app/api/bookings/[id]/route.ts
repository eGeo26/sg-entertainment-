// app/api/bookings/[id]/route.ts
// GET /api/bookings/:id — fetch booking details (used on success page)

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient()
    const { data: booking, error } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        session_date,
        start_time,
        end_time,
        duration_hours,
        studio,
        equipment,
        notes,
        amount_ghs,
        status,
        paystack_reference,
        is_paid,
        is_packed,
        is_delivered,
        created_at
      `)
      .eq("id", params.id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const dateStr = new Date(booking.session_date).toISOString().slice(0, 10)

    // Map database columns to camelCase expected by the front end
    const formattedBooking = {
      id: booking.id,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      sessionDate: booking.session_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      durationHours: booking.duration_hours,
      studio: booking.studio,
      equipment: booking.equipment,
      notes: booking.notes,
      amountGHS: pesewasToGhs(booking.amount_ghs),
      status: booking.status,
      paystackReference: booking.paystack_reference,
      isPaid: booking.is_paid,
      isPacked: booking.is_packed,
      isDelivered: booking.is_delivered,
      createdAt: booking.created_at,
      displayDate: formatDisplayDate(dateStr),
      displayStartTime: formatDisplayTime(booking.start_time),
      displayEndTime: formatDisplayTime(booking.end_time),
    }

    return NextResponse.json(formattedBooking)
  } catch (err) {
    console.error("[Booking Lookup] Error:", err)
    return NextResponse.json({ error: "Failed to fetch booking details" }, { status: 500 })
  }
}
