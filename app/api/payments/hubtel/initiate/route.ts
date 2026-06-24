// app/api/payments/hubtel/initiate/route.ts
// POST /api/payments/hubtel/initiate
//
// Dual-mode payment initiator:
//   - Reads `payment_simulation_mode` from Supabase settings table.
//   - mode = true  → returns the simulate-payment URL (no external API call)
//   - mode = false → calls Hubtel POS Online Checkout API and returns checkout URL
//
// Security: All HUBTEL_ env vars are server-side only; nothing is forwarded to the client.

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase"
import { initiateHubtelTransaction, HubtelError } from "@/lib/hubtel"

// ── Request validation ─────────────────────────────────────────────────────────

const InitiateSchema = z.object({
  /** The booking_code / hubtel_reference that identifies this booking */
  bookingCode: z.string().min(1),
  /** GHS amount as a float, e.g. 300.00 */
  amountGHS: z.number().positive(),
  /** Customer display name */
  customerName: z.string().min(1).max(100),
  /** Customer email for Hubtel receipt */
  customerEmail: z.string().email().optional(),
  /** Customer phone in E.164 format e.g. +233XXXXXXXXX */
  customerPhone: z.string().optional(),
  /** Human-readable description of the booking */
  description: z.string().max(200).optional(),
})

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = InitiateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const {
    bookingCode,
    amountGHS,
    customerName,
    customerEmail,
    customerPhone,
    description,
  } = parsed.data

  const supabase = createServiceClient()

  // 2. Confirm the booking exists in our DB
  const { data: booking, error: lookupError } = await (supabase as any)
    .from("bookings")
    .select("id, booking_code, status, customer_name, customer_email, customer_phone")
    .eq("booking_code", bookingCode)
    .maybeSingle()

  if (lookupError || !booking) {
    console.error("[initiate] Booking not found:", bookingCode, lookupError)
    return NextResponse.json({ error: "Booking not found." }, { status: 404 })
  }

  // Guard against double-charging confirmed bookings
  if (booking.status === "CONFIRMED" || booking.status === "PAID") {
    return NextResponse.json(
      { error: "This booking has already been paid.", alreadyPaid: true },
      { status: 409 }
    )
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")

  console.log(`[initiate] Calling Hubtel for ${bookingCode}, GHS ${amountGHS}`)

  // Use HUBTEL_CALLBACK_URL from environment variable
  const callbackUrl = process.env.HUBTEL_CALLBACK_URL
  if (!callbackUrl) {
    console.error("[initiate] HUBTEL_CALLBACK_URL is not set in environment variables")
    return NextResponse.json(
      { error: "Server configuration error: callback URL not configured" },
      { status: 500 }
    )
  }

  const returnUrl = `${appUrl}/success?reference=${bookingCode}&booking_id=${bookingCode}`
  const cancellationUrl = `${appUrl}/booking?cancelled=true&reference=${bookingCode}`

  try {
    const hubtelResult = await initiateHubtelTransaction({
      totalAmount: amountGHS,
      description: description || `Studio booking — ref: ${bookingCode}`,
      clientReference: bookingCode,
      callbackUrl,
      returnUrl,
      cancellationUrl,
      customerName: customerName || booking.customer_name,
      customerEmail: customerEmail || booking.customer_email || undefined,
      customerMobileNumber: customerPhone || booking.customer_phone || undefined,
    })

    console.log(`[initiate] Hubtel checkout ready: ${hubtelResult.checkoutUrl}`)

    return NextResponse.json({
      mode: "live",
      bookingCode,
      authorizationUrl: hubtelResult.checkoutUrl,
      checkoutId: hubtelResult.checkoutId,
      clientReference: hubtelResult.clientReference,
      amountGHS,
      currency: "GHS",
    })
  } catch (err) {
    if (err instanceof HubtelError) {
      console.error(`[initiate] HubtelError (${err.code}):`, err.message, err.raw)

      // Return 502 for gateway issues, 422 for credential/config issues
      const httpStatus =
        err.code === "invalid_credentials" || err.code === "config"
          ? 503
          : err.code === "declined"
          ? 422
          : 502

      return NextResponse.json(
        {
          error: err.toUserMessage(),
          code: err.code,
        },
        { status: httpStatus }
      )
    }

    console.error("[initiate] Unexpected error:", err)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again or contact us." },
      { status: 500 }
    )
  }
}
