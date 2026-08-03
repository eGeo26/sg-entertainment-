"use client"
// app/(admin)/admin/insights/page.tsx

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import CollapsibleStatRow from "../components/CollapsibleStatRow"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

interface InsightsData {
  revenueOverview: {
    confirmedGHS: number
    pendingGHS: number
    confirmedCount: number
    pendingCount: number
  }
  compareMoM: {
    currentMonthGHS: number
    prevMonthGHS: number
    percentChange: number
  }
  metrics: {
    aovGHS: number
    totalHoursBooked: number
    totalBookings: number
  }
  productRanking: {
    name: string
    brand: string
    category: string
    unitsSold: number
    revenueGHS: number
    sharePercent: number
  }[]
  pipelineDistribution: {
    status: string
    count: number
  }[]
}

const COLORS = ["#FFFFFF", "#A3A3A3", "#737373", "#404040", "#171717"]

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    const duration = 800 // 800ms
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setDisplayValue(progress * value)
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }
    window.requestAnimationFrame(step)
  }, [value])

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString("en-GH", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInsights = async () => {
    try {
      const res = await fetch("/api/admin/insights")
      if (!res.ok) throw new Error()
      const d = await res.json()
      setData(d)
    } catch {
      toast.error("Failed to load business analytics.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-8 bg-white/10 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-white/5 rounded-xl" />
          <div className="h-28 bg-white/5 rounded-xl" />
          <div className="h-28 bg-white/5 rounded-xl" />
        </div>
        <div className="h-80 bg-white/5 rounded-xl" />
      </div>
    )
  }

  if (!data) return null

  // Format pipeline status labels
  const formattedPipeline = data.pipelineDistribution.map((item) => ({
    name: item.status.replace("_", " "),
    value: item.count
  })).filter(item => item.value > 0)

  // Chart data for revenue comparison
  const revenueComparisonData = [
    { name: "Prev Month", amount: data.compareMoM.prevMonthGHS },
    { name: "Current Month", amount: data.compareMoM.currentMonthGHS }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">Sales &amp; Business Insights</h1>
        <p className="text-xs text-white/40 mt-1.5">Core recording analytics, asset rentals, and popular equipment rankings</p>
      </div>

      {/* Metrics Row */}
      <CollapsibleStatRow
        stats={[
          {
            label: "Confirmed vs. Pending Rev",
            value: `GH₵ ${data.revenueOverview.confirmedGHS.toFixed(0)}`,
            subtext: `Pending: GH₵ ${data.revenueOverview.pendingGHS.toFixed(0)}`,
            accent: "gold",
          },
          {
            label: "MoM Growth Margin",
            value: `GH₵ ${data.compareMoM.currentMonthGHS.toFixed(0)}`,
            subtext: `Previous Month: GH₵ ${data.compareMoM.prevMonthGHS.toFixed(0)}`,
            accent: "green",
          },
          {
            label: "Average Order Value (AOV)",
            value: `GH₵ ${data.metrics.aovGHS.toFixed(2)}`,
            subtext: "Based on verified bookings",
            accent: "blue",
          },
          {
            label: "Total Session Hours",
            value: `${data.metrics.totalHoursBooked} hrs`,
            subtext: "Confirmed recording time",
            accent: "amber",
          },
        ]}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Month over Month Revenue */}
        <div className="glass-card p-5 md:p-6">
          <h3 className="text-xs font-semibold tracking-wider text-white uppercase mb-4">MoM Revenue Comparison</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueComparisonData}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11 }}
                  formatter={(val) => [`GH₵ ${Number(val).toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="amount" fill="#FFFFFF" radius={[8, 8, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="glass-card p-5 md:p-6">
          <h3 className="text-xs font-semibold tracking-wider text-white uppercase mb-4">Pipeline Distribution Status</h3>
          <div className="h-64 w-full flex items-center justify-center">
            {formattedPipeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedPipeline}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {formattedPipeline.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-white/30 italic">No bookings recorded yet to determine pipeline status.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
