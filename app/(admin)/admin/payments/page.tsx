"use client"
// app/(admin)/admin/payments/page.tsx

import { useState, useEffect } from "react"
import { toast } from "sonner"
import StatusBadge from "../components/StatusBadge"

interface Payment {
  id: string
  bookingCode: string
  hubtelReference: string
  hubtelStatus: string
  customerName: string
  customerEmail: string
  customerPhone: string
  amountGHS: number
  status: string
  createdAt: string
  updatedAt: string
}

export default function PaymentsLedgerPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  // Refund modal states
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null)
  const [refundReason, setRefundReason] = useState("")
  const [isRefunding, setIsRefunding] = useState(false)

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/payments")
      if (!res.ok) throw new Error("Failed to load payments ledger")
      const data = await res.json()
      setPayments(data.payments)
    } catch (err) {
      console.error(err)
      toast.error("Could not load payments transactions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filteredPayments = payments.filter(
    (p) =>
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (p.hubtelReference && p.hubtelReference.toLowerCase().includes(search.toLowerCase())) ||
      p.customerEmail.toLowerCase().includes(search.toLowerCase())
  )

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundTarget) return

    setIsRefunding(true)
    try {
      const res = await fetch("/api/admin/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: refundTarget.bookingCode,
          reason: refundReason || "Admin requested refund",
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Hubtel refund failed")
      }

      toast.success("Refund processed successfully through Hubtel!")
      setRefundTarget(null)
      setRefundReason("")
      fetchPayments()
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : "Refund failed"
      toast.error(msg)
    } finally {
      setIsRefunding(false)
    }
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

  const truncateRef = (ref: string) => {
    if (!ref) return "None"
    if (ref.length <= 16) return ref
    return ref.slice(0, 16) + "..."
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toast.success(`Copied ID: ${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">Payments Ledger</h1>
        <p className="text-xs text-white/40 mt-1.5">
          Monitor Hubtel transaction flows, track invoice reference logs, and initiate customer refunds
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, email, or reference..."
            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-white/50"
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
      </div>

      {/* Ledger Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-bold tracking-wider text-white/40 uppercase bg-white/[0.01]">
                <th className="px-4 py-3">Transaction Details</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Booking Status</th>
                <th className="px-4 py-3">Transaction Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-4 bg-white/10 rounded w-2/3" />
                    </td>
                  </tr>
                ))
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.005] transition-colors text-xs">
                    <td className="px-4 py-3">
                      <div>
                        <p
                          className="font-semibold text-white/95 font-mono text-[10px] cursor-pointer hover:text-white transition-colors"
                          title={`Hubtel Reference: ${p.hubtelReference}\nClick to copy`}
                          onClick={() => {
                            navigator.clipboard.writeText(p.hubtelReference)
                            toast.success("Copied transaction reference!")
                          }}
                        >
                          {truncateRef(p.hubtelReference)}
                        </p>
                        <p
                          className="text-[10px] text-white/30 font-mono mt-0.5 cursor-pointer hover:text-white/60 transition-colors"
                          onClick={() => handleCopyId(p.bookingCode)}
                          title="Click to copy full Booking ID"
                        >
                          Booking: {p.bookingCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white/90">{p.customerName}</p>
                        <p className="text-[10px] text-white/40">{p.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">
                      GH₵ {p.amountGHS.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.hubtelStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatDate(p.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.hubtelStatus === "SUCCESS" && p.status !== "REFUNDED" ? (
                        <button
                          onClick={() => setRefundTarget(p)}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-md text-[10px] font-semibold transition-all"
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-[10px] text-white/20 italic select-none">No Actions</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-white/30 text-xs">
                    No transactions registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hubtel Refund Request Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0F0F0F]/90 border border-white/10 backdrop-blur-2xl rounded-2xl w-full max-w-md shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Confirm Transaction Refund</h3>
              <button
                onClick={() => setRefundTarget(null)}
                className="w-7 h-7 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRefund}>
              <div className="p-6 space-y-4">
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-xs text-red-400/90 leading-relaxed">
                  <strong>Warning:</strong> This will trigger an official refund through the Hubtel API for reference <strong>{refundTarget.hubtelReference}</strong>. This action is irreversible.
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-white/40 mb-0.5">Customer</span>
                    <span className="text-white/85 font-medium">{refundTarget.customerName}</span>
                  </div>
                  <div>
                    <span className="block text-white/40 mb-0.5">Amount to Refund</span>
                    <span className="text-white/85 font-semibold">GH₵ {refundTarget.amountGHS.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-[10px] text-white/50 uppercase tracking-wide">Refund Reason *</label>
                  <input
                    type="text"
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Double booking / customer cancellation"
                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-red-500/50"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2 bg-white/5 border border-white/5 text-white/70 hover:text-white hover:bg-white/10 text-xs font-semibold rounded-xl uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isRefunding ? "Processing Refund..." : "Approve Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
