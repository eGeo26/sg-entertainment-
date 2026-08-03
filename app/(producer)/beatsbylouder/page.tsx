"use client"
// app/(producer)/beatsbylouder/page.tsx

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import PasswordField from "./components/PasswordField"

interface ProducerBooking {
  id: string
  bookingCode: string
  customerName: string
  customerPhone: string
  sessionDate: string
  startTime: string
  endTime: string
  durationHours: number
  studio: string
  packageName: string
  packagePrice: number
  pushedToProducer: boolean
  producerMarkedDone: boolean
  createdAt: string
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function printSessionSheet(booking: ProducerBooking, formattedDate: string) {
  const printWindow = window.open("", "_blank", "width=760,height=900")
  if (!printWindow) {
    toast.error("Allow pop-ups to print the session sheet")
    return
  }

  printWindow.document.write(`<!doctype html><html><head><title>Session ${escapeHtml(booking.bookingCode)}</title><style>
    body{font-family:Arial,sans-serif;color:#171717;margin:48px;line-height:1.5}header{border-bottom:2px solid #171717;padding-bottom:20px;margin-bottom:28px}h1{font-size:28px;margin:4px 0}.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#6b5c46}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.item{border:1px solid #ddd;border-radius:10px;padding:16px}.label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#777}.value{font-size:15px;font-weight:700;margin-top:5px}.footer{margin-top:36px;padding-top:16px;border-top:1px solid #ddd;font-size:11px;color:#777}@media print{body{margin:24px}}
  </style></head><body><header><div class="eyebrow">S&amp;G Studios · Beats By Louder</div><h1>Production Session Sheet</h1><div>#${escapeHtml(booking.bookingCode)}</div></header><div class="grid">
    <div class="item"><div class="label">Client</div><div class="value">${escapeHtml(booking.customerName)}</div><div>${escapeHtml(booking.customerPhone)}</div></div>
    <div class="item"><div class="label">Schedule</div><div class="value">${escapeHtml(formattedDate)}</div><div>${escapeHtml(booking.startTime)} – ${escapeHtml(booking.endTime)} (${escapeHtml(booking.durationHours)}h)</div></div>
    <div class="item"><div class="label">Studio</div><div class="value">${escapeHtml(booking.studio || "Studio Session")}</div></div>
    <div class="item"><div class="label">Deliverable</div><div class="value">${escapeHtml(booking.packageName || "Add-On Package")}</div></div>
  </div><div class="footer">Prepared from the S&amp;G Studios Producer Portal.</div><script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
  printWindow.document.close()
}

export default function ProducerPortalPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [bookings, setBookings] = useState<ProducerBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<"assigned" | "completed">("assigned")
  const [search, setSearch] = useState("")
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/producer/bookings")
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      if (!res.ok) throw new Error("Failed to load producer portal data")
      const data = await res.json()
      setBookings(data.bookings ?? [])
      setAuthenticated(true)
      setLastSynced(new Date())
    } catch (err) {
      console.error(err)
      toast.error("Failed to load producer sessions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/producer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        toast.error("Invalid portal password")
        return
      }
      toast.success("Welcome to Beats By Louder")
      setAuthenticated(true)
      fetchBookings()
    } catch (err) {
      console.error(err)
      toast.error("Error signing in")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/producer/login", { method: "DELETE" })
    setAuthenticated(false)
    setPassword("")
  }

  const handleToggleDone = async (booking: ProducerBooking) => {
    setTogglingId(booking.id)
    try {
      const res = await fetch(`/api/producer/bookings/${booking.id}/done`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to update status")
      const data = await res.json()
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id ? { ...b, producerMarkedDone: data.producerMarkedDone } : b
        )
      )
      toast.success(
        data.producerMarkedDone ? "Session marked as Done" : "Session marked as Pending"
      )
    } catch (err) {
      console.error(err)
      toast.error("Failed to update session status")
    } finally {
      setTogglingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    const d = dateStr.slice(0, 10)
    const [yr, mo, dy] = d.split("-").map(Number)
    return new Date(yr, mo - 1, dy).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Calculate days remaining from today
  const isWithin7Days = (dateStr: string) => {
    if (!dateStr) return false
    const d = dateStr.slice(0, 10)
    const [yr, mo, dy] = d.split("-").map(Number)
    const sessionDate = new Date(yr, mo - 1, dy).getTime()
    const now = new Date().setHours(0, 0, 0, 0)
    const diffDays = (sessionDate - now) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 7
  }

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-[#09090f] text-[#F0EFE8] flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-[var(--sg-gold)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#09090f] text-[#F0EFE8] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Subtle background ambient light */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--sg-gold)]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
          
          {/* Header & Branding */}
          <div className="text-center space-y-3">
            <div>
              <p className="text-[10px] tracking-widest uppercase font-bold text-[var(--sg-gold)]">S&amp;G Studios</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#F0EFE8] mt-0.5">Beats By Louder</h1>
              <p className="text-xs text-[#F0EFE8]/50 mt-1">Producer verification</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <PasswordField
              id="producer-login-password"
              label="Portal access password"
              value={password}
              onChange={setPassword}
              placeholder="Enter producer password"
              autoFocus
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 rounded-xl text-xs uppercase tracking-wider font-bold shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? "Verifying Access..." : "Access Portal"}
            </button>
          </form>

          <div className="pt-2 text-center">
            <p className="text-[10px] text-[#F0EFE8]/30 tracking-wider uppercase">Authorized access only</p>
          </div>
        </div>
      </div>
    )
  }

  const assignedBookings = bookings.filter((b) => !b.producerMarkedDone)
  const completedBookings = bookings.filter((b) => b.producerMarkedDone)
  const normalizedSearch = search.trim().toLowerCase()
  const visibleBookings = (activeView === "assigned" ? assignedBookings : completedBookings).filter(
    (booking) => !normalizedSearch || booking.customerName.toLowerCase().includes(normalizedSearch)
  )
  const within7DaysBookings = visibleBookings.filter((b) => isWithin7Days(b.sessionDate))
  const furtherOutBookings = visibleBookings.filter((b) => !isWithin7Days(b.sessionDate))

  return (
    <div className="min-h-screen bg-[#08080c] text-[#F0EFE8] p-4 md:p-6 lg:p-8 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_78%_0%,rgba(197,168,128,0.10),transparent_42%)]" />
      <div className="max-w-6xl mx-auto space-y-6 relative pb-4">

        {/* Top Header */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 pb-5 border-b border-white/[0.08]">
          <div className="max-w-2xl">
            <p className="mb-2 text-[9px] tracking-[0.2em] uppercase font-bold text-[var(--sg-gold)]">
              Producer Portal · Beats By Louder
            </p>
            <h1 className="text-xl font-light tracking-[0.2em] text-white uppercase">
              {activeView === "assigned" ? "Assigned Sessions" : "Completed Sessions"}
            </h1>
            <p className="text-xs text-white/40 mt-1.5">
              {activeView === "assigned" ? "Sessions assigned to you." : "Finished sessions."}
            </p>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={fetchBookings}
                disabled={loading}
                className="h-9 px-3 rounded-lg border border-white/10 bg-white/[0.025] hover:bg-white/[0.07] text-[11px] font-semibold text-white/65 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Refresh sessions"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={loading ? "animate-spin" : ""}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
              <Link
                href="/beatsbylouder/settings"
                className="h-9 px-3 rounded-lg border border-[var(--sg-gold)]/30 bg-[var(--sg-gold)]/[0.08] hover:bg-[var(--sg-gold)]/[0.14] text-[11px] font-semibold text-[var(--sg-gold)] transition-colors flex items-center gap-1.5"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.244c.275.476.174 1.079-.24 1.438l-.977.85a1.125 1.125 0 00-.38 1.058c.005.085.008.17.008.255 0 .086-.003.171-.008.255-.023.379.123.75.38 1.058l.977.85c.414.36.515.962.24 1.438l-1.296 2.244a1.125 1.125 0 01-1.37.49l-1.217-.456a1.125 1.125 0 00-1.075.124 6.47 6.47 0 01-.22.127 1.125 1.125 0 00-.645.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.592c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 00-.645-.87 6.52 6.52 0 01-.22-.127 1.125 1.125 0 00-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49L3.566 15.78a1.125 1.125 0 01.24-1.438l.977-.85c.286-.249.408-.63.38-1.058A4.2 4.2 0 015.155 12c0-.086.003-.171.008-.255a1.125 1.125 0 00-.38-1.058l-.977-.85a1.125 1.125 0 01-.24-1.438l1.296-2.244a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.075-.124.072-.044.146-.086.22-.127.332-.184.582-.496.645-.87l.213-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Account Settings
              </Link>
              <button
                onClick={handleLogout}
                className="h-9 px-3 rounded-lg border border-white/10 bg-white/[0.025] hover:bg-white/[0.07] text-[11px] font-semibold text-white/65 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
            <p className="px-1 text-[9px] uppercase tracking-[0.14em] text-white/25">
              {lastSynced ? `Last synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not synced yet"}
            </p>
          </div>
        </header>

        <div className="grid gap-2 rounded-xl border border-white/[0.08] bg-white/[0.018] p-2 sm:grid-cols-[minmax(280px,0.9fr)_minmax(300px,1.1fr)] sm:items-center">
          <nav className="grid grid-cols-2 gap-1 rounded-xl bg-black/20 p-1" aria-label="Producer session views">
            {(["assigned", "completed"] as const).map((view) => {
              const count = view === "assigned" ? assignedBookings.length : completedBookings.length
              const selected = activeView === view
              return (
                <button
                  key={view}
                  type="button"
                  onClick={() => setActiveView(view)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold tracking-wide transition-all ${selected ? "bg-[var(--sg-gold)] text-black shadow-[0_6px_18px_rgba(197,168,128,0.16)]" : "text-white/45 hover:bg-white/5 hover:text-white/80"}`}
                  aria-pressed={selected}
                >
                  {view === "assigned" ? "Assigned" : "Completed"} <span className={selected ? "text-black/55" : "text-white/25"}>· {count}</span>
                </button>
              )
            })}
          </nav>

          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by client"
              className="w-full rounded-lg border border-white/[0.08] bg-black/20 py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--sg-gold)]/50 focus:bg-black/30 transition-colors"
            />
          </div>
        </div>

        {loading && bookings.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--sg-gold)] border-t-transparent rounded-full mx-auto" />
            <p className="text-white/40 text-xs tracking-wider uppercase">Loading sessions...</p>
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-6 py-12 flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(197,168,128,0.055),transparent_34%)]" />
            <div className="relative max-w-sm text-center">
              <div className="relative mx-auto mb-5 h-20 w-20">
                <div className="absolute inset-0 rounded-full border border-[var(--sg-gold)]/15" />
                <div className="absolute inset-2.5 rounded-full border border-dashed border-white/10" />
                <div className="absolute inset-5 rounded-full bg-[var(--sg-gold)]/[0.09] border border-[var(--sg-gold)]/20 flex items-center justify-center text-[var(--sg-gold)] shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                  <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l11-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="17" cy="16" r="3" />
                  </svg>
                </div>
                <span className="absolute right-1 top-3 h-2 w-2 rounded-full bg-[var(--sg-gold)]/55" />
                <span className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-white/25" />
              </div>
              <h3 className="text-sm font-semibold text-white/80">
                {activeView === "assigned" ? "Nothing assigned yet" : "Nothing completed yet"}
              </h3>
              <p className="mt-2 text-xs text-white/35">
                {activeView === "assigned"
                  ? "New sessions will appear here."
                  : "Completed sessions will appear here."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Upcoming <= 7 Days Section */}
            {within7DaysBookings.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <span className="w-2 h-2 rounded-full bg-[var(--sg-gold)] animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--sg-gold)]">
                    {activeView === "assigned" ? "Next 7 Days" : "Recent"} ({within7DaysBookings.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {within7DaysBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      formatDate={formatDate}
                      onToggle={handleToggleDone}
                      onPrint={printSessionSheet}
                      toggling={togglingId === b.id}
                      highlight
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Further Out Section */}
            {furtherOutBookings.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white/50">
                    {activeView === "assigned" ? "Later Sessions" : "Archive"} ({furtherOutBookings.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {furtherOutBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      formatDate={formatDate}
                      onToggle={handleToggleDone}
                      onPrint={printSessionSheet}
                      toggling={togglingId === b.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

function BookingCard({
  booking,
  formatDate,
  onToggle,
  onPrint,
  toggling,
  highlight = false,
}: {
  booking: ProducerBooking
  formatDate: (d: string) => string
  onToggle: (b: ProducerBooking) => void
  onPrint: (b: ProducerBooking, formattedDate: string) => void
  toggling: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`bg-white/[0.025] border rounded-2xl p-5 space-y-4 transition-all duration-200 hover:bg-white/[0.04] ${
        highlight
          ? "border-[var(--sg-gold)]/30 shadow-[0_0_25px_rgba(197,168,128,0.04)]"
          : "border-white/10"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-[var(--sg-gold)] uppercase font-semibold">
              #{booking.bookingCode}
            </span>
            <span className="text-white/20 text-[10px]">•</span>
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">
              {booking.studio || "Studio Session"}
            </span>
          </div>
          <h3 className="text-base font-bold text-[#F0EFE8] mt-1">{booking.customerName}</h3>
          <p className="text-xs text-[#F0EFE8]/60 font-mono mt-0.5">{booking.customerPhone}</p>
        </div>

        {/* Status Toggle Button */}
        <button
          onClick={() => onToggle(booking)}
          disabled={toggling}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            booking.producerMarkedDone
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
              : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10 hover:text-white"
          }`}
        >
          {booking.producerMarkedDone ? (
            <>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Done</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--sg-gold)]" />
              <span>Pending</span>
            </>
          )}
        </button>
      </div>

      <div className="h-px bg-white/5" />

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            Schedule
          </span>
          <span className="text-[#F0EFE8] font-semibold block mt-1">
            {formatDate(booking.sessionDate)}
          </span>
          <span className="text-[#F0EFE8]/60 text-[11px] block mt-0.5 font-mono">
            {booking.startTime} – {booking.endTime} ({booking.durationHours}h)
          </span>
        </div>

        <div>
          <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            Deliverable
          </span>
          <span className="text-[var(--sg-gold)] font-bold block mt-1">
            {booking.packageName || "Add-On Package"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPrint(booking, formatDate(booking.sessionDate))}
        className="w-full rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/55 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.75h10.5v4.5H6.75v-4.5zM6.75 15.75h10.5v4.5H6.75v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 17.25H4.5A2.25 2.25 0 012.25 15V10.5A2.25 2.25 0 014.5 8.25h15a2.25 2.25 0 012.25 2.25V15a2.25 2.25 0 01-2.25 2.25h-2.25" />
        </svg>
        Print Sheet
      </button>
    </div>
  )
}
