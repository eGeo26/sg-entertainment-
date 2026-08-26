// app/api/payments/hubtel/initiate-extension/route.ts
// POST /api/payments/hubtel/initiate-extension
// Initiates a checkout transaction specifically for extending an existing, confirmed session.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase"
import { initiateHubtelTransaction, HubtelError } from "@/lib/hubtel"
import { enforceRateLimit } from "@/lib/rate-limit"
import { EXTRA_HOUR_RATE_GHS } from "@/lib/booking"

const InitiateExtensionSchema = z.object({
  bookingCode: z.string().min(1),
  extraHours: z.number().int().positive().max(8),
})

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "payment-initiation")
  if (rateLimited) return rateLimited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = InitiateExtensionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { bookingCode, extraHours } = parsed.data
  const supabase = createServiceClient()

  // 1. Find the booking to extend
  const { data: booking, error: lookupError } = await (supabase as any)
    .from("bookings")
    .select("id, booking_code, status, customer_name, customer_email, customer_phone")
    .eq("booking_code", bookingCode)
    .maybeSingle()

  if (lookupError || !booking) {
    console.error("[initiate-extension] Booking not found:", bookingCode, lookupError)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 })
  }

  // 2. Guard: Only confirmed bookings can be extended mid-session
  if (booking.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Only confirmed sessions can be extended." },
      { status: 400 }
    )
  }

  const extraAmountGHS = extraHours * EXTRA_HOUR_RATE_GHS
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")

  // Unique transaction reference for the extension checkouts to prevent collision with base booking checkout
  const clientReference = `${bookingCode}-ext-${Date.now()}`

  const callbackUrl = process.env.HUBTEL_CALLBACK_URL
  if (!callbackUrl) {
    console.error("[initiate-extension] HUBTEL_CALLBACK_URL is not set in environment variables")
    return NextResponse.json(
      { error: "Server configuration error: callback URL not configured" },
      { status: 500 }
    )
  }

  const returnUrl = `${appUrl}/success?reference=${bookingCode}&booking_id=${bookingCode}`
  const cancellationUrl = `${appUrl}/success?reference=${bookingCode}&booking_id=${bookingCode}&cancelled=true`

  console.log(`[initiate-extension] Calling Hubtel for extension of ${bookingCode}, GHS ${extraAmountGHS}`)

  try {
    const hubtelResult = await initiateHubtelTransaction({
      totalAmount: extraAmountGHS,
      description: `Studio Session Extension (+${extraHours} hr${extraHours > 1 ? "s" : ""}) — Ref: ${bookingCode}`,
      clientReference,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email || undefined,
      customerMobileNumber: booking.customer_phone || undefined,
    })

    console.log(`[initiate-extension] Hubtel extension checkout ready: ${hubtelResult.checkoutUrl}`)

    return NextResponse.json({
      mode: "live",
      bookingCode,
      clientReference,
      authorizationUrl: hubtelResult.checkoutUrl,
      amountGHS: extraAmountGHS,
    })
  } catch (err) {
    if (err instanceof HubtelError) {
      console.error(`[initiate-extension] HubtelError (${err.code}):`, err.message, err.raw)
      return NextResponse.json(
        { error: err.toUserMessage(), code: err.code },
        { status: err.code === "declined" ? 422 : 502 }
      )
    }

    console.error("[initiate-extension] Unexpected error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}
