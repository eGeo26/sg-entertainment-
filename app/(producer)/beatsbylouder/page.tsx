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

type PendingAction = {
  type: "complete" | "remove"
  booking: ProducerBooking
} | null

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
  const [activeView, setActiveView] = useState<"assigned" | "completed" | "extended">("assigned")
  const [search, setSearch] = useState("")
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [confirming, setConfirming] = useState(false)

  // Extended sessions visibility
  const [extendedBookings, setExtendedBookings] = useState<any[]>([])
  const [loadingExtended, setLoadingExtended] = useState(false)

  const fetchExtendedBookings = async () => {
    setLoadingExtended(true)
    try {
      const res = await fetch("/api/producer/extended-bookings")
      if (res.status === 401) {
        setAuthenticated(false)
        return
      }
      if (!res.ok) throw new Error("Failed to load extended sessions")
      const data = await res.json()
      setExtendedBookings(data.bookings ?? [])
      setAuthenticated(true)
      setLastSynced(new Date())
    } catch (err) {
      console.error(err)
      toast.error("Failed to load extended sessions")
    } finally {
      setLoadingExtended(false)
    }
  }

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

  useEffect(() => {
    if (activeView === "extended") {
      fetchExtendedBookings()
    }
  }, [activeView])

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

  const handleRemoveCompleted = async (booking: ProducerBooking) => {
    setTogglingId(booking.id)
    try {
      const res = await fetch(`/api/producer/bookings/${booking.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove completed session")
      setBookings((prev) => prev.filter((item) => item.id !== booking.id))
      toast.success("Session removed from the producer portal")
    } catch (err) {
      console.error(err)
      toast.error("Failed to remove completed session")
    } finally {
      setTogglingId(null)
    }
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    setConfirming(true)
    try {
      if (pendingAction.type === "complete") {
        await handleToggleDone(pendingAction.booking)
      } else {
        await handleRemoveCompleted(pendingAction.booking)
      }
      setPendingAction(null)
    } finally {
      setConfirming(false)
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
    <div className="min-h-screen bg-[#08080c] text-[#F0EFE8] p-4 md:p-6 lg:p-8 relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_78%_0%,rgba(197,168,128,0.10),transparent_42%)]" />
      <div className="max-w-6xl mx-auto space-y-6 relative pb-4">

        {/* Expanded identity appears once, above the sticky controls. */}
        <section className="pt-1 pb-2">
          <p className="mb-2 text-[9px] tracking-[0.2em] uppercase font-bold text-[var(--sg-gold)]">
            Producer Portal · Beats By Louder
          </p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-[0.16em] text-white uppercase">
            {activeView === "assigned" ? "Assigned Sessions" : "Completed Sessions"}
          </h1>
          <p className="text-xs text-white/40 mt-2">
            {activeView === "assigned" ? "Sessions assigned to you." : "Finished sessions."}
          </p>
        </section>

        {/* One unified inbox-style control bar. */}
        <div className="sticky top-0 z-40 w-full max-w-full border-b border-white/[0.08] bg-[#08080c] shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex w-full max-w-full flex-wrap items-center gap-2 px-2 py-2 lg:min-h-14 lg:flex-nowrap">
            <nav className="grid h-9 w-full min-w-0 grid-cols-3 items-center rounded-lg border border-white/[0.07] bg-white/[0.025] p-0.5 sm:w-auto sm:shrink-0" aria-label="Producer session views">
              {(["assigned", "completed", "extended"] as const).map((view) => {
                const count = view === "assigned" ? assignedBookings.length : view === "completed" ? completedBookings.length : extendedBookings.length
                const selected = activeView === view
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`h-8 rounded-md px-2 sm:px-3 text-[10px] font-semibold transition-all sm:text-[11px] ${
                      selected ? "bg-white/[0.1] text-white shadow-sm" : "text-white/40 hover:text-white/75"
                    }`}
                    aria-pressed={selected}
                  >
                    <span>{view === "assigned" ? "Assigned" : view === "completed" ? "Completed" : "Extended"}</span>
                    <span className="ml-1 text-white/25">{count}</span>
                  </button>
                )
              })}
            </nav>

            <label className="relative w-full min-w-0 sm:min-w-[12rem] sm:flex-1">
              <span className="sr-only">Search sessions by client</span>
              <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.35-5.4a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="h-9 w-full min-w-0 rounded-lg border border-white/[0.07] bg-white/[0.025] pl-8 pr-2 text-xs text-white placeholder:text-white/25 focus:border-[var(--sg-gold)]/45 focus:outline-none"
              />
            </label>

            <div className="grid w-full min-w-0 grid-cols-3 items-center gap-1 lg:flex lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={fetchBookings}
                disabled={loading}
                className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-white/[0.07] px-2 text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-40 sm:gap-1.5 sm:px-2.5"
                title={lastSynced ? `Last synced ${lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Refresh sessions"}
                aria-label="Refresh sessions"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={loading ? "animate-spin" : ""} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span className="text-[9px] font-semibold sm:text-[11px]">Refresh</span>
              </button>
              <Link
                href="/beatsbylouder/settings"
                className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-white/[0.07] px-2 text-[var(--sg-gold)] transition-colors hover:bg-white/[0.05] sm:gap-1.5 sm:px-2.5"
                title="Account settings"
                aria-label="Account settings"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.244c.275.476.174 1.079-.24 1.438l-.977.85a1.125 1.125 0 00-.38 1.058c.005.085.008.17.008.255 0 .086-.003.171-.008.255-.023.379.123.75.38 1.058l.977.85c.414.36.515.962.24 1.438l-1.296 2.244a1.125 1.125 0 01-1.37.49l-1.217-.456a1.125 1.125 0 00-1.075.124 6.47 6.47 0 01-.22.127 1.125 1.125 0 00-.645.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.592c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 00-.645-.87 6.52 6.52 0 01-.22-.127 1.125 1.125 0 00-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49L3.566 15.78a1.125 1.125 0 01.24-1.438l.977-.85c.286-.249.408-.63.38-1.058A4.2 4.2 0 015.155 12c0-.086.003-.171.008-.255a1.125 1.125 0 00-.38-1.058l-.977-.85a1.125 1.125 0 01-.24-1.438l1.296-2.244a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.075-.124.072-.044.146-.086.22-.127.332-.184.582-.496.645-.87l.213-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] font-semibold sm:text-[11px]">Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-white/[0.07] px-2 text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white sm:gap-1.5 sm:px-2.5"
                title="Sign out"
                aria-label="Sign out"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span className="text-[9px] font-semibold sm:text-[11px]">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {activeView === "assigned" && (
          <p className="-mt-3 text-[11px] text-white/40">
            These sessions are waiting on you—mark each one Done once you&apos;ve delivered the work.
          </p>
        )}
        {activeView === "extended" && (
          <p className="-mt-3 text-[11px] text-amber-300/80">
            These sessions have been extended beyond standard packages. Review the breakdown details below.
          </p>
        )}

        {loading && bookings.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--sg-gold)] border-t-transparent rounded-full mx-auto" />
            <p className="text-white/40 text-xs tracking-wider uppercase">Loading sessions...</p>
          </div>
        ) : activeView === "extended" ? (
          loadingExtended ? (
            <div className="py-24 text-center space-y-3">
              <div className="animate-spin h-6 w-6 border-2 border-amber-400/50 border-t-transparent rounded-full mx-auto" />
              <p className="text-white/40 text-xs tracking-wider uppercase">Loading extended sessions...</p>
            </div>
          ) : extendedBookings.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] px-6 py-12 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(197,168,128,0.055),transparent_34%)]" />
              <div className="relative max-w-sm text-center">
                <div className="relative mx-auto mb-5 h-20 w-20">
                  <div className="absolute inset-0 rounded-full border border-amber-500/20" />
                  <div className="absolute inset-2.5 rounded-full border border-dashed border-white/10" />
                  <div className="absolute inset-5 rounded-full bg-amber-500/[0.09] border border-amber-500/20 flex items-center justify-center text-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
                    <svg width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white/80">No extended sessions shared</h3>
                <p className="mt-2 text-xs text-white/35 font-medium leading-relaxed">Extended sessions shared by the admin will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extendedBookings.map((b) => (
                <ExtendedBookingCard
                  key={b.id}
                  booking={b}
                />
              ))}
            </div>
          )
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
                  <span className={`h-2 w-2 rounded-full ${activeView === "assigned" ? "animate-pulse bg-[var(--sg-gold)]" : "bg-emerald-400/50"}`} />
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${activeView === "assigned" ? "text-[var(--sg-gold)]" : "text-emerald-300/55"}`}>
                    {activeView === "assigned" ? "Next 7 Days" : "Recent"} ({within7DaysBookings.length})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {within7DaysBookings.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      formatDate={formatDate}
                      onToggle={(booking) => booking.producerMarkedDone ? handleToggleDone(booking) : setPendingAction({ type: "complete", booking })}
                      onRemove={(booking) => setPendingAction({ type: "remove", booking })}
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
                      onToggle={(booking) => booking.producerMarkedDone ? handleToggleDone(booking) : setPendingAction({ type: "complete", booking })}
                      onRemove={(booking) => setPendingAction({ type: "remove", booking })}
                      onPrint={printSessionSheet}
                      toggling={togglingId === b.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {pendingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !confirming && setPendingAction(null)}>
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111117] p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="producer-confirm-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--sg-gold)]">
                {pendingAction.type === "complete" ? "Complete session" : "Remove session"}
              </p>
              <h2 id="producer-confirm-title" className="mt-2 text-base font-semibold text-white">
                {pendingAction.type === "complete"
                  ? "Mark this session as done?"
                  : "Remove this completed session?"}
              </h2>
              <p className="mt-2 text-xs leading-5 text-white/45">
                {pendingAction.type === "complete"
                  ? `${pendingAction.booking.customerName} will move to Completed.`
                  : "It will leave the producer portal, but remain in the studio’s booking history."}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAction(null)}
                  disabled={confirming}
                  className="h-10 rounded-xl border border-white/10 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPendingAction}
                  disabled={confirming}
                  className={`h-10 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ${pendingAction.type === "complete" ? "bg-[var(--sg-gold)] text-black hover:brightness-110" : "border border-red-400/25 bg-red-400/10 text-red-200 hover:bg-red-400/15"}`}
                >
                  {confirming ? "Working…" : pendingAction.type === "complete" ? "Mark Done" : "Remove"}
                </button>
              </div>
            </div>
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
  onRemove,
  onPrint,
  toggling,
  highlight = false,
}: {
  booking: ProducerBooking
  formatDate: (d: string) => string
  onToggle: (b: ProducerBooking) => void
  onRemove: (b: ProducerBooking) => void
  onPrint: (b: ProducerBooking, formattedDate: string) => void
  toggling: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={`border rounded-2xl p-5 space-y-4 transition-all duration-200 ${
        booking.producerMarkedDone
          ? "border-emerald-400/15 bg-emerald-400/[0.018] opacity-[0.82] hover:opacity-100 hover:bg-emerald-400/[0.03]"
          : highlight
          ? "border-[var(--sg-gold)]/30 bg-white/[0.025] shadow-[0_0_25px_rgba(197,168,128,0.04)] hover:bg-white/[0.04]"
          : "border-white/10 bg-white/[0.025] hover:bg-white/[0.04]"
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
          <h3 className="mt-1 flex items-center gap-1.5 text-base font-bold text-[#F0EFE8]">
            {booking.producerMarkedDone && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300/70" aria-label="Completed">
                <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                </svg>
              </span>
            )}
            <span>{booking.customerName}</span>
          </h3>
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

      {booking.producerMarkedDone && (
        <button
          type="button"
          onClick={() => onRemove(booking)}
          disabled={toggling}
          className="w-full rounded-xl border border-red-400/15 bg-red-400/[0.035] px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-red-200/55 transition-colors hover:border-red-400/25 hover:bg-red-400/[0.07] hover:text-red-100 disabled:opacity-40"
        >
          Remove from portal
        </button>
      )}
    </div>
  )
}

function ExtendedBookingCard({ booking }: { booking: any }) {
  // Simple month/day date formatter
  const formatDateStr = (dateStr: string) => {
    try {
      const [yr, mo, dy] = dateStr.slice(0, 10).split("-").map(Number)
      return new Date(yr, mo - 1, dy).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return dateStr
    }
  }

  // Simple 12h time formatter
  const formatTimeStr = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(":").map(Number)
      const d = new Date()
      d.setHours(hours, minutes, 0, 0)
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    } catch {
      return timeStr
    }
  }

  return (
    <div className="border border-amber-500/25 bg-white/[0.025] rounded-2xl p-5 space-y-4 shadow-[0_0_25px_rgba(245,158,11,0.02)] hover:bg-white/[0.04] transition-all duration-200">
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-semibold">
              #{booking.bookingCode}
            </span>
            <span className="text-white/20 text-[10px]">•</span>
            <span className="bg-amber-500/10 text-amber-300 text-[8px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
              Extended Session
            </span>
          </div>
          <h3 className="mt-1.5 text-base font-bold text-[#F0EFE8]">
            {booking.customerName}
          </h3>
          <p className="text-xs text-[#F0EFE8]/60 font-mono mt-0.5">{booking.customerPhone} · {booking.customerEmail}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[9px] text-white/30 block uppercase tracking-wider">Total Duration</span>
          <span className="text-white font-bold text-xs">{booking.totalDurationHours} hrs</span>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            Session Schedule
          </span>
          <span className="text-[#F0EFE8] font-semibold block mt-1">
            {formatDateStr(booking.sessionDate)}
          </span>
          <span className="text-[#F0EFE8]/60 text-[11px] block mt-0.5 font-mono">
            {formatTimeStr(booking.startTime)} – {formatTimeStr(booking.endTime)}
          </span>
        </div>

        <div>
          <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            Duration Breakdown
          </span>
          <div className="mt-1.5 space-y-0.5 text-[#F0EFE8]/70">
            <div className="flex justify-between">
              <span>Base Session:</span>
              <span className="font-medium">{booking.baseDurationHours}h</span>
            </div>
            <div className="flex justify-between text-amber-300">
              <span>Added Extension:</span>
              <span className="font-bold">+{booking.extensionHours}h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* Payment Details */}
      <div className="bg-white/5 p-3 rounded-xl border border-white/8 space-y-1.5 text-xs text-[#F0EFE8]/70">
        <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
          Payment Breakdown
        </span>
        <div className="flex justify-between">
          <span>Base Fee:</span>
          <span>GHS {booking.baseAmountGHS.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-amber-300">
          <span>Extension Fee:</span>
          <span>GHS {booking.extensionAmountGHS.toFixed(2)}</span>
        </div>
        <div className="pt-1.5 border-t border-white/5 flex justify-between font-bold text-white">
          <span>Total Received:</span>
          <span>GHS {booking.totalAmountGHS.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer Note */}
      {booking.notes && (
        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl text-xs space-y-1">
          <span className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            Customer Specifications / Notes
          </span>
          <p className="text-white/70 leading-relaxed italic">"{booking.notes}"</p>
        </div>
      )}

      {booking.sentToProducerAt && (
        <div className="text-[9px] text-white/35 text-right font-medium">
          Sent by Admin: {new Date(booking.sentToProducerAt).toLocaleDateString()} at {new Date(booking.sentToProducerAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}

