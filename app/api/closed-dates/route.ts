// app/api/closed-dates/route.ts
// GET /api/closed-dates
// Public endpoint \u2014 returns all closed dates from today onward (Ghana time).
// Used by the booking calendar and the ClosedDateBanner component.
// No auth required; relies on Supabase RLS public_read_closed_dates policy.

import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { toGhanaDateString } from "@/lib/booking"

export async function GET() {
  try {
    const supabase = createServiceClient()
    const todayGhana = toGhanaDateString()

    const { data, error } = await supabase
      .from("closed_dates")
      .select("id, date, note, created_at")
      .gte("date", todayGhana)
      .order("date", { ascending: true })

    if (error) throw error

    return NextResponse.json(
      { closedDates: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    console.error("[ClosedDates] Public GET error:", err)
    return NextResponse.json({ error: "Failed to fetch closed dates" }, { status: 500 })
  }
}
