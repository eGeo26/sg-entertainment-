// app/api/admin/closed-dates/route.ts
// GET  /api/admin/closed-dates      \u2014 list all closed dates (past + future) with booking counts
// POST /api/admin/closed-dates      \u2014 mark a date as closed
// Admin-only. Requires authenticated session with role = 'admin'.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, getAdminSession } from "@/lib/supabase"

// ── GET \u2014 list all closed dates with existing confirmed-booking counts ──────────
export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = createServiceClient()

    // Fetch all closed dates (admins see past + future for the full record)
    const { data: closedDates, error: closedError } = await (supabase as any)
      .from("closed_dates")
      .select("id, date, note, created_at, created_by")
      .order("date", { ascending: false })

    if (closedError) throw closedError

    // For each closed date, count existing CONFIRMED bookings so admin can reschedule manually
    const datesWithCounts = await Promise.all(
      ((closedDates ?? []) as Array<{ id: string; date: string; note: string | null; created_at: string; created_by: string | null }>).map(async (cd) => {
        const windowStart = `${cd.date}T00:00:00Z`
        const windowEnd   = `${cd.date}T23:59:59Z`

        const { count } = await (supabase as any)
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .gte("session_date", windowStart)
          .lte("session_date", windowEnd)
          .in("status", ["CONFIRMED", "AWAITING_PAYMENT"])

        return {
          ...cd,
          existingBookingCount: (count as number | null) ?? 0,
        }
      })
    )

    return NextResponse.json({ closedDates: datesWithCounts })
  } catch (err) {
    console.error("[AdminClosedDates] GET error:", err)
    return NextResponse.json({ error: "Failed to fetch closed dates" }, { status: 500 })
  }
}

// ── POST \u2014 mark a date as closed ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { date, note } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format (expected YYYY-MM-DD)" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await (supabase as any)
      .from("closed_dates")
      .insert({
        date,
        note: note?.trim() || null,
        created_by: session.email ?? null,
      })
      .select()
      .single()

    if (error) {
      // Unique violation \u2014 date already closed
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This date is already marked as closed." },
          { status: 409 }
        )
      }
      throw error
    }

    // Count existing bookings on this newly-closed date so the UI can show the badge
    const windowStart = `${date}T00:00:00Z`
    const windowEnd   = `${date}T23:59:59Z`
    const { count } = await (supabase as any)
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("session_date", windowStart)
      .lte("session_date", windowEnd)
      .in("status", ["CONFIRMED", "AWAITING_PAYMENT"])

    return NextResponse.json({
      closedDate: { ...(data as object), existingBookingCount: (count as number | null) ?? 0 },
    }, { status: 201 })
  } catch (err) {
    console.error("[AdminClosedDates] POST error:", err)
    return NextResponse.json({ error: "Failed to close date" }, { status: 500 })
  }
}
