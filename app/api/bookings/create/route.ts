// app/api/bookings/create/route.ts
// POST /api/bookings/create
// Creates a pending booking in Supabase + initializes Hubtel payment

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { createServiceClient } from "@/lib/supabase"
import { initializeHubtelTransaction } from "@/lib/hubtel"
import {
  calculateTotal,
  getEndTime,
  generateBookingCode,
  normalizePhone,
} from "@/lib/booking"

const CreateBookingSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(9).max(16),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(2).max(12),
  studio: z.string().default("Main Studio"),
  equipment: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
})

// Helper: Convert GHS to Pesewas
function ghsToPesewas(amount: number): number {
  return Math.round(amount * 100)
}

export async function POST(req: NextRequest) {
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
    const phone = normalizePhone(data.customerPhone)
    const endTime = getEndTime(data.sessionDate, data.startTime, data.durationHours)
    const { total } = calculateTotal(data.durationHours, data.equipment)
    const pesewas = ghsToPesewas(total)

    // 1. Create booking record in our DB (status: AWAITING_PAYMENT)
    const bookingId = uuidv4()
    const reference = generateBookingCode()

    const supabase = createServiceClient()

    const { data: booking, error: insertError } = await (supabase as any)
      .from("bookings")
      .insert({
        id: bookingId,
        booking_code: reference,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: phone,
        session_date: new Date(`${data.sessionDate}T${data.startTime}:00Z`).toISOString(),
        start_time: data.startTime,
        end_time: endTime,
        duration_hours: data.durationHours,
        studio: data.studio,
        equipment: data.equipment,
        notes: data.notes ?? null,
        amount_ghs: pesewas,
        paystack_reference: reference,
        status: "AWAITING_PAYMENT",
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Booking] Insert error:", insertError)
      return NextResponse.json({ error: "Failed to save booking to database" }, { status: 500 })
    }

    // 2. Initialize payment transaction (Simulation vs Hubtel)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    let isSimulationMode = true
    try {
      const { data: simSetting } = await (supabase as any)
        .from("settings")
        .select("value")
        .eq("key", "payment_simulation_mode")
        .single()
      if (simSetting) {
        isSimulationMode = simSetting.value === "true"
      }
    } catch (e) {
      console.error("Failed to read simulation setting, defaulting to true", e)
    }

    if (isSimulationMode || !process.env.HUBTEL_CLIENT_ID) {
      console.log("[Booking] Payment simulation active. Routing to simulated payment portal.")
      const simulateUrl = `${appUrl}/booking/simulate-payment?reference=${reference}&booking_id=${reference}`
      
      return NextResponse.json({
        bookingId: reference,
        paystackReference: reference,
        authorizationUrl: simulateUrl,
        amount: pesewas,
        currency: "GHS",
      })
    }

    const hubtelData = await initializeHubtelTransaction({
      amountGHS: total,
      description: `Studio Session: ${data.sessionDate} (${data.startTime} - ${endTime})`,
      clientReference: reference,
      callbackUrl: `${appUrl}/api/hubtel/webhook`,
      returnUrl: `${appUrl}/success?reference=${reference}&booking_id=${reference}`,
    })

    return NextResponse.json({
      bookingId: reference,
      paystackReference: reference,
      authorizationUrl: hubtelData.checkoutUrl,
      amount: pesewas,
      currency: "GHS",
    })
  } catch (err) {
    console.error("[Booking] Create error:", err)
    return NextResponse.json(
      { error: "Failed to create booking. Please try again." },
      { status: 500 }
    )
  }
}
