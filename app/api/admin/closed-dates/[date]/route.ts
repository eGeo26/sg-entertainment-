// app/api/admin/closed-dates/[date]/route.ts
// DELETE /api/admin/closed-dates/2026-05-01  \u2014 remove a closed date
// Admin-only. Requires authenticated session with role = 'admin'.

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, getAdminSession } from "@/lib/supabase"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { date } = params

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from("closed_dates")
      .delete()
      .eq("date", date)

    if (error) throw error

    return NextResponse.json({ success: true, date })
  } catch (err) {
    console.error("[AdminClosedDates] DELETE error:", err)
    return NextResponse.json({ error: "Failed to remove closed date" }, { status: 500 })
  }
}
