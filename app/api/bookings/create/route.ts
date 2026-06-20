// app/api/bookings/create/route.ts
// POST /api/bookings/create
// Creates a pending booking in DB + initializes Hubtel payment

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import prisma from "@/lib/prisma"
import { initializeHubtelTransaction } from "@/lib/hubtel"
import {
  calculateTotal,
  getEndTime,
  generatePaystackReference,
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
    // We reuse paystackReference and amountGHS column to avoid breaking database schema.
    const bookingId = uuidv4()
    const reference = generatePaystackReference(bookingId)

    const booking = await prisma.booking.create({
      data: {
        id: bookingId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: phone,
        sessionDate: new Date(`${data.sessionDate}T${data.startTime}:00Z`),
        startTime: data.startTime,
        endTime,
        durationHours: data.durationHours,
        studio: data.studio,
        equipment: data.equipment,
        notes: data.notes,
        amountGHS: pesewas,
        paystackReference: reference,
        status: "AWAITING_PAYMENT",
      },
    })

    // 2. Initialize payment transaction (Simulation vs Hubtel)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    let isSimulationMode = true
    try {
      const simSetting = await prisma.setting.findUnique({
        where: { key: "payment_simulation_mode" }
      })
      if (simSetting) {
        isSimulationMode = simSetting.value === "true"
      }
    } catch (e) {
      console.error("Failed to read simulation setting, defaulting to true", e)
    }

    if (isSimulationMode || !process.env.HUBTEL_CLIENT_ID) {
      console.log("[Booking] Payment simulation active. Routing to simulated payment portal.")
      const simulateUrl = `${appUrl}/booking/simulate-payment?reference=${reference}&booking_id=${bookingId}`
      
      return NextResponse.json({
        bookingId,
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
      returnUrl: `${appUrl}/success?reference=${reference}&booking_id=${bookingId}`,
    })

    return NextResponse.json({
      bookingId,
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
