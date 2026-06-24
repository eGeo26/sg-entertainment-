// app/api/admin/stats/route.ts
// GET /api/admin/stats — dashboard overview aggregates
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { subDays, format } from "date-fns"

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // 1. Fetch counts
    const [
      { count: totalBookings },
      { count: confirmedBookings },
      { count: grantedSessions },
      { data: revenueData }
    ] = await Promise.all([
      (supabase as any).from("bookings").select("*", { count: "exact", head: true }),
      (supabase as any).from("bookings").select("*", { count: "exact", head: true }).eq("status", "CONFIRMED"),
      (supabase as any).from("bookings").select("*", { count: "exact", head: true }).eq("status_confirmed", true),
      (supabase as any).from("bookings").select("amount_ghs").eq("status", "CONFIRMED")
    ])

    const totalRevenue = (revenueData ?? []).reduce((sum: number, item: any) => sum + item.amount_ghs, 0)

    // Revenue by day — last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
    const { data: recentBookings, error: recentError } = await (supabase as any)
      .from("bookings")
      .select("created_at, amount_ghs")
      .eq("status", "CONFIRMED")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true })

    if (recentError) throw recentError

    // Group by day
    const dayMap = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd")
      dayMap.set(d, 0)
    }
    for (const b of (recentBookings ?? [])) {
      const d = format(new Date(b.created_at), "yyyy-MM-dd")
      dayMap.set(d, (dayMap.get(d) ?? 0) + b.amount_ghs / 100)
    }
    const revenueByDay = Array.from(dayMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }))

    // Recent bookings (last 10)
    const { data: recentBookingsList, error: listError } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        customer_name,
        customer_email,
        session_date,
        start_time,
        end_time,
        duration_hours,
        studio,
        amount_ghs,
        status,
        hubtel_reference,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (listError) throw listError

    const formattedRecentBookingsList = (recentBookingsList ?? []).map((b: any) => ({
      id: b.id,
      customerName: b.customer_name,
      customerEmail: b.customer_email,
      sessionDate: b.session_date,
      startTime: b.start_time,
      endTime: b.end_time,
      durationHours: Number(b.duration_hours),
      studio: b.studio,
      amountGHS: b.amount_ghs / 100,
      status: b.status,
      hubtelReference: b.hubtel_reference,
      createdAt: b.created_at,
    }))

    return NextResponse.json({
      totalBookings: totalBookings ?? 0,
      confirmedBookings: confirmedBookings ?? 0,
      grantedSessions: grantedSessions ?? 0,
      revenueGHS: totalRevenue / 100,
      revenueByDay,
      recentBookings: formattedRecentBookingsList,
    })
  } catch (err) {
    console.error("[Admin Stats] Error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
