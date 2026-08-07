"use client"
// app/(admin)/prof-boss/closed-dates/page.tsx
// Admin UI: manually mark/unmark studio closed dates.
// Existing bookings on a newly-closed date are NOT auto-cancelled.
// Admin is shown a clickable badge linking to /prof-boss/bookings?from=<date>&to=<date>
// to handle rescheduling manually.

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { toGhanaDateString } from "@/lib/booking"

interface ClosedDateEntry {
  id: string
  date: string               // "YYYY-MM-DD"
  note: string | null
  created_at: string
  created_by: string | null
  existingBookingCount: number
}

function formatDisplayDate(dateStr: string): string {
  const [yr, mo, dy] = dateStr.split("-").map(Number)
  const d = new Date(yr, mo - 1, dy)
  return d.toLocaleDateString("en-GH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function ClosedDatesPage() {
  const [closedDates, setClosedDates] = useState<ClosedDateEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [removing, setRemoving]       = useState<string | null>(null) // date string being removed
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState<string | null>(null)

  // Form state
  const [newDate, setNewDate] = useState("")
  const [newNote, setNewNote] = useState("")

  const todayGhana = toGhanaDateString()

  const fetchClosedDates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/closed-dates")
      if (!res.ok) throw new Error("Failed to load closed dates")
      const { closedDates: data } = await res.json()
      setClosedDates(data ?? [])
    } catch (err: any) {
      setError(err.message ?? "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClosedDates()
  }, [fetchClosedDates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/admin/closed-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, note: newNote.trim() || null }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Failed to close date")
        return
      }

      setSuccess(`${formatDisplayDate(newDate)} has been marked as closed.`)
      setNewDate("")
      setNewNote("")
      fetchClosedDates()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (date: string) => {
    if (!confirm(`Remove closure for ${formatDisplayDate(date)}? The date will become bookable again.`)) return

    setRemoving(date)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/closed-dates/${date}`, { method: "DELETE" })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Failed to remove closure")
        return
      }

      setSuccess(`Closure for ${formatDisplayDate(date)} has been removed.`)
      fetchClosedDates()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setRemoving(null)
    }
  }

  // Split into upcoming vs past for display
  const upcoming = closedDates.filter((cd) => cd.date >= todayGhana)
  const past     = closedDates.filter((cd) => cd.date <  todayGhana)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white">Closed Dates</h1>
        <p className="text-sm text-white/45 mt-1">
          Mark specific dates as closed. The booking calendar will grey them out and
          the public cannot book. Existing confirmed bookings are not auto-cancelled —
          use the badge links to find and reschedule them manually.
        </p>
      </div>

      {/* Feedback messages */}
      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-300"
        >
          {success}
        </div>
      )}

      {/* ── Add a new closed date ── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 space-y-4"
      >
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Mark a Date as Closed</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date picker */}
          <div className="space-y-1.5">
            <label
              htmlFor="cd-date"
              className="block text-[10px] font-bold uppercase tracking-widest text-white/50"
            >
              Date <span className="text-red-400">*</span>
            </label>
            <input
              id="cd-date"
              type="date"
              required
              min={todayGhana}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40"
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="cd-note"
              className="block text-[10px] font-bold uppercase tracking-widest text-white/50"
            >
              Note <span className="text-white/30 font-normal normal-case">(optional)</span>
            </label>
            <input
              id="cd-note"
              type="text"
              placeholder="e.g. Closed — Workers' Day"
              maxLength={200}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/40 placeholder:text-white/25"
            />
          </div>
        </div>

        <button
          id="btn-mark-closed"
          type="submit"
          disabled={submitting || !newDate}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Mark as Closed"}
        </button>
      </form>

      {/* ── Upcoming closed dates ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">
          Upcoming Closures {upcoming.length > 0 && `(${upcoming.length})`}
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-white/30 italic py-4 text-center border border-white/5 rounded-xl">
            No upcoming closures scheduled.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((cd) => (
              <ClosedDateRow
                key={cd.id}
                cd={cd}
                isRemoving={removing === cd.date}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Past closed dates (collapsed) ── */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-white/25">
            Past Closures ({past.length})
          </h2>
          <ul className="space-y-2 opacity-50">
            {past.map((cd) => (
              <ClosedDateRow
                key={cd.id}
                cd={cd}
                isRemoving={removing === cd.date}
                onRemove={handleRemove}
                isPast
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ── Row component ────────────────────────────────────────────────────────────

function ClosedDateRow({
  cd,
  isRemoving,
  onRemove,
  isPast = false,
}: {
  cd: ClosedDateEntry
  isRemoving: boolean
  onRemove: (date: string) => void
  isPast?: boolean
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03]">
      {/* Date + note */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">
            {formatDisplayDate(cd.date)}
          </span>
          {!isPast && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider border border-amber-500/20">
              Closed
            </span>
          )}
        </div>

        {cd.note && (
          <p className="text-xs text-white/50 mt-0.5 truncate" title={cd.note}>
            {cd.note}
          </p>
        )}

        {/* Existing bookings badge — clickable link to filtered bookings page */}
        {cd.existingBookingCount > 0 && (
          <Link
            href={`/prof-boss/bookings?from=${cd.date}&to=${cd.date}`}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-300 hover:text-orange-200 transition-colors group"
            title={`View ${cd.existingBookingCount} existing booking(s) on this date`}
          >
            {/* Warning icon */}
            <svg
              className="w-3.5 h-3.5 text-orange-400 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {cd.existingBookingCount} existing booking{cd.existingBookingCount !== 1 ? "s" : ""} — reschedule manually
            <svg
              className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </Link>
        )}

        {/* Added by */}
        {cd.created_by && (
          <p className="text-[10px] text-white/25 mt-1">Added by {cd.created_by}</p>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(cd.date)}
        disabled={isRemoving}
        className="shrink-0 text-xs text-white/30 hover:text-red-400 transition-colors font-medium disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-red-500/10"
        aria-label={`Remove closure for ${cd.date}`}
      >
        {isRemoving ? "…" : "Remove"}
      </button>
    </li>
  )
}
