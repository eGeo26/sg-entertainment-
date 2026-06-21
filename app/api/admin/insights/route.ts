// app/api/admin/insights/route.ts
import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { startOfMonth, subMonths, endOfMonth } from "date-fns"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = createServiceClient()

    // 1. Confirmed vs. Pending Revenue
    const { data: confirmedBookingsData, error: confirmedError } = await (supabase as any)
      .from("bookings")
      .select("amount_ghs, duration_hours, equipment")
      .eq("status", "CONFIRMED")

    if (confirmedError) throw confirmedError

    const { data: pendingBookingsData, error: pendingError } = await (supabase as any)
      .from("bookings")
      .select("amount_ghs")
      .eq("status", "AWAITING_PAYMENT")

    if (pendingError) throw pendingError

    const confirmedCount = confirmedBookingsData?.length ?? 0
    const pendingCount = pendingBookingsData?.length ?? 0

    const confirmedRev = (confirmedBookingsData ?? []).reduce((sum: number, item: any) => sum + item.amount_ghs, 0) / 100
    const pendingRev = (pendingBookingsData ?? []).reduce((sum: number, item: any) => sum + item.amount_ghs, 0) / 100

    // 2. Month-over-Month Revenue
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const prevMonthStart = startOfMonth(subMonths(now, 1))
    const prevMonthEnd = endOfMonth(subMonths(now, 1))

    const { data: currentMonthData } = await (supabase as any)
      .from("bookings")
      .select("amount_ghs")
      .eq("status", "CONFIRMED")
      .gte("session_date", currentMonthStart.toISOString())
      .lte("session_date", currentMonthEnd.toISOString())

    const { data: prevMonthData } = await (supabase as any)
      .from("bookings")
      .select("amount_ghs")
      .eq("status", "CONFIRMED")
      .gte("session_date", prevMonthStart.toISOString())
      .lte("session_date", prevMonthEnd.toISOString())

    const currentMonthRev = (currentMonthData ?? []).reduce((sum: number, item: any) => sum + item.amount_ghs, 0) / 100
    const prevMonthRev = (prevMonthData ?? []).reduce((sum: number, item: any) => sum + item.amount_ghs, 0) / 100

    // 3. Business metrics
    const aov = confirmedCount > 0 ? confirmedRev / confirmedCount : 0
    const totalHoursBooked = (confirmedBookingsData ?? []).reduce((sum: number, item: any) => sum + Number(item.duration_hours), 0)

    // 4. Equipment performance ranking
    const EQUIPMENT_PRICES: Record<string, { label: string; price: number }> = {
      condenser_mic: { label: "Condenser Microphone", price: 50 },
      dynamic_mic: { label: "Dynamic Microphone", price: 30 },
      headphones: { label: "Studio Headphones", price: 20 },
      guitar_amp: { label: "Guitar Amplifier", price: 80 },
      keyboard: { label: "MIDI Keyboard", price: 60 },
      mixing_engineer: { label: "In-house Mixing Engineer", price: 150 }
    }

    const rankMap = new Map<string, { name: string; brand: string; category: string; units: number; rev: number }>()

    Object.entries(EQUIPMENT_PRICES).forEach(([id, item]) => {
      rankMap.set(id, {
        name: item.label,
        brand: "Add-on",
        category: "Equipment",
        units: 0,
        rev: item.price
      })
    })

    let totalEquipmentRentals = 0
    for (const b of (confirmedBookingsData ?? [])) {
      if (b.equipment && Array.isArray(b.equipment)) {
        for (const eqId of b.equipment) {
          const existing = rankMap.get(eqId)
          if (existing) {
            existing.units += 1
            totalEquipmentRentals += 1
          }
        }
      }
    }

    const ranking = Array.from(rankMap.values())
      .map(item => {
        const totalItemRev = item.units * item.rev
        return {
          name: item.name,
          brand: item.brand,
          category: item.category,
          unitsSold: item.units,
          revenueGHS: totalItemRev,
          sharePercent: totalEquipmentRentals > 0 ? (item.units / totalEquipmentRentals) * 100 : 0
        }
      })
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5)

    // 5. Pipeline status distribution
    const statuses = ["AWAITING_PAYMENT", "CONFIRMED", "CANCELLED", "REFUNDED", "FAILED"]
    const statusCounts = await Promise.all(
      statuses.map(async (s) => {
        const { count } = await (supabase as any)
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", s)
        return count ?? 0
      })
    )
    const pipelineDistribution = statuses.map((s, idx) => ({
      status: s,
      count: statusCounts[idx]
    }))

    return NextResponse.json({
      revenueOverview: {
        confirmedGHS: confirmedRev,
        pendingGHS: pendingRev,
        confirmedCount,
        pendingCount
      },
      compareMoM: {
        currentMonthGHS: currentMonthRev,
        prevMonthGHS: prevMonthRev,
        percentChange: prevMonthRev > 0 ? ((currentMonthRev - prevMonthRev) / prevMonthRev) * 100 : 0
      },
      metrics: {
        aovGHS: aov,
        totalHoursBooked,
        totalBookings: confirmedCount + pendingCount
      },
      productRanking: ranking,
      pipelineDistribution
    })
  } catch (err) {
    console.error("[Insights API Error]:", err)
    return NextResponse.json({ error: "Failed to compile business insights" }, { status: 500 })
  }
}
