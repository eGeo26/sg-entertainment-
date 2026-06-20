// app/api/bookings/[id]/route.ts
// GET /api/bookings/:id — fetch booking details (used on success page)

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      sessionDate: true,
      startTime: true,
      endTime: true,
      durationHours: true,
      studio: true,
      equipment: true,
      notes: true,
      amountGHS: true,
      status: true,
      paystackReference: true,
      createdAt: true,
    },
  })

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const dateStr = booking.sessionDate.toISOString().slice(0, 10)

  return NextResponse.json({
    ...booking,
    amountGHS: pesewasToGhs(booking.amountGHS),
    displayDate: formatDisplayDate(dateStr),
    displayStartTime: formatDisplayTime(booking.startTime),
    displayEndTime: formatDisplayTime(booking.endTime),
  })
}
