"use client"
// app/(admin)/admin/page.tsx

import { useState, useEffect } from "react"
import Link from "next/link"
import StatCard from "./components/StatCard"
import StatusBadge from "./components/StatusBadge"
import { toast } from "sonner"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  sessionDate: string
  startTime: string
  endTime: string
  durationHours: number
  studio: string
  amountGHS: number
  status: string
  paystackStatus: string
  paystackReference: string | null
  createdAt: string
}

interface StatsData {
  totalBookings: number
  confirmedBookings: number
  grantedSessions: number
  revenueGHS: number
  revenueByDay: { date: string; revenue: number }[]
  recentBookings: Booking[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  // Avoid recharts hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        if (!res.ok) {
          throw new Error("Failed to load statistics")
        }
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error(err)
        toast.error("Could not fetch dashboard statistics")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatGHS = (val: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value="..." loading accent="gold" />
          <StatCard label="Confirmed" value="..." loading accent="green" />
          <StatCard label="Granted Sessions" value="..." loading accent="amber" />
          <StatCard label="Total Revenue" value="..." loading accent="blue" />
        </div>
        <div className="glass-card p-6 h-[380px]">
          <div className="h-4 rounded w-48 mb-6 skeleton" />
          <div className="h-64 rounded w-full skeleton" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">Overview</h1>
        <p className="text-xs text-white/40 mt-1.5">Real-time studio activity metrics, financial summaries, and booking logs</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value={stats?.totalBookings ?? 0}
          subtext="All initiated checkouts"
          accent="gold"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
        />
        <StatCard
          label="Confirmed"
          value={stats?.confirmedBookings ?? 0}
          subtext="Paid & confirmed via Hubtel"
          accent="green"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Granted Sessions"
          value={stats?.grantedSessions ?? 0}
          subtext="Sessions completed & granted"
          accent="amber"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Revenue"
          value={formatGHS(stats?.revenueGHS ?? 0)}
          subtext="From confirmed payments"
          accent="blue"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 0a2.25 2.25 0 01-2.25-2.25M3.75 4.5l1.5 8.25m16.5-8.25v2.25m0-2.25a2.25 2.25 0 00-2.25-2.25M21.75 8.25l-1.5 8.25m-16.5-8.25h16.5M3.75 12h16.5m-16.5 0v3.75m0 0a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25v-3.75m-18 0A2.25 2.25 0 005.25 18h13.5A2.25 2.25 0 0021 15.75v-3.75" />
            </svg>
          }
        />
      </div>

      {/* Analytics Chart Row */}
      <div className="glass-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-white uppercase mb-1">Revenue Over Time</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Confirmed payments over the last 30 days</p>
          </div>
          <span
            className="text-[10px] px-2.5 py-1 rounded-lg tracking-wider font-semibold"
            style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >30 DAYS</span>
        </div>

        <div className="h-[280px] w-full">
          {mounted && stats?.revenueByDay && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A880" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#C5A880" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(str) => {
                    const parts = str.split("-")
                    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : str
                  }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.2)"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `GH₵${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#161616",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#FFF",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#FFFFFF" }}
                  labelFormatter={(label) => formatDate(label)}
                  formatter={(value) => [`GH₵ ${value}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C5A880"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-white uppercase mb-1">Recent Bookings</h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Latest checkout activities</p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors"
            style={{ color: "var(--sg-gold)" }}
          >
            All Bookings
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-overlay)", color: "var(--text-muted)" }}
              >
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Session Time</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                stats.recentBookings.map((b) => (
                  <tr
                    key={b.id}
                    className="text-sm transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{b.customerName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p style={{ color: "var(--text-secondary)" }}>{formatDate(b.sessionDate)}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{b.startTime} ({b.durationHours} hrs)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium" style={{ color: "var(--text-secondary)" }}>
                      {formatGHS(b.amountGHS)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="btn-glass px-3 py-1.5 text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-white/30">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Inspector Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
          <div
            className="glass-card w-full max-w-xl max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: "0 32px 64px rgba(0,0,0,0.5)" }}
          >
            <div
              className="flex items-center justify-between p-5"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <h3 className="text-sm font-semibold tracking-wider uppercase" style={{ color: "var(--text-primary)" }}>Booking Inspection</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Customer Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Customer Name</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selectedBooking.customerName}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Status</span>
                  <div className="mt-1"><StatusBadge status={selectedBooking.status} /></div>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Email Address</span>
                  <span className="text-sm break-all" style={{ color: "var(--text-secondary)" }}>{selectedBooking.customerEmail}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Total Paid</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{formatGHS(selectedBooking.amountGHS)}</span>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Payment reference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Session Date</span>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{formatDate(selectedBooking.sessionDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Duration</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{selectedBooking.startTime} – {selectedBooking.endTime} ({selectedBooking.durationHours} hrs)</span>
                </div>
              </div>

              <hr style={{ borderColor: "var(--border)" }} />

              {/* Hubtel reference */}
              <div>
                <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Hubtel Client Reference</span>
                <span className="font-mono text-xs break-all" style={{ color: "var(--text-secondary)" }}>{selectedBooking.paystackReference ?? "None"}</span>
              </div>
            </div>

            <div className="p-5 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-overlay)" }}>
              <Link
                href={`/admin/bookings?search=${selectedBooking.id}`}
                className="btn-gold text-xs uppercase tracking-wider"
              >
                Manage Booking
              </Link>
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn-glass text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
