// app/api/admin/payments/refund/route.ts
// POST /api/admin/payments/refund — mark a booking as refunded
// NOTE: Hubtel does not expose a programmatic refund API endpoint.
// Refunds must be initiated manually through the Hubtel merchant dashboard.
// This route updates the booking status in the database to REFUNDED so the
// admin panel reflects the change immediately after processing in Hubtel.

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

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
    return NextResponse.json(
      { error: "Booking has no successful payment to refund" },
      { status: 400 }
    )
  }

  if (!booking.paystackReference) {
    return NextResponse.json(
      { error: "No Hubtel client reference on this booking" },
      { status: 400 }
    )
  }

  try {
    // Mark the booking as refunded in the database.
    // The actual refund must be processed via the Hubtel merchant dashboard
    // using clientReference: booking.paystackReference
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paystackStatus: "REVERSED",
        status: "REFUNDED",
      },
    })

    return NextResponse.json({
      success: true,
      booking: updated,
      message: `Booking marked as refunded. Please complete the refund in the Hubtel dashboard using reference: ${booking.paystackReference}`,
    })
  } catch (err) {
    console.error("[Admin Refund] Error:", err)
    return NextResponse.json({ error: "Failed to update booking status" }, { status: 500 })
  }
}
