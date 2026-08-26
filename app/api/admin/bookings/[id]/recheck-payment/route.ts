// app/api/admin/bookings/[id]/recheck-payment/route.ts
// POST — Manually re-checks transaction status with Hubtel and confirms booking if paid.
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { verifyHubtelTransaction } from "@/lib/hubtel"
import { sendBookingConfirmationNotifications } from "@/lib/whatsapp"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // 1. Fetch booking details
  const { data: booking, error: fetchError } = await (supabase as any)
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const reference = booking.booking_code

  if (!reference) {
    return NextResponse.json({ error: "No booking code (client reference) associated with this booking" }, { status: 400 })
  }

  // If already confirmed in DB, just return success
  if (booking.status === "CONFIRMED") {
    return NextResponse.json({
      ok: true,
      confirmed: true,
      message: "Booking is already confirmed in the database.",
      hubtelStatus: booking.hubtel_status || "SUCCESS"
    })
  }

  // 2. Query Hubtel API authoritatively
  let verification
  try {
    verification = await verifyHubtelTransaction(reference)
  } catch (err: any) {
    console.error(`[Manual Payment Re-check] Hubtel verification error for ${reference}:`, err)
    return NextResponse.json({
      ok: false,
      error: `Could not verify with Hubtel: ${err.message || err}`
    }, { status: 502 })
  }

  const hubtelStatus = verification.status
  const isSuccess = ["Success", "Completed", "successful"].includes(hubtelStatus)

  if (!isSuccess) {
    return NextResponse.json({
      ok: true,
      confirmed: false,
      hubtelStatus,
      message: `Hubtel reports transaction is not successful (Status: ${hubtelStatus})`
    })
  }

  // 3. Verify amount matches (with margin for decimal points)
  const expectedGHS = booking.amount_ghs / 100
  const amountMatches = Math.abs(verification.amount - expectedGHS) <= 0.09
  if (!amountMatches) {
    console.warn(`[Manual Payment Re-check] Amount mismatch for ${reference}: Hubtel=${verification.amount}, expected=${expectedGHS}`)
    return NextResponse.json({
      ok: false,
      error: `Amount mismatch: Hubtel charged GH₵${verification.amount}, expected GH₵${expectedGHS}`
    }, { status: 422 })
  }

  // 4. Update Database Booking Status to CONFIRMED
  const { error: updateError } = await (supabase as any)
    .from("bookings")
    .update({
      hubtel_status: "SUCCESS",
      status: "CONFIRMED",
      is_paid: true,
      status_payment: true,
      status_payment_at: new Date().toISOString(),
      status_received: true,
      status_received_at: booking.status_received_at || new Date().toISOString(),
    })
    .eq("id", booking.id)

  if (updateError) {
    console.error("[Manual Payment Re-check] Failed to update booking:", updateError)
    return NextResponse.json({ error: "Failed to update booking status in database" }, { status: 500 })
  }

  // 5. Insert webhook event (idempotency check / audit trail)
  const eventId = `hubtel-success-${reference}`
  const { data: existingEvent } = await (supabase as any)
    .from("webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle()

  if (!existingEvent) {
    await (supabase as any)
      .from("webhook_events")
      .insert({
        source: "hubtel-manual",
        event_id: eventId,
        event_type: "transaction.success",
        payload: { verification, note: "Manually re-checked by administrator" },
      })
  }

  // 6. Insert sync_event for Realtime updates
  await (supabase as any)
    .from("sync_events")
    .insert({
      event_type: "payment.confirmed",
      booking_id: booking.id,
      booking_code: booking.booking_code,
      payload: { status: "CONFIRMED", reference },
      delivered: false,
      delivery_attempts: 0,
    })

  // 7. Send WhatsApp notifications (if not notified already)
  if (!booking.customer_notified || !booking.owner_notified) {
    const dateStr = formatDisplayDate(new Date(booking.session_date).toISOString().slice(0, 10))
    const startTimeStr = formatDisplayTime(booking.start_time)
    const endTimeStr = formatDisplayTime(booking.end_time)

    try {
      const { customerSent, ownerSent } = await sendBookingConfirmationNotifications({
        bookingId: booking.id,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        customerEmail: booking.customer_email,
        sessionDate: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        durationHours: Number(booking.duration_hours),
        studio: booking.studio,
        equipment: booking.equipment ?? [],
        amountGHS: expectedGHS,
        paystackReference: reference,
        notes: booking.notes ?? undefined,
      })

      await (supabase as any)
        .from("bookings")
        .update({
          customer_notified: customerSent,
          owner_notified: ownerSent,
        })
        .eq("id", booking.id)
    } catch (err) {
      console.error("[Manual Payment Re-check] WhatsApp notifications dispatch error:", err)
    }
  }

  return NextResponse.json({
    ok: true,
    confirmed: true,
    hubtelStatus,
    message: "Booking successfully verified and confirmed!"
  })
}
