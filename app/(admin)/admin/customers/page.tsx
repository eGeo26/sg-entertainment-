"use client"
// app/(admin)/admin/customers/page.tsx

import { useState, useEffect } from "react"
import { toast } from "sonner"
import StatusBadge from "../components/StatusBadge"

interface Booking {
  id: string
  sessionDate: string
  startTime: string
  endTime: string
  durationHours: number
  amountGHS: number
  status: string
  paystackStatus: string
  createdAt: string
}

interface Customer {
  name: string
  email: string
  phone: string
  totalBookings: number
  totalSpentGHS: number
  lastBooking: string
  bookings: Booking[]
}

export default function CustomersCRMPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const res = await fetch("/api/admin/customers")
        if (!res.ok) throw new Error("Failed to load customers")
        const data = await res.json()
        setCustomers(data.customers)
      } catch (err) {
        console.error(err)
        toast.error("Could not fetch customer database")
      } finally {
        setLoading(false)
      }
    }
    fetchCustomers()
  }, [])

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  )

  const toggleRow = (email: string) => {
    setExpandedEmail((prev) => (prev === email ? null : email))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatSimpleDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase">Customer CRM Directory</h1>
        <p className="text-xs text-white/40 mt-1">
          Detailed history and analytics per recording customer
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone number..."
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2.5 pl-9 text-white text-xs focus:outline-none focus:border-white/50"
          />
          <svg
            className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="text-xs text-white/45 tracking-wide bg-white/5 px-3 py-2 rounded-lg border border-white/5">
          Total Customers: <span className="text-white font-bold">{customers.length}</span>
        </div>
      </div>

      {/* Customers List/Table */}
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-medium tracking-wider text-white/40 uppercase bg-white/[0.01]">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Customer Info</th>
                <th className="px-6 py-4">Sessions Booked</th>
                <th className="px-6 py-4">Total Spent</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6">
                      <div className="h-4 bg-white/10 rounded w-1/2" />
                    </td>
                  </tr>
                ))
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const isExpanded = expandedEmail === c.email
                  return (
                    <>
                      <tr
                        key={c.email}
                        className={`hover:bg-white/[0.01] transition-colors text-sm cursor-pointer ${
                          isExpanded ? "bg-white/[0.02]" : ""
                        }`}
                        onClick={() => toggleRow(c.email)}
                      >
                        <td className="px-6 py-4 text-center">
                          <svg
                            className={`w-3 h-3 text-white/45 transition-transform duration-200 ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="px-6 py-4">
                           <div>
                             <div className="flex items-center gap-2">
                               <p className="font-semibold text-white">{c.name}</p>
                               {/* CRM Loyalty Tags */}
                               {(c.totalBookings >= 3 || c.totalSpentGHS >= 1000) && (
                                 <span className="text-[8px] bg-white/10 text-white border border-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                   VIP
                                 </span>
                               )}
                               {c.totalBookings >= 5 && (
                                 <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                   Gift Eligible
                                 </span>
                               )}
                             </div>
                             <p className="text-xs text-white/40 mt-0.5">{c.email}</p>
                           </div>
                         </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full text-xs font-semibold text-white/80">
                            {c.totalBookings}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">
                          GH₵ {c.totalSpentGHS.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {formatSimpleDate(c.lastBooking)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleRow(c.email)
                            }}
                            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-semibold text-white/70 hover:text-white transition-all"
                          >
                            {isExpanded ? "Collapse History" : "View History"}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable History Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-black/40 backdrop-blur-md px-8 py-5 border-t border-white/5">
                            <div className="space-y-4">
                              <h4 className="text-[10px] font-semibold text-white uppercase tracking-widest">
                                Booking History Timeline
                              </h4>
                              <div className="border-l border-white/10 space-y-4 pl-4 ml-2 relative">
                                {c.bookings.map((b) => (
                                  <div key={b.id} className="relative group">
                                    {/* Timeline point */}
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white bg-[#070707] ring-4 ring-[#070707]" />

                                    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                      <div className="space-y-1">
                                        <p className="text-xs text-white/40">
                                          Session Date:{" "}
                                          <span className="text-white/80 font-medium">
                                            {formatSimpleDate(b.sessionDate)}
                                          </span>
                                        </p>
                                        <p className="text-xs text-white/70">
                                          {b.startTime} - {b.endTime} ({b.durationHours} hrs duration)
                                        </p>
                                        <p className="text-[10px] font-mono text-white/30 mt-1">ID: {b.id}</p>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-white">
                                          GH₵ {b.amountGHS.toFixed(2)}
                                        </span>
                                        <StatusBadge status={b.status} size="sm" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/30 text-sm">
                    No customers found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
