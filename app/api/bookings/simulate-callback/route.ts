// app/api/bookings/simulate-callback/route.ts
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { bookingId, action } = await req.json()

    if (!bookingId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (action === "SUCCESS") {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "CONFIRMED",
          paystackStatus: "SUCCESS",
          anollaStatus: "CONFIRMED",
        }
      })
      console.log(`[Simulated Payment] Booking ${bookingId} successfully confirmed via simulation.`)
    } else {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "FAILED",
          paystackStatus: "FAILED",
          anollaStatus: "CANCELLED",
        }
      })
      console.log(`[Simulated Payment] Booking ${bookingId} marked as failed via simulation.`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Simulated Payment Callback Error]:", err)
    return NextResponse.json({ error: "Failed to process simulation callback" }, { status: 500 })
  }
}
