// app/api/anolla/availability/route.ts
// GET /api/anolla/availability?date=YYYY-MM-DD&duration=120
// Returns slot availability by checking our local database for conflicting bookings.

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { TIME_SLOTS } from "@/types"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const duration = parseInt(searchParams.get("duration") ?? "150") // default min duration 2h 30m

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 })
  }

  try {
    // 1. Fetch bookings in a window: 1 day before to 1 day after, to catch crossing midnight
    const queryDate = new Date(`${date}T00:00:00.000Z`)
    const oneDayMs = 24 * 60 * 60 * 1000
    const windowStart = new Date(queryDate.getTime() - oneDayMs)
    const windowEnd = new Date(queryDate.getTime() + 2 * oneDayMs)

    const bookings = await prisma.booking.findMany({
      where: {
        sessionDate: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: {
          in: ["CONFIRMED", "AWAITING_PAYMENT"],
        },
      },
    })

    // 2. Map existing bookings to concrete start/end timestamps
    const bookedIntervals = bookings.map((b: any) => {
      const bStart = new Date(b.sessionDate)
      const [endH, endM] = b.endTime.split(":").map(Number)
      const bEnd = new Date(b.sessionDate)
      bEnd.setUTCHours(endH, endM, 0, 0)
      
      // Handle crossover midnight
      if (bEnd.getTime() < bStart.getTime()) {
        bEnd.setUTCDate(bEnd.getUTCDate() + 1)
      }
      
      return { start: bStart.getTime(), end: bEnd.getTime() }
    })

    // 3. Evaluate each slot in TIME_SLOTS
    const slots = TIME_SLOTS.map((time) => {
      const slotStart = new Date(`${date}T${time}:00Z`)
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)
      
      const startMs = slotStart.getTime()
      const endMs = slotEnd.getTime()

      // Check overlap: slotStart < bEnd && slotEnd > bStart
      const hasOverlap = bookedIntervals.some(
        (b: { start: number; end: number }) => startMs < b.end && endMs > b.start
      )

      return {
        start: `${date}T${time}:00Z`,
        end: slotEnd.toISOString(),
        available: !hasOverlap,
      }
    })

    return NextResponse.json(
      { date, slots },
      {
        headers: {
          "Cache-Control": "public, max-age=5, no-cache",
        },
      }
    )
  } catch (err) {
    console.error("[Availability] Error:", err)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
