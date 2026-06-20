// app/api/admin/payments/refund/route.ts
// POST /api/admin/payments/refund — trigger Paystack refund for a booking

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { refundTransaction } from "@/lib/paystack"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { bookingId, reason } = await req.json()

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  if (booking.paystackStatus !== "SUCCESS") {
    return NextResponse.json({ error: "Booking has no successful payment to refund" }, { status: 400 })
  }
  if (!booking.paystackReference) {
    return NextResponse.json({ error: "No Paystack reference on this booking" }, { status: 400 })
  }

  try {
    await refundTransaction({
      transaction: booking.paystackReference,
      reason: reason ?? "Admin requested refund",
    })

    // Update booking to REFUNDED
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paystackStatus: "REVERSED",
        status: "REFUNDED",
      },
    })

    return NextResponse.json({ success: true, booking: updated })
  } catch (err) {
    console.error("[Admin Refund] Error:", err)
    return NextResponse.json({ error: "Paystack refund failed" }, { status: 500 })
  }
}
