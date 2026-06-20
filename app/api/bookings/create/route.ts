// app/api/bookings/create/route.ts
// POST /api/bookings/create
// Creates a pending booking in DB + Anolla, then initializes Paystack payment

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import prisma from "@/lib/prisma"
import { createPendingBooking } from "@/lib/anolla"
import { initializeTransaction, ghsToPesewas } from "@/lib/paystack"
import {
  calculateTotal,
  getEndTime,
  generatePaystackReference,
  normalizePhone,
  buildISODateTime,
} from "@/lib/booking"

const CreateBookingSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(9).max(16),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().int().min(2).max(12),
  studio: z.string().default("Main Studio"),
  equipment: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
})

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
    const paystackRef = generatePaystackReference(bookingId)

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
        paystackReference: paystackRef,
        status: "AWAITING_PAYMENT",
      },
    })

    // 2. Create tentative booking in Anolla to hold the slot
    try {
      const { anollaBookingId } = await createPendingBooking({
        resourceId: process.env.ANOLLA_RESOURCE_ID!,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: phone,
        startDateTime: buildISODateTime(data.sessionDate, data.startTime),
        endDateTime: buildISODateTime(data.sessionDate, endTime),
        notes: data.notes,
        metadata: {
          booking_id: bookingId,
          paystack_reference: paystackRef,
        },
      })

      await prisma.booking.update({
        where: { id: bookingId },
        data: { anollaBookingId },
      })
    } catch (anollaErr) {
      // Non-fatal: log and continue. Anolla sync will be retried on payment success.
      console.error("[Anolla] Failed to create pending booking:", anollaErr)
    }

    // 3. Initialize Paystack transaction
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

    if (isSimulationMode || !process.env.PAYSTACK_SECRET_KEY) {
      console.log("[Booking] Payment simulation active. Routing to simulated payment portal.")
      const simulateUrl = `${appUrl}/booking/simulate-payment?reference=${paystackRef}&booking_id=${bookingId}`
      
      return NextResponse.json({
        bookingId,
        paystackReference: paystackRef,
        authorizationUrl: simulateUrl,
        accessCode: "simulated-access-code",
        amount: pesewas,
        currency: "GHS",
      })
    }

    const paystackData = await initializeTransaction({
      email: data.customerEmail,
      amountKobo: pesewas,
      reference: paystackRef,
      callbackUrl: `${appUrl}/success?reference=${paystackRef}&booking_id=${bookingId}`,
      metadata: {
        booking_id: bookingId,
        customer_name: data.customerName,
        customer_phone: phone,
        session_date: data.sessionDate,
        start_time: data.startTime,
        end_time: endTime,
        duration_hours: data.durationHours,
        studio: data.studio,
        cancel_action: `${appUrl}/booking?cancelled=true`,
      },
    })

    return NextResponse.json({
      bookingId,
      paystackReference: paystackRef,
      authorizationUrl: paystackData.authorization_url,
      accessCode: paystackData.access_code,
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
