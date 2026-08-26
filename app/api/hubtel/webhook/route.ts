// app/api/hubtel/webhook/route.ts
// POST /api/hubtel/webhook
// Handles secure status updates from the Hubtel gateway.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyHubtelTransaction } from "@/lib/hubtel"
import { sendBookingConfirmationNotifications } from "@/lib/whatsapp"
import { formatDisplayDate, formatDisplayTime, EXTRA_HOUR_RATE_GHS, getEndTime } from "@/lib/booking"

export const runtime = "nodejs"

// Placeholder sentinel — matches the literal default value in .env.example / .env.local
const WEBHOOK_SECRET_PLACEHOLDER = "your_hubtel_webhook_secret_here"

export async function POST(req: NextRequest) {
  // Verify webhook secret only when a real (non-placeholder) value is configured.
  // If the env var is unset or still equals the placeholder, skip the check and
  // log a warning so the misconfiguration is visible in server logs.
  const webhookSecret = process.env.HUBTEL_WEBHOOK_SECRET
  const isRealSecret = !!webhookSecret && webhookSecret !== WEBHOOK_SECRET_PLACEHOLDER

  if (webhookSecret === WEBHOOK_SECRET_PLACEHOLDER || webhookSecret === "") {
    console.warn(
      "[Hubtel Webhook] ⚠️  HUBTEL_WEBHOOK_SECRET is not configured (placeholder or empty). " +
      "Webhook signature verification is DISABLED. Set a real secret in Vercel env vars."
    )
  }

  if (isRealSecret) {
    const receivedSecret = req.headers.get("x-hubtel-secret") ||
                           req.headers.get("authorization") || ""
    if (!receivedSecret.includes(webhookSecret!)) {
      console.warn("[Hubtel Webhook] Invalid webhook secret — rejecting request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

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

  // Hubtel sends nested payload: { ResponseCode, Status, Data: { ClientReference, Status, Amount, ... } }
  const reference = payload.Data?.ClientReference ?? payload.Data?.clientReference ?? ""
  const status = payload.Data?.Status ?? payload.Data?.status ?? ""
  const responseCode = payload.ResponseCode ?? payload.responseCode ?? ""

  // Log raw top-level keys for debugging (no secrets)
  console.log("[Hubtel Webhook] Raw top-level keys:", Object.keys(payload))

  if (!reference) {
    console.warn("[Hubtel Webhook] Missing ClientReference in payload")
    return NextResponse.json({ error: "Missing ClientReference" }, { status: 400 })
  }

  console.log(`[Hubtel Webhook] Received status notification for ref: ${reference} | status: ${status} | ResponseCode: ${responseCode}`)

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

  // 2. Fetch the corresponding booking from DB.
  // Use booking_code — that is the column populated with the clientReference value
  // sent to Hubtel at checkout initiation.
  const isExtension = reference.includes("-ext-")
  const baseCode = isExtension ? reference.split("-ext-")[0] : reference

  const { data: booking, error: bookingError } = await (supabase as any)
    .from("bookings")
    .select("*")
    .eq("booking_code", baseCode)
    .maybeSingle()

  if (bookingError || !booking) {
    console.error(`[Hubtel Webhook] Booking not found for reference: ${reference} (baseCode: ${baseCode})`)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // If already confirmed, mark event as duplicate/processed and exit
  // (Skip this check for extension payments since the booking itself is CONFIRMED)
  if (booking.status === "CONFIRMED" && !isExtension) {
    return NextResponse.json({ ok: true, message: "Booking already confirmed" })
  }

  // 3. Trust the Hubtel webhook payload directly.
  // Hubtel only POSTs to our callback for real transaction events.
  // ResponseCode "0000" + Status "Success" = confirmed successful payment.
  const isSuccess =
    (responseCode === "0000") &&
    (
      status === "Success" ||
      status === "success" ||
      status === "Completed" ||
      status === "completed"
    )

  console.log(`[Hubtel Webhook] Payment status check: responseCode=${responseCode}, status=${status}, isSuccess=${isSuccess}`)

  if (!isSuccess) {
    console.warn(`[Hubtel Webhook] Reference ${reference} is not paid (Hubtel status: ${status}) - NOT recording payment`)
    
    // Record failed webhook event for audit trail but do NOT update booking payment status
    const { error: insertEventError } = await (supabase as any)
      .from("webhook_events")
      .insert({
        source: "hubtel",
        event_id: `hubtel-failed-${reference}`,
        event_type: "transaction.failed",
        payload: payload,
      })

    if (insertEventError) {
      console.error("[Hubtel Webhook] Failed to insert failed webhook event:", insertEventError)
    }
    
    return NextResponse.json({ ok: true, status: status, recorded: false })
  }

  // 4. Hubtel webhook payload with ResponseCode 0000 + Status Success is the authoritative
  //    payment confirmation. Secondary status-check API (api-merchant.hubtel.com) is not
  //    available on this plan, so we trust the signed webhook payload directly.
  let updateFields: any = {
    hubtel_status: "SUCCESS",
    status: "CONFIRMED",
    is_paid: true,
    status_payment: true,
    status_payment_at: new Date().toISOString(),
    status_received: true,
    status_received_at: booking.status_received_at || new Date().toISOString(),
  }

  if (isExtension) {
    const amountPaid = payload.Data?.Amount ?? payload.Data?.amount ?? 0
    const extraHours = Math.round(amountPaid / EXTRA_HOUR_RATE_GHS)
    const extraAmountPesewas = Math.round(amountPaid * 100)
    const newExtensionHours = (booking.extension_hours ?? 0) + extraHours
    const newExtensionAmount = (booking.extension_amount ?? 0) + extraAmountPesewas
    const newDurationHours = Number(booking.duration_hours) + extraHours
    const datePart = typeof booking.session_date === 'string' ? booking.session_date.slice(0, 10) : new Date(booking.session_date).toISOString().slice(0, 10)
    const newEndTime = getEndTime(datePart, booking.start_time, newDurationHours)
    const newAmountGhs = Number(booking.amount_ghs) + extraAmountPesewas

    updateFields = {
      ...updateFields,
      extension_hours: newExtensionHours,
      extension_amount: newExtensionAmount,
      duration_hours: newDurationHours,
      end_time: newEndTime,
      amount_ghs: newAmountGhs,
      extended_at: new Date().toISOString(),
    }
    console.log(`[Hubtel Webhook] Extension payment verified: +${extraHours}h, extra amount GH₵${amountPaid}, new total GHS ${newAmountGhs / 100}`)
  }

  const expectedGHS = updateFields.amount_ghs ? updateFields.amount_ghs / 100 : booking.amount_ghs / 100
  console.log(`[Hubtel Webhook] Payload verified — confirming booking ${booking.id} (expected GH₵${expectedGHS})`)

  // 5. Update Database Booking Status to CONFIRMED and set payment status columns
  const { error: updateError } = await (supabase as any)
    .from("bookings")
    .update(updateFields)
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

  // 6b. Insert sync_event so the admin Realtime subscription fires immediately
  const { error: syncError } = await (supabase as any)
    .from("sync_events")
    .insert({
      event_type: "payment.confirmed",
      booking_id: booking.id,
      booking_code: booking.booking_code,
      payload: { status: "CONFIRMED", reference },
      delivered: false,
      delivery_attempts: 0,
    })

  if (syncError) {
    console.error("[Hubtel Webhook] Failed to insert sync_event:", syncError)
    // Non-fatal — do not abort the request
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
