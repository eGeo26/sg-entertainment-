// app/api/anolla/availability/route.ts
// GET /api/anolla/availability?date=YYYY-MM-DD&duration=120

import { NextRequest, NextResponse } from "next/server"
import { getAvailability } from "@/lib/anolla"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const duration = parseInt(searchParams.get("duration") ?? "60")

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 })
  }

  try {
    const slots = await getAvailability(date, duration)

    // Cache for 30 seconds — availability changes frequently
    return NextResponse.json(
      { date, slots },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      }
    )
  } catch (err) {
    console.error("[Availability] Error:", err)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
