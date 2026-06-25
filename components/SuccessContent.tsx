"use client"
// components/SuccessContent.tsx

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

interface BookingData {
  id: string
  bookingCode: string
  customerName: string
  customerPhone: string
  customerEmail: string
  displayDate: string
  displayStartTime: string
  displayEndTime: string
  durationHours: number
  studio: string
  equipment: string[]
  amountGHS: number
  status: string
  paystackReference: string
  latestMessage: {
    text: string
    timestamp: string
  } | null
  statusConfirmed?: boolean
  statusConfirmedAt?: string
  statusReviewed?: boolean
  statusReviewedAt?: string
}

type LoadState = "loading" | "success" | "not-found" | "network-error" | "server-error"

export default function SuccessContent() {
  const params = useSearchParams()
  const bookingId = params.get("booking_id")
  const reference = params.get("reference")

  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)

  useEffect(() => {
    // Clear booking ID from URL after 5 minutes so next visitor doesn't see it
    const clearTimer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/') 
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearTimeout(clearTimer)
  }, [])

  useEffect(() => {
    if (!bookingId) {
      setLoadState("not-found")
      return
    }

    let cancelled = false

    const classify = (res: Response): LoadState => {
      if (res.status === 404) return "not-found"
      if (res.status >= 500) return "server-error"
      return "network-error"
    }

    const fetchBooking = async (isPoll = false) => {
      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, { cache: "no-store" })
        if (!res.ok) {
          if (!cancelled && !isPoll) setLoadState(classify(res))
          if (!cancelled && isPoll) setPollError("Live updates are temporarily unavailable. The details shown may be stale.")
          return
        }
        const data = await res.json()
        if (cancelled) return
        setBooking(data)
        setLastUpdated(new Date())
        setLoadState("success")
        setPollError(null)
      } catch {
        if (cancelled) return
        if (isPoll) {
          setPollError("Couldn't connect for live updates. We'll keep trying automatically.")
        } else {
          setLoadState("network-error")
        }
      }
    }

    fetchBooking()
    const interval = setInterval(() => fetchBooking(true), 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [bookingId])

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  if (loadState === "loading") {
    return <SuccessSkeleton />
  }

  if (loadState !== "success" || !booking) {
    return (
      <div className="max-w-md w-full text-center">
        <div className={`card backdrop-blur-sm ${loadState === "server-error" ? "bg-red-500/10 border-red-500/25" : loadState === "network-error" ? "bg-amber-500/10 border-amber-500/25" : "bg-black/40"}`}>
          <div className="flex justify-center mb-4">
            <svg className="w-14 h-14 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {loadState === "not-found" ? "Booking Not Found" : loadState === "server-error" ? "Booking Server Error" : "Connection Problem"}
          </h1>
          <p className="text-white/50 text-sm mb-6">
            {loadState === "not-found"
              ? "We couldn't find that booking reference. If you paid, don't worry — we received it and will confirm shortly via WhatsApp and email."
              : loadState === "server-error"
              ? "The booking server had trouble loading your receipt. Please try again in a moment."
              : "We couldn't connect to the booking server. Please check your connection and try again."}
          </p>
          <p className="text-white/30 text-xs mb-6">Reference: {reference}</p>
          <Link href="/" className="btn-secondary text-sm py-2.5 px-5">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const isConfirmed = booking.status === "CONFIRMED"
  const shortRef = booking.bookingCode

  return (
    <div className="max-w-lg w-full">
      {/* Status header */}
      <div className="text-center mb-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isConfirmed ? "bg-green-400/15" : "bg-white/10"}`}>
          {isConfirmed ? (
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {isConfirmed ? "Booking Confirmed!" : "Payment Received"}
        </h1>
        <p className="text-white/50 text-sm">
          {isConfirmed
            ? "Your session is confirmed. Check your email and WhatsApp for full details."
            : "Your payment was received. Confirmation will arrive via email and WhatsApp shortly."}
        </p>
        {lastUpdated && (
          <div className="mt-3 text-center">
            <span className="text-[10px] text-white/30">Updated {getRelativeTime(lastUpdated)}</span>
          </div>
        )}
        {pollError && (
          <p className="mt-3 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            {pollError}
          </p>
        )}
      </div>

      {/* Booking card */}
      <div className="card bg-black/40 backdrop-blur-sm mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Booking Details</h2>
          <span className="bg-white/10 text-white text-xs font-semibold px-3 py-1 rounded-full">
            #{shortRef}
          </span>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-white font-semibold">{booking.displayDate}</p>
            <p className="text-white/80 text-sm mt-1">
              {booking.displayStartTime} – {booking.displayEndTime} · {booking.durationHours}h
            </p>
            <p className="text-white/50 text-sm">{booking.studio} · S&amp;G Entertainment, Accra</p>
          </div>

          <Row label="Guest name" value={booking.customerName || ""} />
          <Row label="Email" value={booking.customerEmail || ""} />
          <Row label="WhatsApp" value={booking.customerPhone || ""} />
          {booking.equipment && Array.isArray(booking.equipment) && booking.equipment.length > 0 && (
            <Row label="Equipment" value={booking.equipment.join(", ")} />
          )}
          <div className="pt-2 border-t border-white/8 flex justify-between items-center">
            <span className="text-white/50 text-sm">Total paid</span>
            <span className="font-bold text-lg text-white">
              GHS {(booking.amountGHS ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Admin message */}
      {booking.latestMessage && (
        <div className="card bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm mb-6 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Message from S&G Studios</p>
              <p className="text-white/90 text-sm leading-relaxed">{booking.latestMessage.text}</p>
              <p className="text-white/40 text-[10px] mt-2">
                {new Date(booking.latestMessage.timestamp).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What's next */}
      <div className="card bg-black/30 backdrop-blur-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-sm font-semibold text-white">What&apos;s next?</h3>
        </div>
        <div className="space-y-3">
          {[
            "You'll receive a confirmation via email and WhatsApp with all session details",
            "Arrive at S&G Entertainment, Accra, 10 minutes before your session",
            "Bring a valid ID",
            "For questions, call the studio directly on 0244 922 500",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-white/60 text-sm">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={`https://wa.me/${(process.env.NEXT_PUBLIC_STUDIO_PHONE || "").replace(/\s+/g, "").replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1 py-3 text-sm text-center flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp Studio
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary flex-1 py-3 text-sm flex items-center justify-center gap-2"
          id="btn-print-receipt"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Receipt
        </button>
        <Link href="/" className="btn-primary flex-1 py-3 text-sm text-center">
          Back to Home
        </Link>
      </div>
    </div>
  )
}

function SuccessSkeleton() {
  return (
    <div className="max-w-lg w-full" aria-label="Loading booking receipt">
      <div className="text-center mb-8">
        <div className="skeleton w-20 h-20 rounded-full mx-auto mb-4" />
        <div className="skeleton h-7 w-48 mx-auto mb-3" />
        <div className="skeleton h-4 w-80 max-w-full mx-auto" />
      </div>
      <div className="card bg-black/40 backdrop-blur-sm mb-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-6 w-28" />
        </div>
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-4 w-56" />
          <div className="skeleton h-4 w-44" />
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex justify-between gap-4">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/40 text-sm flex-shrink-0">{label}</span>
      <span className="text-white/70 text-sm text-right break-all">{value}</span>
    </div>
  )
}
