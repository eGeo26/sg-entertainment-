// app/api/paystack/webhook/route.ts
// POST /api/paystack/webhook
// Handles Paystack webhook events — the heart of the payment confirmation flow.
// On charge.success → verify → confirm Anolla booking → send WhatsApp notifications

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyWebhookSignature, verifyTransaction, pesewasToGhs } from "@/lib/paystack"
import { confirmBooking, cancelBooking } from "@/lib/anolla"
import { sendBookingConfirmationNotifications } from "@/lib/whatsapp"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

export const runtime = "nodejs"

// Disable body parser — we need the raw body to verify the webhook signature
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-paystack-signature") ?? ""

  // 1. Verify webhook signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[Webhook] Invalid Paystack signature — rejecting")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: { event: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event: eventType, data } = event
  const reference = (data.reference as string) ?? ""

  console.log(`[Webhook] Event: ${eventType} | Ref: ${reference}`)

  // 2. Idempotency — check if this exact event was already processed
  const eventId = `paystack-${eventType}-${reference}`
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } })
  if (existing) {
    console.log(`[Webhook] Duplicate event ${eventId} — ignoring`)
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // 3. Store event for idempotency tracking
  await prisma.webhookEvent.create({
    data: { source: "paystack", eventId, eventType, payload: event as object },
  })

  // 4. Handle event types
  switch (eventType) {
    case "charge.success":
      await handleChargeSuccess(reference, data)
      break

    case "charge.failed":
      await handleChargeFailed(reference)
      break

    case "refund.processed":
      await handleRefund(reference)
      break

    default:
      console.log(`[Webhook] Unhandled event type: ${eventType}`)
  }

  return NextResponse.json({ ok: true })
}

// ── charge.success ────────────────────────────────────────────────────────────

async function handleChargeSuccess(
  reference: string,
  _webhookData: Record<string, unknown>
) {
  // Always re-verify on our backend — never trust webhook data alone
  let verified
  try {
    verified = await verifyTransaction(reference)
  } catch (err) {
    console.error("[Webhook] Paystack verification failed:", err)
    return
  }

  if (verified.status !== "success") {
    console.warn(`[Webhook] Transaction ${reference} status is '${verified.status}', not 'success'`)
    return
  }

  // Find the booking
  const booking = await prisma.booking.findUnique({
    where: { paystackReference: reference },
  })

  if (!booking) {
    console.error(`[Webhook] No booking found for reference: ${reference}`)
    return
  }

  if (booking.status === "CONFIRMED") {
    console.log(`[Webhook] Booking ${booking.id} already confirmed — skip`)
    return
  }

  // Update booking status to CONFIRMED
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paystackStatus: "SUCCESS",
      status: "CONFIRMED",
    },
  })

  // Confirm in Anolla
  if (booking.anollaBookingId) {
    try {
      await confirmBooking(booking.anollaBookingId, reference)
      await prisma.booking.update({
        where: { id: booking.id },
        data: { anollaStatus: "CONFIRMED" },
      })
    } catch (err) {
      console.error("[Webhook] Failed to confirm Anolla booking:", err)
      // Still proceed — Anolla sync can be done manually; payment is confirmed
    }
  }

  // Send WhatsApp notifications
  const sessionDate = formatDisplayDate(
    booking.sessionDate.toISOString().slice(0, 10)
  )
  const startDisplay = formatDisplayTime(booking.startTime)
  const endDisplay = formatDisplayTime(booking.endTime)

  try {
    const { customerSent, ownerSent } = await sendBookingConfirmationNotifications({
      bookingId: booking.id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      sessionDate,
      startTime: startDisplay,
      endTime: endDisplay,
      durationHours: booking.durationHours,
      studio: booking.studio,
      equipment: booking.equipment,
      amountGHS: pesewasToGhs(booking.amountGHS),
      paystackReference: reference,
      notes: booking.notes ?? undefined,
    })

    await prisma.booking.update({
      where: { id: booking.id },
      data: { customerNotified: customerSent, ownerNotified: ownerSent },
    })
  } catch (err) {
    console.error("[Webhook] WhatsApp notifications failed:", err)
  }

  console.log(`[Webhook] ✅ Booking ${booking.id} confirmed successfully`)
}

// ── charge.failed ─────────────────────────────────────────────────────────────

async function handleChargeFailed(reference: string) {
  const booking = await prisma.booking.findUnique({
    where: { paystackReference: reference },
  })

  if (!booking || booking.status === "CANCELLED") return

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paystackStatus: "FAILED", status: "FAILED" },
  })

  // Release slot in Anolla
  if (booking.anollaBookingId) {
    try {
      await cancelBooking(booking.anollaBookingId, "payment_failed")
      await prisma.booking.update({
        where: { id: booking.id },
        data: { anollaStatus: "CANCELLED" },
      })
    } catch (err) {
      console.error("[Webhook] Failed to cancel Anolla booking:", err)
    }
  }

  console.log(`[Webhook] ❌ Payment failed for booking ${booking.id}`)
}

// ── refund.processed ──────────────────────────────────────────────────────────

async function handleRefund(reference: string) {
  const booking = await prisma.booking.findUnique({
    where: { paystackReference: reference },
  })

  if (!booking) return

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paystackStatus: "REVERSED", status: "REFUNDED" },
  })

  if (booking.anollaBookingId) {
    try {
      await cancelBooking(booking.anollaBookingId, "refund_processed")
      await prisma.booking.update({
        where: { id: booking.id },
        data: { anollaStatus: "CANCELLED" },
      })
    } catch (err) {
      console.error("[Webhook] Failed to cancel Anolla booking on refund:", err)
    }
  }

  console.log(`[Webhook] Refund processed for booking ${booking.id}`)
}
