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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    if (action === "SUCCESS") {
      console.log(`[Simulated Payment] Triggering success webhook for reference: ${booking.paystackReference}`)
      
      try {
        const webhookRes = await fetch(`${appUrl}/api/hubtel/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientReference: booking.paystackReference,
            transactionId: `sim-tx-${Date.now()}`,
            status: "Success",
            amount: booking.amountGHS / 100,
          }),
        })

        if (!webhookRes.ok) {
          throw new Error(`Webhook responded with status ${webhookRes.status}`)
        }
      } catch (webhookErr) {
        console.error("[Simulated Payment] Webhook simulation failed, falling back to direct DB update:", webhookErr)
        
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            paystackStatus: "SUCCESS",
            isPaid: true,
          }
        })
      }
    } else {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "FAILED",
          paystackStatus: "FAILED",
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
