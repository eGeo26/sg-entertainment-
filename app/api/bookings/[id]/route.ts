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
    const { data: bookingByCode, error: codeError } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        booking_code,
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
        hubtel_reference,
        is_paid,
        created_at,
        updated_at,
        status_received,
        status_received_at,
        status_payment,
        status_payment_at,
        status_reviewed,
        status_reviewed_at,
        status_confirmed,
        status_confirmed_at
      `)
      .eq("booking_code", params.id)
      .maybeSingle()

    // Fallback: if not found by booking_code, try internal UUID id
    let booking = bookingByCode
    let error = codeError
    if (!bookingByCode && (!codeError || codeError.code === "PGRST116")) {
      const { data: bookingById, error: idError } = await (supabase as any)
        .from("bookings")
        .select(`
          id,
          booking_code,
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
          hubtel_reference,
          is_paid,
          created_at,
          updated_at,
          status_received,
          status_received_at,
          status_payment,
          status_payment_at,
          status_reviewed,
          status_reviewed_at,
          status_confirmed,
          status_confirmed_at
        `)
        .eq("id", params.id)
        .maybeSingle()
      booking = bookingById
      error = idError
    }

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Fetch latest admin-written message from booking_status_history.
    // We filter is_admin_message = true to skip auto-generated trigger labels
    // (e.g. "Booking received — awaiting payment") that the DB trigger inserts.
    // A booking with no admin message written will return null here → no message box shown.
    let latestMessage = null
    try {
      const { data: historyData } = await (supabase as any)
        .from("booking_status_history")
        .select("label, created_at")
        .eq("booking_id", booking.id)
        .eq("is_admin_message", true)       // ← only rows the admin explicitly wrote
        .not("label", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (historyData && historyData.label) {
        latestMessage = {
          text: historyData.label,
          timestamp: historyData.created_at
        }
      }
    } catch (historyError) {
      console.error("[Booking Lookup] Failed to fetch status history:", historyError)
      // Don't fail the request if history fetch fails
    }

    const dateStr = new Date(booking.session_date).toISOString().slice(0, 10)

    // Map database columns to camelCase expected by the front end
    const formattedBooking = {
      id: booking.id,
      bookingCode: booking.booking_code,
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
      hubtelReference: booking.hubtel_reference,
      isPaid: booking.is_paid,
      isPacked: booking.status_reviewed ?? false,
      isDelivered: booking.status_confirmed ?? false,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      statusReceived: booking.status_received,
      statusReceivedAt: booking.status_received_at,
      statusPayment: booking.status_payment,
      statusPaymentAt: booking.status_payment_at,
      statusReviewed: booking.status_reviewed,
      statusReviewedAt: booking.status_reviewed_at,
      statusConfirmed: booking.status_confirmed,
      statusConfirmedAt: booking.status_confirmed_at,
      displayDate: formatDisplayDate(dateStr),
      displayStartTime: formatDisplayTime(booking.start_time),
      displayEndTime: formatDisplayTime(booking.end_time),
      latestMessage: latestMessage,
    }

    return NextResponse.json(formattedBooking)
  } catch (err) {
    console.error("[Booking Lookup] Error:", err)
    return NextResponse.json({ error: "Failed to fetch booking details" }, { status: 500 })
  }
}
