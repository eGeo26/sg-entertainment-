"use client"
// components/ClosedDateBanner.tsx
// Shows a banner ONLY when today (Ghana time, Africa/Accra) is a closed date.
// Future closed dates are communicated via greyed-out calendar tiles \u2014 no banner needed.

import { useEffect, useState } from "react"
import { toGhanaDateString } from "@/lib/booking"

interface ClosedDate {
  id: string
  date: string
  note: string | null
}

export default function ClosedDateBanner() {
  const [todayClosure, setTodayClosure] = useState<ClosedDate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/closed-dates", { cache: "no-store" })
        if (!res.ok) return
        const { closedDates }: { closedDates: ClosedDate[] } = await res.json()

        // Only show the banner if TODAY (Ghana time) is in the closed list.
        // toGhanaDateString() is identical on client and server \u2014 both use Africa/Accra.
        const todayGhana = toGhanaDateString()
        const match = closedDates.find((cd) => cd.date === todayGhana) ?? null
        setTodayClosure(match)
      } catch {
        // Silently suppress \u2014 banner is non-critical
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  if (loading || !todayClosure) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="w-full px-4 py-3 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 backdrop-blur-sm mb-4"
    >
      {/* Icon */}
      <svg
        className="w-5 h-5 text-amber-400 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-300">Studio Closed Today</p>
        {todayClosure.note && (
          <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
            {todayClosure.note}
          </p>
        )}
        <p className="text-xs text-amber-200/50 mt-1">
          Bookings for today are unavailable. Please select a future date.
        </p>
      </div>
    </div>
  )
}
