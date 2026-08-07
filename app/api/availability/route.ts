// app/api/availability/route.ts
// GET /api/availability?date=YYYY-MM-DD&duration=150
// Custom availability engine — queries Supabase directly, no Anolla dependency.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { TIME_SLOTS } from "@/types"
import { deleteStaleAwaitingPaymentBookings, toGhanaDateString, getGhanaTime } from "@/lib/booking"

// Parse "HH:mm" to minutes-since-midnight
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}



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

    // 1. Permanently remove every stale unpaid hold before calculating availability.
    //    This uses the same shared window as booking creation and the admin list.
    const staleBookingDeleteError = await deleteStaleAwaitingPaymentBookings(supabase)

    if (staleBookingDeleteError) throw staleBookingDeleteError

    // 2. Fetch active confirmed/awaiting bookings for this date.
    const windowStart = `${date}T00:00:00Z`
    const windowEnd = `${date}T23:59:59Z`

    const { data: bookings, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select("start_time, end_time, status, created_at")
      .gte("session_date", windowStart)
      .lte("session_date", windowEnd)
      .in("status", ["CONFIRMED", "AWAITING_PAYMENT"])

    if (bookingsError) throw bookingsError

    // 3. Fetch blocked slots for this date
    const { data: blocked, error: blockedError } = await (supabase as any)
      .from("blocked_slots")
      .select("start_time, end_time")
      .eq("date", date)

    if (blockedError) throw blockedError

    // 3b. Check if this date has been manually closed by admin
    const { data: closedDateRaw, error: closedError } = await (supabase as any)
      .from("closed_dates")
      .select("id, note")
      .eq("date", date)
      .maybeSingle()

    if (closedError) throw closedError

    const closedDate = closedDateRaw as { id: string; note: string | null } | null

    // If the date is closed, return all slots as unavailable immediately
    if (closedDate) {
      const allUnavailable = TIME_SLOTS.map((time) => ({
        start: `${date}T${time}:00Z`,
        end: new Date(new Date(`${date}T${time}:00Z`).getTime() + duration * 60000).toISOString(),
        available: false,
      }))
      return NextResponse.json(
        { date, slots: allUnavailable, closed: true, closedNote: closedDate.note ?? null },
        { headers: { "Cache-Control": "no-store" } }
      )
    }

    // Build active intervals in minutes-since-midnight
    const intervals: { start: number; end: number }[] = []

    for (const b of (bookings ?? [])) {
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

    // 4. Compute same-day lead-hours cutoff (all values in minutes-since-midnight, Ghana time).
    //    sameDayCutoffMinutes is only meaningful when date === todayGhana.
    //    For every other date the sentinel -1 disables the check entirely —
    //    tomorrow and all future dates are unaffected.
    const todayGhana = toGhanaDateString()
    const isToday    = date === todayGhana
    const leadHours  = parseInt(process.env.NEXT_PUBLIC_BOOKING_LEAD_HOURS ?? "2")
    let sameDayCutoffMinutes = -1  // sentinel: disabled
    if (isToday) {
      const { hours, minutes } = getGhanaTime()
      sameDayCutoffMinutes = hours * 60 + minutes + leadHours * 60
    }

    // 5. Evaluate each TIME_SLOT
    const slots = TIME_SLOTS.map((time) => {
      const slotStart = toMinutes(time)
      const slotEnd   = slotStart + duration

      // For today only: slot is unavailable if its start time has not yet cleared
      // the lead-hours window from the current Ghana clock.
      // For all other dates: sameDayCutoffMinutes === -1 → always false.
      const isTooSoon = sameDayCutoffMinutes >= 0 && slotStart < sameDayCutoffMinutes

      // Check overlap with any booked/blocked interval
      const hasOverlap = intervals.some(
        (b) => slotStart < b.end && slotEnd > b.start
      )

      return {
        start: `${date}T${time}:00Z`,
        end: new Date(new Date(`${date}T${time}:00Z`).getTime() + duration * 60000).toISOString(),
        available: !isTooSoon && !hasOverlap,
      }
    })

    const isDev = process.env.NODE_ENV !== "production"
    const debugNow = new Date()
    return NextResponse.json(
      {
        date,
        slots,
        ...(isDev && {
          debugGhanaTime: getGhanaTime(),
          debugGhanaDate: todayGhana,
          debugSystemTime: debugNow.toISOString(),
        }),
      },
      { headers: { "Cache-Control": "public, max-age=10, no-cache" } }
    )
  } catch (err) {
    console.error("[Availability] Error:", err)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
