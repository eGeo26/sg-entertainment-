// app/api/admin/stats/route.ts
// GET /api/admin/stats — dashboard overview aggregates

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { subDays, startOfDay, format } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [totalBookings, confirmedBookings, grantedSessions, revenueAgg] =
      await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma.booking.count({ where: { isDelivered: true } }),
        prisma.booking.aggregate({
          _sum: { amountGHS: true },
          where: { status: "CONFIRMED" },
        }),
      ])

    // Revenue by day — last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30)
    const recentBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        amountGHS: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // Group by day
    const dayMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd")
      dayMap.set(d, 0)
    }
    for (const b of recentBookings) {
      const d = format(b.createdAt, "yyyy-MM-dd")
      dayMap.set(d, (dayMap.get(d) ?? 0) + b.amountGHS / 100)
    }
    const revenueByDay = Array.from(dayMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }))

    // Recent bookings (last 10)
    const recentBookingsList = await prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        sessionDate: true,
        startTime: true,
        endTime: true,
        durationHours: true,
        studio: true,
        amountGHS: true,
        status: true,
        paystackStatus: true,
        anollaStatus: true,
        anollaBookingId: true,
        paystackReference: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      totalBookings,
      confirmedBookings,
      grantedSessions,
      revenueGHS: (revenueAgg._sum.amountGHS ?? 0) / 100,
      revenueByDay,
      recentBookings: recentBookingsList.map((b: any) => ({
        ...b,
        amountGHS: b.amountGHS / 100,
      })),
    })
  } catch (err) {
    console.error("[Admin Stats] Error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
