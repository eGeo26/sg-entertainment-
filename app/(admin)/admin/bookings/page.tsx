"use client"
// app/(admin)/admin/bookings/page.tsx

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import StatusBadge from "../components/StatusBadge"
import { calculateTotal } from "@/lib/booking"
import { EQUIPMENT_OPTIONS, TIME_SLOTS } from "@/types"
import { toast } from "sonner"

interface Booking {
  id: string
  createdAt: string
  updatedAt: string
  customerName: string
  customerEmail: string
  customerPhone: string
  sessionDate: string
  startTime: string
  endTime: string
  durationHours: number
  studio: string
  equipment: string[]
  notes: string | null
  amountGHS: number
  currency: string
  anollaBookingId: string | null
  anollaStatus: string
  paystackReference: string | null
  paystackStatus: string
  status: string
  // New pipeline logistics fields
  isPaid: boolean
  isPacked: boolean
  isDispatched: boolean
  isDelivered: boolean
  adminNotes: string | null
  estimatedDeliveryTime: string | null
}

interface StatsData {
  totalRevenueGHS: number
  activeBookings: number
  grantedSessions: number
}

interface FetchBookingsResponse {
  bookings: Booking[]
  total: number
  page: number
  pages: number
  stats: StatsData
}

function BookingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Filter States
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [status, setStatus] = useState(searchParams.get("status") ?? "ALL")
  const [fromDate, setFromDate] = useState(searchParams.get("from") ?? "")
  const [toDate, setToDate] = useState(searchParams.get("to") ?? "")
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1"))

  // Data States
  const [data, setData] = useState<FetchBookingsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Selection States
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal / Inspector States
  const [inspectedBooking, setInspectedBooking] = useState<Booking | null>(null)
  const [editStatus, setEditStatus] = useState("")
  const [editAnollaStatus, setEditAnollaStatus] = useState("")
  const [editPaystackStatus, setEditPaystackStatus] = useState("")
  
  // Logistics local states in inspector
  const [editAdminNotes, setEditAdminNotes] = useState("")
  const [editEstDeliveryTime, setEditEstDeliveryTime] = useState("")

  const [isUpdating, setIsUpdating] = useState(false)
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  
  // Password Gate
  const [showPasswordGate, setShowPasswordGate] = useState(false)
  const [passwordGateAction, setPasswordGateAction] = useState<() => void>(() => {})
  const [gatePasswordInput, setGatePasswordInput] = useState("")

  // Receipt Modal
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null)

  // Manual Booking Form States
  const [manualForm, setManualForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    sessionDate: "",
    startTime: "10:00",
    durationHours: 3,
    equipment: [] as string[],
    notes: "",
    amountGHS: 0,
    isPriceOverridden: false,
  })

  // Fetch Bookings
  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (search) q.set("search", search)
      if (status !== "ALL") q.set("status", status)
      if (fromDate) q.set("from", fromDate)
      if (toDate) q.set("to", toDate)
      q.set("page", page.toString())
      q.set("limit", "25")

      const res = await fetch(`/api/admin/bookings?${q.toString()}`)
      if (!res.ok) throw new Error("Failed to load bookings")
      const result = await res.json()
      setData(result)

      // If search matches a specific booking directly, auto-open it
      if (search && result.bookings.length === 1 && result.bookings[0].id === search) {
        openInspection(result.bookings[0])
      }
    } catch (err) {
      console.error(err)
      toast.error("Could not load bookings list")
    } finally {
      setLoading(false)
    }
  }, [search, status, fromDate, toDate, page])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  // Recalculate manual booking price on change
  useEffect(() => {
    if (!manualForm.isPriceOverridden) {
      const { total } = calculateTotal(
        manualForm.durationHours,
        manualForm.equipment
      )
      setManualForm((prev) => ({ ...prev, amountGHS: total }))
    }
  }, [manualForm.durationHours, manualForm.equipment, manualForm.isPriceOverridden])

  const openInspection = (booking: Booking) => {
    setInspectedBooking(booking)
    setEditStatus(booking.status)
    setEditAnollaStatus(booking.anollaStatus)
    setEditPaystackStatus(booking.paystackStatus)
    setEditAdminNotes(booking.adminNotes || "")
    setEditEstDeliveryTime(booking.estimatedDeliveryTime || "")
  }

  // Trigger Password check
  const triggerGate = (action: () => void) => {
    setGatePasswordInput("")
    setPasswordGateAction(() => action)
    setShowPasswordGate(true)
  }

  const handlePasswordGateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const realPassword = localStorage.getItem("slay_admin_password") || "admin"
    if (gatePasswordInput === realPassword) {
      setShowPasswordGate(false)
      passwordGateAction()
    } else {
      toast.error("Invalid verification password!")
    }
  }

  // Save changes in inspector
  const handleUpdateStatuses = async () => {
    if (!inspectedBooking) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/bookings/${inspectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          anollaStatus: editAnollaStatus,
          paystackStatus: editPaystackStatus,
          adminNotes: editAdminNotes,
          estimatedDeliveryTime: editEstDeliveryTime
        }),
      })

      if (!res.ok) throw new Error("Failed to update booking")
      const updated = await res.json()

      toast.success("Booking changes saved successfully")
      setInspectedBooking(updated)
      fetchBookings()
    } catch (err) {
      console.error(err)
      toast.error("Could not save booking details")
    } finally {
      setIsUpdating(false)
    }
  }

  // Checkbox inline updates
  const handleToggleLogisticsField = async (booking: Booking, field: "isPaid" | "isPacked" | "isDispatched" | "isDelivered") => {
    const nextVal = !booking[field]
    
    // Optimistic Update
    if (data) {
      const updatedList = data.bookings.map(b => b.id === booking.id ? { ...b, [field]: nextVal } : b)
      setData({ ...data, bookings: updatedList })
    }

    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: nextVal }),
      })
      if (!res.ok) throw new Error()
      toast.success("Fulfillment status updated")
      fetchBookings()
    } catch {
      toast.error("Failed to update status")
      fetchBookings() // rollback
    }
  }

  const handleCancelBooking = async (id: string) => {
    triggerGate(async () => {
      try {
        const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to cancel booking")
        const updated = await res.json()
        toast.success("Booking cancelled")
        if (inspectedBooking?.id === id) {
          setInspectedBooking(updated)
        }
        fetchBookings()
      } catch (err) {
        console.error(err)
        toast.error("Could not cancel booking")
      }
    })
  }

  // Deletions
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    triggerGate(async () => {
      try {
        const res = await fetch("/api/admin/bookings", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        })
        if (!res.ok) throw new Error()
        toast.success(`Successfully deleted ${selectedIds.length} bookings.`)
        setSelectedIds([])
        fetchBookings()
      } catch {
        toast.error("Failed to delete bookings.")
      }
    })
  }

  const handleSendWhatsapp = async (booking: Booking) => {
    setSendingWhatsapp(true)
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/whatsapp`, {
        method: "POST",
      })
      const resp = await res.json()
      if (!res.ok) throw new Error(resp.error ?? "Failed to send WhatsApp")
      
      if (resp.simulated) {
        toast.info(resp.message || "Simulated send. Opening WhatsApp Web...")
        if (resp.waLink) {
          window.open(resp.waLink, "_blank")
        }
      } else {
        toast.success(resp.message || "WhatsApp sent successfully!")
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error sending WhatsApp")
    } finally {
      setSendingWhatsapp(false)
    }
  }

  const handleCreateManualBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualForm.customerName || !manualForm.customerEmail || !manualForm.customerPhone || !manualForm.sessionDate) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: manualForm.customerName,
          customerEmail: manualForm.customerEmail,
          customerPhone: manualForm.customerPhone,
          sessionDate: manualForm.sessionDate,
          startTime: manualForm.startTime,
          durationHours: Number(manualForm.durationHours),
          equipment: manualForm.equipment,
          notes: manualForm.notes,
          amountGHS: Number(manualForm.amountGHS),
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to create booking")
      }

      toast.success("Manual booking created successfully!")
      setShowManualModal(false)
      // Reset form
      setManualForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        sessionDate: "",
        startTime: "10:00",
        durationHours: 3,
        equipment: [],
        notes: "",
        amountGHS: 0,
        isPriceOverridden: false,
      })
      fetchBookings()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "Could not create manual booking"
      toast.error(msg)
    }
  }

  const handleEquipmentToggle = (eqId: string) => {
    setManualForm((prev) => {
      const isSelected = prev.equipment.includes(eqId)
      const equipment = isSelected
        ? prev.equipment.filter((id) => id !== eqId)
        : [...prev.equipment, eqId]
      return { ...prev, equipment }
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(data.bookings.map((b) => b.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (!data || data.bookings.length === 0) {
      toast.error("No bookings to export.")
      return
    }
    const headers = ["Booking ID", "Created At", "Customer Name", "Customer Email", "Customer Phone", "Session Date", "Start Time", "End Time", "Duration (Hrs)", "Paid GHS", "Fulfillment Status", "Simulation Status"]
    const rows = data.bookings.map(b => [
      b.id,
      b.createdAt,
      b.customerName,
      b.customerEmail,
      b.customerPhone,
      b.sessionDate.slice(0, 10),
      b.startTime,
      b.endTime,
      b.durationHours.toString(),
      b.amountGHS.toFixed(2),
      b.status,
      b.isPaid ? "Paid" : "Awaiting"
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("CSV Log exported successfully!")
  }

  const clearFilters = () => {
    setSearch("")
    setStatus("ALL")
    setFromDate("")
    setToDate("")
    setPage(1)
  }

  // Alerts checkers
  const hasDuplicateWarning = (b: Booking, list: Booking[]) => {
    return list.some(item => item.id !== b.id && item.customerPhone === b.customerPhone)
  }

  return (
    <div className="space-y-6">
      {/* Metrics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Confirmed Revenue</p>
          <p className="text-3xl font-light tracking-tight mt-2" style={{ color: "var(--text-primary)" }}>
            GH₵ {data?.stats?.totalRevenueGHS?.toLocaleString("en-GH", { minimumFractionDigits: 2 }) ?? "0.00"}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Active Confirmed Bookings</p>
          <p className="text-3xl font-light tracking-tight mt-2" style={{ color: "var(--text-primary)" }}>
            {data?.stats?.activeBookings ?? 0} Sessions
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Granted Sessions</p>
          <p className="text-3xl font-light tracking-tight mt-2" style={{ color: "var(--text-primary)" }}>
            {data?.stats?.grantedSessions ?? 0} Granted
          </p>
        </div>
      </div>

      {/* Action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">Bookings Log Console</h1>
          <p className="text-xs text-white/40 mt-1.5">Manage session bookings, pipeline logistics, and print invoices</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-400 font-bold px-3 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors"
            >
              Delete ({selectedIds.length}) Selected
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="border border-white/8 hover:border-white/20 text-white/70 hover:text-white bg-white/5 font-semibold px-3 py-2 rounded-lg text-xs uppercase tracking-wider transition-all"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center justify-center font-bold px-4 py-2.5 rounded-xl transition-all duration-200 select-none text-white text-xs uppercase tracking-wider gap-2"
            style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" }}
          >
            Register Manual Booking
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div className="space-y-1">
          <label className="block text-[9px] text-white/40 uppercase tracking-widest font-bold">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone, ID..."
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFFFFF]/50"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[9px] text-white/40 uppercase tracking-widest font-bold">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFFFFF]/50"
          >
            <option className="bg-[#111]" value="ALL">All Statuses</option>
            <option className="bg-[#111]" value="CONFIRMED">Confirmed</option>
            <option className="bg-[#111]" value="CANCELLED">Cancelled</option>
            <option className="bg-[#111]" value="REFUNDED">Refunded</option>
            <option className="bg-[#111]" value="FAILED">Failed</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[9px] text-white/40 uppercase tracking-widest font-bold">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFFFFF]/50"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[9px] text-white/40 uppercase tracking-widest font-bold">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFFFFF]/50"
          />
        </div>

        <button
          onClick={clearFilters}
          className="w-full py-2 border border-white/8 hover:border-white/20 text-white/60 hover:text-white bg-white/5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all"
        >
          Reset Filters
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden shadow-lg shadow-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-bold tracking-wider text-white/40 uppercase bg-white/[0.01]">
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={data ? selectedIds.length === data.bookings.length && data.bookings.length > 0 : false}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="accent-[#FFFFFF] rounded"
                  />
                </th>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Session Schedule</th>
                <th className="px-4 py-3">Paid amount</th>
                <th className="px-4 py-3">Fulfillment Pipeline</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-6">
                      <div className="h-4 bg-white/10 rounded w-2/3" />
                    </td>
                  </tr>
                ))
              ) : data?.bookings && data.bookings.length > 0 ? (
                data.bookings.map((b) => {
                  const isDuplicate = hasDuplicateWarning(b, data.bookings)
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.01] transition-colors text-xs">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.id)}
                          onChange={(e) => handleSelectRow(b.id, e.target.checked)}
                          className="accent-[#FFFFFF] rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-white/95">{b.customerName}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">{b.customerEmail} · {b.customerPhone}</p>
                          {/* Alert: duplicate only */}
                          {isDuplicate && (
                            <div className="mt-1.5">
                              <span className="text-[8px] bg-white/5 text-white/50 border border-white/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                Duplicate Submission
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-white/80">
                        <p className="font-medium">
                          {(() => {
                            const d = b.sessionDate.slice(0, 10)
                            const [yr, mo, dy] = d.split("-").map(Number)
                            return new Date(yr, mo - 1, dy).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          })()}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {b.startTime} – {b.endTime} ({b.durationHours} hrs)
                        </p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-[#FFFFFF]">
                        GH₵ {b.amountGHS.toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        {/* Fulfillment pipeline checkboxes */}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/50 hover:text-white">
                            <input
                              type="checkbox"
                              checked={b.isPaid}
                              onChange={() => handleToggleLogisticsField(b, "isPaid")}
                              className="accent-emerald-500 rounded"
                            />
                            Paid
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/50 hover:text-white">
                            <input
                              type="checkbox"
                              checked={b.isPacked}
                              onChange={() => handleToggleLogisticsField(b, "isPacked")}
                              className="accent-emerald-500 rounded"
                            />
                            Reviewed
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-white/50 hover:text-white">
                            <input
                              type="checkbox"
                              checked={b.isDelivered}
                              onChange={() => handleToggleLogisticsField(b, "isDelivered")}
                              className="accent-emerald-500 rounded"
                            />
                            Granted
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => openInspection(b)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/5 rounded-md text-[10px] font-semibold"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => setReceiptBooking(b)}
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[#FFFFFF] border border-white/5 rounded-md text-[10px] font-semibold"
                          >
                            Slip
                          </button>
                          {b.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-md text-[10px] font-semibold"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/30 text-xs">
                    No bookings found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/5 bg-white/[0.01]">
            <p className="text-[10px] text-white/40">
              Showing page {page} of {data.pages} ({data.total} total)
            </p>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-white/5 border border-white/8 rounded-lg text-xs font-semibold hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white/5 border border-white/8 rounded-lg text-xs font-semibold hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Inspector Drawer / Modal */}
      {inspectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0F0F0F]/95 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h3 className="text-xs font-bold tracking-widest text-[#FFFFFF] uppercase">Session Details</h3>
                <p className="text-[9px] text-white/30 font-mono mt-0.5">{inspectedBooking.id}</p>
              </div>
              <button
                onClick={() => setInspectedBooking(null)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                ✖
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.01] p-4 rounded-xl border border-white/5">
                <div>
                  <span className="block text-[9px] text-white/35 uppercase tracking-wider mb-1 font-bold">Client</span>
                  <p className="text-white text-sm font-semibold">{inspectedBooking.customerName}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">{inspectedBooking.customerEmail}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">{inspectedBooking.customerPhone}</p>
                </div>
                <div>
                  <span className="block text-[9px] text-white/35 uppercase tracking-wider mb-1 font-bold">Schedule</span>
                  <p className="text-white text-sm font-semibold">
                    {(() => {
                      const d = inspectedBooking.sessionDate.slice(0, 10)
                      const [yr, mo, dy] = d.split("-").map(Number)
                      return new Date(yr, mo - 1, dy).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    })()}
                  </p>
                  <p className="text-white/50 text-[10px] mt-0.5">{inspectedBooking.startTime} - {inspectedBooking.endTime}</p>
                  <p className="text-white/50 text-[10px] mt-0.5">({inspectedBooking.durationHours} hours)</p>
                </div>
                <div>
                  <span className="block text-[9px] text-white/35 uppercase tracking-wider mb-1 font-bold">Payment</span>
                  <p className="text-[#FFFFFF] text-base font-bold">GH₵ {inspectedBooking.amountGHS.toFixed(2)}</p>
                  <div className="mt-1"><StatusBadge status={inspectedBooking.status} /></div>
                </div>
              </div>

              {/* Delivery / Session controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="block text-[9px] text-white/40 uppercase tracking-widest font-bold">Est. Session / Delivery Time</span>
                  <input
                    type="text"
                    value={editEstDeliveryTime}
                    onChange={(e) => setEditEstDeliveryTime(e.target.value)}
                    placeholder="e.g. Next Tuesday at 2:00 PM"
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-[9px] text-white/40 uppercase tracking-widest font-bold">Internal Admin Notes</span>
                  <textarea
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    placeholder="Internal logistics comments..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFFFFF] resize-none"
                  />
                </div>
              </div>

              {/* System status details */}
              <div className="grid grid-cols-1 gap-4 border-t border-white/5 pt-4">
                {/* Booking status */}
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider">System Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                  >
                    <option className="bg-[#111]" value="CONFIRMED">Confirmed</option>
                    <option className="bg-[#111]" value="CANCELLED">Cancelled</option>
                    <option className="bg-[#111]" value="REFUNDED">Refunded</option>
                    <option className="bg-[#111]" value="FAILED">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
              <button
                onClick={() => handleSendWhatsapp(inspectedBooking)}
                disabled={sendingWhatsapp}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold rounded-xl transition-all uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
              >
                Send WhatsApp
              </button>
              <button
                onClick={handleUpdateStatuses}
                disabled={isUpdating}
                className="px-5 py-2 bg-[#FFFFFF] hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50 uppercase tracking-wider"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setInspectedBooking(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/8 text-xs font-semibold rounded-xl transition-all uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Booking Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Register Manual Booking</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleCreateManualBooking}>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-white/50 uppercase tracking-wide">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={manualForm.customerName}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, customerName: e.target.value }))}
                      placeholder="e.g. Kofi Mensah"
                      className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-white/50 uppercase tracking-wide">Customer Email *</label>
                    <input
                      type="email"
                      required
                      value={manualForm.customerEmail}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                      placeholder="e.g. kofi@gmail.com"
                      className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-white/50 uppercase tracking-wide">Customer Phone *</label>
                    <input
                      type="text"
                      required
                      value={manualForm.customerPhone}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="e.g. 0244123456"
                      className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>
                </div>

                <hr className="border-white/8" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-white/50 uppercase tracking-wide">Session Date *</label>
                    <input
                      type="date"
                      required
                      value={manualForm.sessionDate}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, sessionDate: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-white/50 uppercase tracking-wide">Start Time *</label>
                    <select
                      value={manualForm.startTime}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                    >
                      {TIME_SLOTS.map((t) => (
                        <option key={t} className="bg-[#111]" value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] text-white/50 uppercase tracking-wide">Duration (Hours) *</label>
                    <select
                      value={manualForm.durationHours}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, durationHours: Number(e.target.value) }))}
                      className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
                    >
                      <option className="bg-[#111]" value={2.5}>2.5 hours (Min)</option>
                      <option className="bg-[#111]" value={3}>3 hours</option>
                      <option className="bg-[#111]" value={4}>4 hours</option>
                      <option className="bg-[#111]" value={5}>5 hours</option>
                      <option className="bg-[#111]" value={6}>6 hours</option>
                      <option className="bg-[#111]" value={8}>8 hours</option>
                      <option className="bg-[#111]" value={10}>10 hours</option>
                      <option className="bg-[#111]" value={12}>12 hours (Max)</option>
                    </select>
                  </div>
                </div>

                <hr className="border-white/8" />

                <div className="space-y-2">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Add Equipment Options</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EQUIPMENT_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer select-none transition-all ${
                          manualForm.equipment.includes(opt.id)
                            ? "bg-[#FFFFFF]/5 border-[#FFFFFF]/45 text-[#FFFFFF]"
                            : "bg-white/5 border-white/8 text-white/60 hover:text-white/85"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={manualForm.equipment.includes(opt.id)}
                          onChange={() => handleEquipmentToggle(opt.id)}
                          className="accent-[#FFFFFF] w-3.5 h-3.5"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-semibold">{opt.label}</p>
                          <p className="text-[10px] text-white/40 mt-0.5">GH₵ {opt.priceGHS}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Session Notes</label>
                  <textarea
                    value={manualForm.notes}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Provide details of the manual booking..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#FFFFFF] resize-none"
                  />
                </div>

                <hr className="border-white/8" />

                <div className="bg-white/5 border border-white/8 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-white/85">Total Price</h4>
                    <p className="text-[9px] text-white/40 mt-0.5">Calculated based on session rates and equipment</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] text-white/40 uppercase tracking-wider">Amount (GH₵)</label>
                      <input
                        type="number"
                        min="0"
                        value={manualForm.amountGHS}
                        onChange={(e) =>
                          setManualForm((prev) => ({
                            ...prev,
                            amountGHS: Number(e.target.value),
                            isPriceOverridden: true,
                          }))
                        }
                        className="w-28 bg-white/10 border border-white/12 rounded-lg px-2 py-1.5 text-white font-bold text-xs focus:outline-none"
                      />
                    </div>
                    {manualForm.isPriceOverridden && (
                      <button
                        type="button"
                        onClick={() =>
                          setManualForm((prev) => ({
                            ...prev,
                            isPriceOverridden: false,
                          }))
                        }
                        className="text-[9px] text-[#FFFFFF] hover:underline font-semibold uppercase self-end mb-2"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-white/8 flex justify-end gap-3 bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-white/5 border border-white/8 text-white/70 hover:text-white text-xs font-semibold rounded-xl uppercase tracking-wider"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-xl text-black text-xs uppercase tracking-wider"
                  style={{ background: "linear-gradient(135deg, #E8C060 0%, #d4960e 100%)" }}
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Gate Verification Modal */}
      {showPasswordGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Secondary Password Gate</h3>
            <p className="text-xs text-white/45 mb-4 leading-relaxed">
              This is a critical operation (deleting/cancelling items). Please enter the admin password to verify.
            </p>
            <form onSubmit={handlePasswordGateSubmit} className="space-y-4">
              <input
                type="password"
                required
                value={gatePasswordInput}
                onChange={(e) => setGatePasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#FFFFFF]"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordGate(false)}
                  className="px-4 py-2 bg-white/5 text-white/70 hover:text-white text-xs font-semibold rounded-xl uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl uppercase tracking-wider"
                >
                  Verify Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Invoice Modal */}
      {receiptBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-black rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center print:hidden bg-gray-50">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Receipt Slips Preview</h3>
              <button
                onClick={() => setReceiptBooking(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✖ Close
              </button>
            </div>

            {/* Printable Area */}
            <div id="receipt-print-area" className="p-6 flex-1 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="text-center space-y-1 border-b border-dashed border-gray-300 pb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider">S&amp;G Entertainment</h2>
                <p className="text-[10px] text-gray-500">Accra, Taifa, Ghana</p>
                <p className="text-[10px] text-gray-500">Phone: 0244 922 500</p>
                <p className="text-[10px] text-gray-500">Info: sgentstudios@gmail.com</p>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>RECEIPT ID:</span>
                  <span className="font-bold">{receiptBooking.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(receiptBooking.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CLIENT:</span>
                  <span className="font-bold">{receiptBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>PHONE:</span>
                  <span>{receiptBooking.customerPhone}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-3">
                <p className="font-bold mb-1 uppercase text-[10px] tracking-wide">Booking Schedule</p>
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 text-[11px]">
                  <p>Date: <span className="font-semibold">{new Date(receiptBooking.sessionDate).toLocaleDateString()}</span></p>
                  <p>Time: <span className="font-semibold">{receiptBooking.startTime} - {receiptBooking.endTime}</span></p>
                  <p>Duration: <span className="font-semibold">{receiptBooking.durationHours} Hours</span></p>
                  <p>Studio: <span className="font-semibold">{receiptBooking.studio}</span></p>
                </div>
              </div>

              {receiptBooking.equipment.length > 0 && (
                <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-[11px]">
                  <p className="font-bold uppercase text-[10px] tracking-wide">Equipment Addons</p>
                  {receiptBooking.equipment.map(eq => {
                    const opt = EQUIPMENT_OPTIONS.find(o => o.id === eq)
                    return (
                      <div key={eq} className="flex justify-between pl-1">
                        <span>• {opt?.label ?? eq}</span>
                        <span>GHS {opt?.priceGHS ?? "0.00"}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="border-t-2 border-dashed border-gray-300 pt-3 text-[11px]">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>TOTAL GHS:</span>
                  <span>GH₵ {receiptBooking.amountGHS.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                  <span>Status:</span>
                  <span className="uppercase">{receiptBooking.status}</span>
                </div>
              </div>

              <div className="text-center pt-5 border-t border-dashed border-gray-200 mt-4 text-[9px] text-gray-400">
                <p>Thank you for recording with us!</p>
                <p>S&amp;G Studios — Record Your Vision</p>
              </div>
            </div>

            {/* Print Button */}
            <div className="p-4 border-t border-gray-100 print:hidden bg-gray-50 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-black text-white hover:bg-gray-800 text-xs font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L7.34 18m11.318 0h1.091M2.25 15h12.75m-12.75 0h.375m13.5 0h.375M2.25 19.5h12.75M2.25 19.5h.375m13.5 0h.375M2.25 6h12.75m-12.75 0h.375m13.5 0h.375M2.25 6a2.25 2.25 0 012.25-2.25h14.25a2.25 2.25 0 012.25 2.25v2.25M2.25 6h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.25m0-2.25h.375m13.5 0h.375M2.25 6v2.2" />
                </svg>
                Print Invoice
              </button>
              <button
                onClick={() => setReceiptBooking(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs font-bold rounded-xl uppercase tracking-wider"
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

export default function BookingsManagementPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-8 bg-white/10 rounded w-1/4 mb-4" />
        <div className="h-12 bg-white/5 rounded w-full mb-4" />
        <div className="h-64 bg-white/5 rounded w-full" />
      </div>
    }>
      <BookingsContent />
    </Suspense>
  )
}
