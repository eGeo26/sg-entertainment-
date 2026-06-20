// app/api/admin/payments/route.ts
// GET /api/admin/payments — Paystack transaction log from Booking table

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookings = await prisma.booking.findMany({
    where: {
      paystackReference: { not: null },
    },
    select: {
      id: true,
      paystackReference: true,
      paystackStatus: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      amountGHS: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    payments: bookings.map((b: any) => ({
      ...b,
      amountGHS: b.amountGHS / 100,
    })),
  })
}
