// app/api/bookings/create/route.ts
// POST /api/bookings/create
// Creates or updates a pending booking in Supabase + initializes Hubtel payment

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { createServiceClient } from "@/lib/supabase"
import { initializeHubtelTransaction } from "@/lib/hubtel"
import { enforceRateLimit } from "@/lib/rate-limit"
import {
  calculateTotal,
  getEndTime,
  generateBookingCode,
  validatePhoneNumber,
  PENDING_BOOKING_WINDOW_MS,
  toGhanaDateString,
  EXTRA_HOUR_RATE_GHS,
} from "@/lib/booking"

const CreateBookingSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z
    .string()
    .refine((val) => val.startsWith("+"), {
      message: "Phone number must include a country dial code (e.g. +233244123456)",
    })
    .refine((val) => validatePhoneNumber(val), {
      message: "Phone number must contain 6–12 digits after the country code",
    }),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(2).max(12),
  studio: z.string().default("Main Studio"),
  equipment: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
  selectedPackage: z.string().optional(),
  extensionHours: z.number().int().min(0).max(8).optional(),
})

// Helper: Convert GHS to Pesewas
function ghsToPesewas(amount: number): number {
  return Math.round(amount * 100)
}

export async function POST(req: NextRequest) {
  const rateLimited = enforceRateLimit(req, "booking-creation")
  if (rateLimited) return rateLimited

  try {
    const body = await req.json()
    const parsed = CreateBookingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    // Phone is already E.164 (validated above — must start with "+")
    const phone = data.customerPhone

    // ── Ghana-anchored past-date guard ─────────────────────────────────────
    // Reject any booking whose sessionDate is before today in Accra (UTC+0).
    // This prevents calendar-bypass attacks via direct API calls.
    const todayGhana = toGhanaDateString()
    if (data.sessionDate < todayGhana) {
      return NextResponse.json(
        { error: "Cannot book a session in the past." },
        { status: 400 }
      )
    }
    // ————————————————————————————————————————————————————————————

    const endTime = getEndTime(data.sessionDate, data.startTime, data.durationHours)
    const { total } = calculateTotal(data.durationHours, data.equipment, data.selectedPackage)
    const pesewas = ghsToPesewas(total)
    const sessionDateISO = new Date(`${data.sessionDate}T${data.startTime}:00Z`).toISOString()

    const supabase = createServiceClient()
    const extensionHours = data.extensionHours ?? 0
    const extensionAmount = extensionHours * EXTRA_HOUR_RATE_GHS * 100 // in pesewas

    // ── Closed-date enforcement ──────────────────────────────────────────────
    // Reject the booking if the admin has manually closed this date.
    // Checked server-side to prevent calendar-bypass via direct API calls.
    const { data: closedDateRaw } = await (supabase as any)
      .from("closed_dates")
      .select("note")
      .eq("date", data.sessionDate)
      .maybeSingle()

    const closedDate = closedDateRaw as { note: string | null } | null

    if (closedDate) {
      const reason = closedDate.note
        ? `This date is closed: ${closedDate.note}`
        : "This date has been closed by the studio. Please choose a different date."
      return NextResponse.json({ error: reason }, { status: 400 })
    }
    // ————————————————————————————————————————————————————————————

    const nowIso = new Date().toISOString()
    const cutoffTimeIso = new Date(Date.now() - PENDING_BOOKING_WINDOW_MS).toISOString()


    // 1. Check for an existing booking from the same customer (matching phone number)
    // for the same session date/time slot with status AWAITING_PAYMENT created within the last 45 minutes.
    const { data: existingBooking } = await (supabase as any)
      .from("bookings")
      .select("*")
      .eq("customer_phone", phone)
      .eq("session_date", sessionDateISO)
      .eq("start_time", data.startTime)
      .eq("status", "AWAITING_PAYMENT")
      .gte("created_at", cutoffTimeIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let reference: string
    let bookingId: string

    if (existingBooking) {
      // Reuse and refresh existing pending booking row
      reference = existingBooking.booking_code || generateBookingCode()
      bookingId = existingBooking.id

      const { error: updateError } = await (supabase as any)
        .from("bookings")
        .update({
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          end_time: endTime,
          duration_hours: data.durationHours,
          studio: data.studio,
          equipment: data.equipment,
          notes: data.notes ?? null,
          selected_package: data.selectedPackage ?? null,
          amount_ghs: pesewas,
          hubtel_reference: reference,
          extension_hours: extensionHours,
          extension_amount: extensionAmount,
          extended_at: null,
          created_at: nowIso, // Refresh 45-min timer
          updated_at: nowIso,
          status_received_at: nowIso,
        })
        .eq("id", bookingId)

      if (updateError) {
        console.error("[Booking] Update error:", JSON.stringify(updateError))
        return NextResponse.json({ error: "Failed to update pending booking" }, { status: 500 })
      }
    } else {
      // Insert new booking record (status: AWAITING_PAYMENT)
      bookingId = uuidv4()
      reference = generateBookingCode()

      const { error: insertError } = await (supabase as any)
        .from("bookings")
        .insert({
          id: bookingId,
          booking_code: reference,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: phone,
          session_date: sessionDateISO,
          start_time: data.startTime,
          end_time: endTime,
          duration_hours: data.durationHours,
          studio: data.studio,
          equipment: data.equipment,
          notes: data.notes ?? null,
          selected_package: data.selectedPackage ?? null,
          amount_ghs: pesewas,
          hubtel_reference: reference,
          status: "AWAITING_PAYMENT",
          status_received: true,
          status_received_at: nowIso,
          extension_hours: extensionHours,
          extension_amount: extensionAmount,
          extended_at: null,
          created_at: nowIso,
          updated_at: nowIso,
        })

      if (insertError) {
        console.error("[Booking] Insert error:", JSON.stringify(insertError))
        return NextResponse.json({ error: "Failed to save booking to database" }, { status: 500 })
      }
    }

    // 2. Initialize payment transaction with Hubtel
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    // Validate required environment variables
    const callbackUrl = process.env.HUBTEL_CALLBACK_URL
    if (!callbackUrl) {
      console.error("[Booking] HUBTEL_CALLBACK_URL is not set in environment variables")
      return NextResponse.json(
        { error: "Server configuration error: payment callback URL not configured" },
        { status: 500 }
      )
    }

    const hubtelData = await initializeHubtelTransaction({
      amountGHS: total,
      description: `Studio Session: ${data.sessionDate} (${data.startTime} - ${endTime})`,
      clientReference: reference,
      callbackUrl: callbackUrl,
      returnUrl: `${appUrl}/success?reference=${reference}&booking_id=${reference}`,
      cancellationUrl: `${appUrl}/booking?cancelled=true&reference=${reference}`,
    })

    return NextResponse.json({
      bookingId: reference,
      paystackReference: reference,
      authorizationUrl: hubtelData.checkoutUrl,
      amount: pesewas,
      currency: "GHS",
    })
  } catch (err: any) {
    console.error("[Booking] Create error:", err)
    const detailMessage = err?.message || (typeof err === "string" ? err : "Failed to create booking. Please try again.")
    return NextResponse.json(
      {
        error: detailMessage,
        details: err?.raw ?? null,
        code: err?.code ?? null,
      },
      { status: err?.httpStatus || 500 }
    )
  }
}
