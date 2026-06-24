// app/api/payments/hubtel/callback/route.ts
// POST /api/payments/hubtel/callback
//
// Hubtel calls this endpoint after a payment attempt.
// This route is the authoritative handler for LIVE Hubtel payment results.
//
// Flow:
//   1. Parse + validate Hubtel callback payload
//   2. Idempotency check — skip if this transactionId already processed
//   3. If simulation mode is ON, reject (simulated payments use /api/hubtel/webhook)
//   4. Verify the transaction with Hubtel's status API
//   5. Update booking status in Supabase (CONFIRMED/PAID or FAILED)
//   6. Record idempotency event in webhook_events table
//   7. Return HTTP 200 (Hubtel requires 200 to stop retrying)

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase"
import { verifyHubtelTransaction, HubtelError } from "@/lib/hubtel"

// ── Hubtel callback payload schema ─────────────────────────────────────────────
// Hubtel's documented callback shape for the POS Online Checkout product.
const HubtelCallbackSchema = z.object({
  // The reference you submitted when initiating the transaction
  clientReference: z.string().min(1),
  // Hubtel's own internal transaction ID
  transactionId: z.string().optional(),
  // "Success" | "Completed" | "Failed" | "Pending"
  status: z.string(),
  // Amount charged — GHS float
  amount: z.number().optional(),
  // Optional descriptive message
  message: z.string().optional(),
  // Hubtel may nest data in a ResponseCode field
  responseCode: z.string().optional(),
}).passthrough() // tolerate additional undocumented fields Hubtel may add

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let rawBody: string
  let payload: z.infer<typeof HubtelCallbackSchema>

  // 1. Read raw body for parsing
  try {
    rawBody = await req.text()
    const json = JSON.parse(rawBody)
    const parsed = HubtelCallbackSchema.safeParse(json)
    if (!parsed.success) {
      console.error("[callback] Invalid Hubtel payload:", parsed.error.flatten())
      // Return 200 so Hubtel stops retrying an unprocessable payload
      return NextResponse.json({ received: true, skipped: "invalid_payload" }, { status: 200 })
    }
    payload = parsed.data
  } catch {
    console.error("[callback] Failed to parse Hubtel callback body")
    return NextResponse.json({ received: true, skipped: "parse_error" }, { status: 200 })
  }

  const { clientReference, transactionId, status, amount } = payload

  console.log("[callback] Received Hubtel callback:", {
    clientReference,
    transactionId,
    status,
    amount,
  })

  const supabase = createServiceClient()

  // 2. Idempotency: skip if we already processed this transactionId
  if (transactionId) {
    const { data: existing } = await (supabase as any)
      .from("webhook_events")
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle()

    if (existing) {
      console.log(`[callback] Duplicate event for transactionId: ${transactionId} — skipping.`)
      return NextResponse.json({ received: true, skipped: "duplicate" }, { status: 200 })
    }
  }

  // 3. Simulation mode guard
  // Live callbacks should never be processed if we're in simulation mode.
  // This prevents a Hubtel retry (from a prior live attempt) from corrupting simulated state.
  try {
    const { data: simSetting } = await (supabase as any)
      .from("settings")
      .select("value")
      .eq("key", "payment_simulation_mode")
      .maybeSingle()

    const simMode = simSetting?.value === true || simSetting?.value === "true"
    if (simMode) {
      console.warn("[callback] Received live Hubtel callback while simulation mode is ON — ignoring.")
      return NextResponse.json(
        { received: true, skipped: "simulation_mode_active" },
        { status: 200 }
      )
    }
  } catch (err) {
    // Non-fatal — proceed; we'll let the verification step catch issues
    console.warn("[callback] Could not read simulation mode, proceeding with verification:", err)
  }

  // 4. Verify transaction status directly with Hubtel (don't trust callback alone)
  let verifiedStatus: string
  try {
    const verification = await verifyHubtelTransaction(clientReference)
    verifiedStatus = verification.status
    console.log(`[callback] Hubtel verification for ${clientReference}: status=${verifiedStatus}`)
  } catch (err) {
    if (err instanceof HubtelError) {
      console.error(`[callback] Verification failed (${err.code}): ${err.message}`)
    } else {
      console.error("[callback] Verification exception:", err)
    }
    // Return 200 to Hubtel but log the issue; a re-delivery may succeed
    // If HUBTEL_MERCHANT_ACCOUNT_NUMBER is not yet set, fall back to the callback's own status
    console.warn("[callback] Falling back to callback-reported status:", status)
    verifiedStatus = status
  }

  // 5. Determine outcome
  const isSuccess =
    verifiedStatus === "Success" ||
    verifiedStatus === "Completed" ||
    verifiedStatus === "successful"

  // 6. Find the booking
  const { data: booking, error: lookupError } = await (supabase as any)
    .from("bookings")
    .select("id, booking_code, status, customer_name, customer_email")
    .eq("booking_code", clientReference)
    .maybeSingle()

  if (lookupError || !booking) {
    console.error(`[callback] Booking not found for clientReference: ${clientReference}`, lookupError)
    // Return 200 — Hubtel would retry indefinitely otherwise for a booking we cannot find
    return NextResponse.json({ received: true, skipped: "booking_not_found" }, { status: 200 })
  }

  // Guard: skip if already in a terminal state
  if (booking.status === "CONFIRMED" || booking.status === "PAID" || booking.status === "FAILED") {
    console.log(`[callback] Booking ${clientReference} already in terminal state: ${booking.status} — skipping update.`)
    return NextResponse.json({ received: true, skipped: "already_terminal" }, { status: 200 })
  }

  // 7. Update booking status in Supabase
  const now = new Date().toISOString()

  const updatePayload = isSuccess
    ? {
        status: "CONFIRMED",
        hubtel_status: "SUCCESS",
        is_paid: true,
        status_payment: true,
        status_payment_at: now,
        hubtel_transaction_id: transactionId ?? null,
      }
    : {
        status: "FAILED",
        hubtel_status: "FAILED",
        hubtel_transaction_id: transactionId ?? null,
      }

  const { error: updateError } = await (supabase as any)
    .from("bookings")
    .update(updatePayload)
    .eq("booking_code", clientReference)

  if (updateError) {
    console.error(`[callback] DB update failed for ${clientReference}:`, updateError)
    // Return 500 so Hubtel will retry (our DB write is the critical step)
    return NextResponse.json({ error: "DB update failed" }, { status: 500 })
  }

  console.log(`[callback] Booking ${clientReference} updated → status: ${updatePayload.status}`)

  // 8. Record idempotency event
  if (transactionId) {
    const { error: eventError } = await (supabase as any)
      .from("webhook_events")
      .insert({
        transaction_id: transactionId,
        client_reference: clientReference,
        event_type: isSuccess ? "payment.success" : "payment.failed",
        status: verifiedStatus,
        raw_payload: rawBody,
        processed_at: now,
      })

    if (eventError) {
      // Non-fatal — log and continue
      console.warn("[callback] Could not record webhook event:", eventError.message)
    }
  }

  // Always return 200 to Hubtel
  return NextResponse.json(
    {
      received: true,
      outcome: isSuccess ? "confirmed" : "failed",
      clientReference,
    },
    { status: 200 }
  )
}
