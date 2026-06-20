// app/api/hubtel/webhook/route.ts
// POST /api/hubtel/webhook
// Handles secure status updates from the Hubtel gateway.

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
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
  const transactionId = payload.transactionId ?? payload.TransactionId ?? ""
  const status = payload.status ?? payload.Status ?? ""

  if (!reference) {
    console.warn("[Hubtel Webhook] Missing clientReference in payload")
    return NextResponse.json({ error: "Missing clientReference" }, { status: 400 })
  }

  console.log(`[Hubtel Webhook] Received status notification for ref: ${reference} | status: ${status}`)

  // 1. Idempotency Check
  const eventId = `hubtel-success-${reference}`
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } })
  if (existing) {
    console.log(`[Hubtel Webhook] Event already processed: ${eventId}`)
    return NextResponse.json({ ok: true, duplicate: true })
  }

  // 2. Fetch the corresponding booking from DB
  const booking = await prisma.booking.findUnique({
    where: { paystackReference: reference },
  })

  if (!booking) {
    console.error(`[Hubtel Webhook] Booking not found for reference: ${reference}`)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // If already confirmed, mark event as duplicate/processed and exit
  if (booking.status === "CONFIRMED") {
    return NextResponse.json({ ok: true, message: "Booking already confirmed" })
  }

  // 3. SECURE VERIFICATION: Query Hubtel API directly to confirm status
  // Webhooks can be spoofed; server-to-server validation is critical
  let verified
  try {
    verified = await verifyHubtelTransaction(reference)
  } catch (err: any) {
    console.error(`[Hubtel Webhook] Secure verification failed for ${reference}:`, err)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
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
  const expectedGHS = booking.amountGHS / 100
  const tolerance = 0.01
  if (Math.abs(verified.amount - expectedGHS) > tolerance) {
    console.error(`[Hubtel Webhook] Amount mismatch for ${reference}. Expected: GHS ${expectedGHS}, Got: GHS ${verified.amount}`)
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 })
  }

  // 5. Update Database Booking Status to CONFIRMED
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paystackStatus: "SUCCESS", // Maps to Success/Paid status
      status: "CONFIRMED",
      isPaid: true,
    },
  })

  // 6. Record the webhook event for idempotency
  await prisma.webhookEvent.create({
    data: {
      source: "hubtel",
      eventId,
      eventType: "transaction.success",
      payload: payload as object,
    },
  })

  // 7. Trigger Twilio WhatsApp notifications
  const dateStr = formatDisplayDate(booking.sessionDate.toISOString().slice(0, 10))
  const startTimeStr = formatDisplayTime(booking.startTime)
  const endTimeStr = formatDisplayTime(booking.endTime)

  try {
    const { customerSent, ownerSent } = await sendBookingConfirmationNotifications({
      bookingId: booking.id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      sessionDate: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      durationHours: booking.durationHours,
      studio: booking.studio,
      equipment: booking.equipment,
      amountGHS: expectedGHS,
      paystackReference: reference,
      notes: booking.notes ?? undefined,
    })

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        customerNotified: customerSent,
        ownerNotified: ownerSent,
      },
    })
  } catch (err) {
    console.error("[Hubtel Webhook] WhatsApp notifications dispatch error:", err)
  }

  console.log(`[Hubtel Webhook] Booking ${booking.id} verified and confirmed successfully`)
  return NextResponse.json({ ok: true })
}
