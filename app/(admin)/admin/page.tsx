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
  anollaStatus: string
  anollaBookingId: string | null
  paystackReference: string | null
  createdAt: string
}

interface StatsData {
  totalBookings: number
  confirmedBookings: number
  pendingPayments: number
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
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value="..." loading accent="gold" />
          <StatCard label="Confirmed" value="..." loading accent="green" />
          <StatCard label="Pending Payments" value="..." loading accent="amber" />
          <StatCard label="Total Revenue" value="..." loading accent="blue" />
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl p-6 h-[380px] animate-pulse">
          <div className="h-4 bg-white/10 rounded w-48 mb-6" />
          <div className="h-64 bg-white/5 rounded w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
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
          subtext="Paid & booked in Anolla"
          accent="green"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Payments"
          value={stats?.pendingPayments ?? 0}
          subtext="Abandoned or awaiting MoMo"
          accent="amber"
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">Revenue Over Time</h2>
            <p className="text-xs text-white/40 mt-1">Confirmed payments over the last 30 days</p>
          </div>
          <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded text-white/50 tracking-wider font-medium">30 DAYS</span>
        </div>

        <div className="h-[280px] w-full">
          {mounted && stats?.revenueByDay && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
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
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-lg shadow-black/10">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-white uppercase">Recent Bookings</h2>
            <p className="text-xs text-white/40 mt-1">Latest checkout activities</p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs text-white hover:underline font-medium uppercase tracking-wider flex items-center gap-1"
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
              <tr className="border-b border-white/5 text-[10px] font-medium tracking-wider text-white/40 uppercase bg-white/[0.01]">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Session Time</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats?.recentBookings && stats.recentBookings.length > 0 ? (
                stats.recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.01] transition-colors text-sm">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white/90">{b.customerName}</p>
                        <p className="text-xs text-white/40">{b.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white/80">{formatDate(b.sessionDate)}</p>
                        <p className="text-xs text-white/40">{b.startTime} ({b.durationHours} hrs)</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white/80">
                      {formatGHS(b.amountGHS)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/75 hover:text-white rounded-lg text-xs font-medium border border-white/8 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Booking Inspection</h3>
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
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Customer Name</span>
                  <span className="text-white text-sm font-medium">{selectedBooking.customerName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Status Badge</span>
                  <div className="mt-1"><StatusBadge status={selectedBooking.status} /></div>
                </div>
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Email Address</span>
                  <span className="text-white text-sm break-all">{selectedBooking.customerEmail}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Total Paid</span>
                  <span className="text-white text-sm font-semibold">{formatGHS(selectedBooking.amountGHS)}</span>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Session Date</span>
                  <span className="text-white text-sm font-medium">{formatDate(selectedBooking.sessionDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Duration</span>
                  <span className="text-white text-sm">{selectedBooking.startTime} - {selectedBooking.endTime} ({selectedBooking.durationHours} hrs)</span>
                </div>
              </div>

              <hr className="border-white/5" />

              {/* Engine references */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Anolla Booking ID</span>
                  <span className="text-white/80 font-mono text-xs break-all">{selectedBooking.anollaBookingId ?? "None"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-white/40 uppercase tracking-widest mb-1">Paystack Reference</span>
                  <span className="text-white/80 font-mono text-xs break-all">{selectedBooking.paystackReference ?? "None"}</span>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
              <Link
                href={`/admin/bookings?search=${selectedBooking.id}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-all uppercase tracking-wider"
              >
                Manage Booking
              </Link>
              <button
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/8 text-xs font-semibold rounded-xl transition-all uppercase tracking-wider"
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
