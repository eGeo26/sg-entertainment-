// app/api/admin/insights/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { startOfMonth, subMonths, endOfMonth } from "date-fns"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 1. Confirmed vs. Pending Revenue
    const [confirmedAgg, pendingAgg, confirmedCount, pendingCount] = await Promise.all([
      prisma.booking.aggregate({
        _sum: { amountGHS: true },
        where: { status: "CONFIRMED" }
      }),
      prisma.booking.aggregate({
        _sum: { amountGHS: true },
        where: { status: "AWAITING_PAYMENT" }
      }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "AWAITING_PAYMENT" } })
    ])

    const confirmedRev = (confirmedAgg._sum.amountGHS ?? 0) / 100
    const pendingRev = (pendingAgg._sum.amountGHS ?? 0) / 100

    // 2. Month-over-Month Revenue
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const prevMonthStart = startOfMonth(subMonths(now, 1))
    const prevMonthEnd = endOfMonth(subMonths(now, 1))

    const [currentMonthAgg, prevMonthAgg] = await Promise.all([
      prisma.booking.aggregate({
        _sum: { amountGHS: true },
        where: {
          status: "CONFIRMED",
          sessionDate: { gte: currentMonthStart, lte: currentMonthEnd }
        }
      }),
      prisma.booking.aggregate({
        _sum: { amountGHS: true },
        where: {
          status: "CONFIRMED",
          sessionDate: { gte: prevMonthStart, lte: prevMonthEnd }
        }
      })
    ])

    const currentMonthRev = (currentMonthAgg._sum.amountGHS ?? 0) / 100
    const prevMonthRev = (prevMonthAgg._sum.amountGHS ?? 0) / 100

    // 3. Business metrics
    const aov = confirmedCount > 0 ? confirmedRev / confirmedCount : 0
    
    // 3. Business metrics: total session hours booked
    const totalHoursAgg = await prisma.booking.aggregate({
      _sum: { durationHours: true },
      where: { status: "CONFIRMED" }
    })
    const totalHoursBooked = totalHoursAgg._sum.durationHours ?? 0

    // 4. Equipment performance ranking
    const EQUIPMENT_PRICES: Record<string, { label: string; price: number }> = {
      condenser_mic: { label: "Condenser Microphone", price: 50 },
      dynamic_mic: { label: "Dynamic Microphone", price: 30 },
      headphones: { label: "Studio Headphones", price: 20 },
      guitar_amp: { label: "Guitar Amplifier", price: 80 },
      keyboard: { label: "MIDI Keyboard", price: 60 },
      mixing_engineer: { label: "In-house Mixing Engineer", price: 150 }
    }

    const allConfirmed = await prisma.booking.findMany({
      where: { status: "CONFIRMED" }
    })

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
    for (const b of allConfirmed) {
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
      statuses.map(s => prisma.booking.count({ where: { status: s } }))
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
