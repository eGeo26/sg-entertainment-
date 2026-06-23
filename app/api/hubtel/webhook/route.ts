// app/api/hubtel/webhook/route.ts
// POST /api/hubtel/webhook
// Handles secure status updates from the Hubtel gateway.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyHubtelTransaction } from "@/lib/hubtel"
import { sendBookingConfirmationNotifications } from "@/lib/whatsapp"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let bodyText = ""
  try {
    bodyText = await req.text()
  } catch (err) {
    return NextResponse.json({ error: "Empty request body" }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Support both lowercase and uppercase formats for Hubtel webhooks
  const reference = payload.clientReference ?? payload.ClientReference ?? payload.Reference ?? ""
  const status = payload.status ?? payload.Status ?? ""

  if (!reference) {
    console.warn("[Hubtel Webhook] Missing clientReference in payload")
    return NextResponse.json({ error: "Missing clientReference" }, { status: 400 })
  }

  console.log(`[Hubtel Webhook] Received status notification for ref: ${reference} | status: ${status}`)

  const supabase = createServiceClient()

  // 1. Idempotency Check
  const eventId = `hubtel-success-${reference}`
  const { data: existingEvent } = await (supabase as any)
    .from("webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle()

  if (existingEvent) {
    console.log(`[Hubtel Webhook] Event already processed: ${eventId}`)
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // 2. Fetch the corresponding booking from DB
  const { data: booking, error: bookingError } = await (supabase as any)
    .from("bookings")
    .select("*")
    .eq("paystack_reference", reference)
    .maybeSingle()

  if (bookingError || !booking) {
    console.error(`[Hubtel Webhook] Booking not found for reference: ${reference}`)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // If already confirmed, mark event as duplicate/processed and exit
  if (booking.status === "CONFIRMED") {
    return NextResponse.json({ ok: true, message: "Booking already confirmed" })
  }

  // 3. Check simulation mode — bypass Hubtel API call if in sim mode
  let verified: { status: string; amount: number; transactionId?: string }

  // Read simulation mode setting from DB
  let isSimulationMode = false
  try {
    const { data: simSetting } = await (supabase as any)
      .from("settings")
      .select("value")
      .eq("key", "payment_simulation_mode")
      .single()
    if (simSetting) {
      isSimulationMode = simSetting.value === "true"
    }
  } catch {
    // If table read fails, assume production mode
  }

  if (isSimulationMode || !process.env.HUBTEL_CLIENT_ID || process.env.HUBTEL_CLIENT_ID === "your_hubtel_client_id_here") {
    // Simulation: trust the payload status directly
    const payloadStatus = payload.status ?? payload.Status ?? "Success"
    verified = {
      status: payloadStatus,
      amount: payload.amount ?? payload.Amount ?? (booking.amount_ghs / 100),
      transactionId: payload.transactionId ?? payload.TransactionId ?? `sim-${Date.now()}`,
    }
    console.log(`[Hubtel Webhook] Simulation mode: trusting payload status "${verified.status}" for ${reference}`)
  } else {
    // Production: query Hubtel API to confirm status
    try {
      verified = await verifyHubtelTransaction(reference)
    } catch (err: any) {
      console.error(`[Hubtel Webhook] Secure verification failed for ${reference}:`, err)
      return NextResponse.json({ error: "Verification failed" }, { status: 500 })
    }
  }

  const isSuccess =
    verified.status === "Success" ||
    verified.status === "Completed" ||
    verified.status === "success" ||
    verified.status === "completed"

  if (!isSuccess) {
    console.warn(`[Hubtel Webhook] Reference ${reference} is not paid (Hubtel status: ${verified.status})`)
    return NextResponse.json({ ok: true, status: verified.status })
  }

  // 4. Amount Verification (prevent underpayment attacks)
  const expectedGHS = booking.amount_ghs / 100
  const tolerance = 0.01
  if (Math.abs(verified.amount - expectedGHS) > tolerance) {
    console.error(`[Hubtel Webhook] Amount mismatch for ${reference}. Expected: GHS ${expectedGHS}, Got: GHS ${verified.amount}`)
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
  }

  // 5. Update Database Booking Status to CONFIRMED and set payment status columns
  const { error: updateError } = await (supabase as any)
    .from("bookings")
    .update({
      paystack_status: "SUCCESS",
      status: "CONFIRMED",
      is_paid: true,
      status_payment: true,
      status_payment_at: new Date().toISOString(),
    })
    .eq("id", booking.id)

  if (updateError) {
    console.error("[Hubtel Webhook] Failed to update booking status:", updateError)
    return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
  }

  // 6. Record the webhook event for idempotency
  const { error: insertEventError } = await (supabase as any)
    .from("webhook_events")
    .insert({
      source: "hubtel",
      event_id: eventId,
      event_type: "transaction.success",
      payload: payload,
    })

  if (insertEventError) {
    console.error("[Hubtel Webhook] Failed to insert webhook event:", insertEventError)
  }

  // 7. Trigger WhatsApp notifications
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
    console.error("[Hubtel Webhook] WhatsApp notifications dispatch error:", err)
  }

  console.log(`[Hubtel Webhook] Booking ${booking.id} verified and confirmed successfully`)
  return NextResponse.json({ ok: true })
}
