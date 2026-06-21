// app/api/availability/route.ts
// GET /api/availability?date=YYYY-MM-DD&duration=150
// Custom availability engine — queries Supabase directly, no Anolla dependency.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { TIME_SLOTS, STUDIO_HOURS } from "@/types"

// Parse "HH:mm" to minutes-since-midnight
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

const OPEN_MINUTES = toMinutes(STUDIO_HOURS.open)   // 08:00 → 480
const CLOSE_MINUTES = toMinutes(STUDIO_HOURS.close) // 22:00 → 1320

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const duration = parseInt(searchParams.get("duration") ?? "150") // minutes

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 })
  }

  if (duration < 90 || duration > 720) {
    return NextResponse.json({ error: "Duration must be between 90 and 720 minutes" }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // 1. Fetch confirmed/awaiting bookings for this date
    //    AWAITING_PAYMENT holds expire after 30 minutes — treat them as active
    const windowStart = `${date}T00:00:00Z`
    const windowEnd = `${date}T23:59:59Z`

    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select("start_time, end_time, status, created_at")
      .gte("session_date", windowStart)
      .lte("session_date", windowEnd)
      .in("status", ["CONFIRMED", "AWAITING_PAYMENT"])

    if (bookingsError) throw bookingsError

    // 2. Fetch blocked slots for this date
    const { data: blocked, error: blockedError } = await (supabase as any)
      .from("blocked_slots")
      .select("start_time, end_time")
      .eq("date", date)

    if (blockedError) throw blockedError

    const now = Date.now()
    const THIRTY_MIN_MS = 30 * 60 * 1000

    // Build active intervals in minutes-since-midnight
    const intervals: { start: number; end: number }[] = []

    for (const b of (bookings ?? [])) {
      // Expire stale AWAITING_PAYMENT holds (>30 minutes old)
      if (b.status === "AWAITING_PAYMENT") {
        const createdAt = new Date(b.created_at).getTime()
        if (now - createdAt > THIRTY_MIN_MS) continue
      }
      intervals.push({
        start: toMinutes(b.start_time),
        end: toMinutes(b.end_time),
      })
    }

    for (const bl of (blocked ?? [])) {
      intervals.push({
        start: toMinutes(bl.start_time),
        end: toMinutes(bl.end_time),
      })
    }

    // 3. Evaluate each TIME_SLOT
    const slots = TIME_SLOTS.map((time) => {
      const slotStart = toMinutes(time)
      const slotEnd = slotStart + duration

      // Must start at/after open and end at/before close
      const withinHours = slotStart >= OPEN_MINUTES && slotEnd <= CLOSE_MINUTES

      // Check overlap with any booked interval
      const hasOverlap = intervals.some(
        (b) => slotStart < b.end && slotEnd > b.start
      )

      return {
        start: `${date}T${time}:00Z`,
        end: new Date(new Date(`${date}T${time}:00Z`).getTime() + duration * 60000).toISOString(),
        available: withinHours && !hasOverlap,
      }
    })

    return NextResponse.json(
      { date, slots },
      { headers: { "Cache-Control": "public, max-age=10, no-cache" } }
    )
  } catch (err) {
    console.error("[Availability] Error:", err)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
