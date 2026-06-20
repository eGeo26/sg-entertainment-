// app/api/admin/customers/route.ts
// GET /api/admin/customers — CRM view, derived from bookings grouped by email

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get all bookings with customer fields
  const bookings = await prisma.booking.findMany({
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      amountGHS: true,
      status: true,
      paystackStatus: true,
      sessionDate: true,
      startTime: true,
      endTime: true,
      durationHours: true,
      studio: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  // Group by email to build customer records
  const customerMap = new Map<
    string,
    {
      name: string
      email: string
      phone: string
      bookings: typeof bookings
      totalSpentPesewas: number
      lastBookingDate: Date
    }
  >()

  for (const b of bookings) {
    const existing = customerMap.get(b.customerEmail)
    if (existing) {
      existing.bookings.push(b)
      existing.totalSpentPesewas +=
        b.paystackStatus === "SUCCESS" ? b.amountGHS : 0
      if (b.createdAt > existing.lastBookingDate) {
        existing.lastBookingDate = b.createdAt
      }
    } else {
      customerMap.set(b.customerEmail, {
        name: b.customerName,
        email: b.customerEmail,
        phone: b.customerPhone,
        bookings: [b],
        totalSpentPesewas: b.paystackStatus === "SUCCESS" ? b.amountGHS : 0,
        lastBookingDate: b.createdAt,
      })
    }
  }

  const customers = Array.from(customerMap.values())
    .map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      totalBookings: c.bookings.length,
      totalSpentGHS: c.totalSpentPesewas / 100,
      lastBooking: c.lastBookingDate,
      bookings: c.bookings.map((b: any) => ({
        ...b,
        amountGHS: b.amountGHS / 100,
      })),
    }))
    .sort((a, b) => b.totalBookings - a.totalBookings)

  return NextResponse.json({ customers })
}
