"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

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
  isPaid: boolean
  isPacked: boolean
  isDelivered: boolean
  createdAt?: string
  created_at?: string
  updated_at?: string
  statusReceived?: boolean
  statusReceivedAt?: string
  statusPayment?: boolean
  statusPaymentAt?: string
  statusReviewed?: boolean
  statusReviewedAt?: string
  statusConfirmed?: boolean
  statusConfirmedAt?: string
  latestMessage?: {
    text: string
    timestamp: string
  } | null
}

type FetchState = "idle" | "loading" | "success" | "not-found" | "network-error" | "server-error"


// Fixed stages for the progress stepper
const PROGRESS_STAGES = [
  { key: 'booking_received', label: 'Booking Received' },
  { key: 'payment_confirmed', label: 'Payment Confirmed' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'session_confirmed', label: 'Session Confirmed' },
] as const

export default function TrackBookingStatus() {
  const searchParams = useSearchParams()
  const [bookingId, setBookingId] = useState("")
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [fetchState, setFetchState] = useState<FetchState>("idle")
  const [searched, setSearched] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [pollError, setPollError] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loading = fetchState === "loading"

  const classifyFetchError = (res: Response): FetchState => {
    if (res.status === 404) return "not-found"
    if (res.status >= 500) return "server-error"
    return "network-error"
  }

  const fetchBooking = async (id: string, showToast = false) => {
    setFetchState("loading")
    setSearched(true)
    setBooking(null)
    setPollError(null)

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, { cache: "no-store" })
      if (!res.ok) {
        setFetchState(classifyFetchError(res))
        return null
      }

      const data = await res.json()
      setBooking(data)
      setLastUpdated(new Date())
      setFetchState("success")
      if (showToast) toast.success("Booking retrieved successfully")
      return data as BookingData
    } catch (err) {
      console.error(err)
      setFetchState("network-error")
      return null
    }
  }

  useEffect(() => {
    const idParam = searchParams.get("id")
    if (idParam) {
      const trimmed = idParam.trim()
      setBookingId(trimmed)

      fetchBooking(trimmed)
    }
  }, [searchParams])

  // Simple polling for booking updates (every 5000ms)
  useEffect(() => {
    const code = booking?.bookingCode || bookingId
    if (!code) return

    const pollBooking = async () => {
      if (!isMountedRef.current) return

      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(code)}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setBooking(data)
          setLastUpdated(new Date())
          setFetchState("success")
          setPollError(null)
        } else {
          setPollError("Live updates are temporarily unavailable. The last booking details shown may be stale.")
        }
      } catch (err) {
        console.error("[Customer Tracking] Polling error:", err)
        setPollError("Couldn't connect for live updates. We'll keep trying automatically.")
      }
    }

    // Initial poll after 1 second
    const initialPoll = setTimeout(pollBooking, 1000)

    // Set up recurring poll every 5 seconds
    pollingIntervalRef.current = setInterval(pollBooking, 5000)

    return () => {
      clearTimeout(initialPoll)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [booking?.bookingCode, bookingId])

  // Update relative timestamp every second
  useEffect(() => {
    if (!lastUpdated) return

    const interval = setInterval(() => {
      // This triggers a re-render to update the relative time display
      setLastUpdated(prev => prev)
    }, 1000)

    return () => clearInterval(interval)
  }, [lastUpdated])

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingId.trim()) {
      toast.error("Please enter a Booking ID")
      return
    }

    await fetchBooking(bookingId.trim(), true)
  }

  const handleCopyId = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.bookingCode)
      toast.success("Booking ID copied to clipboard!")
    }
  }

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  // Get timestamp for each stage from boolean columns
  const getStageTimestamp = (stageKey: string): string | null => {
    if (!booking) return null

    switch (stageKey) {
      case 'booking_received':
        // Step 1: status_received_at
        return booking.statusReceivedAt || booking.createdAt || booking.created_at || null
      case 'payment_confirmed':
        // Step 2: status_payment_at
        return booking.statusPaymentAt || null
      case 'reviewed':
        // Step 3: status_reviewed_at
        return booking.statusReviewedAt || null
      case 'session_confirmed':
        // Step 4: status_confirmed_at
        return booking.statusConfirmedAt || null
      default:
        return null
    }
  }

  // Check if a stage has been reached (boolean is true)
  const isStageReached = (stageKey: string): boolean => {
    if (!booking) return false

    switch (stageKey) {
      case 'booking_received':
        return booking.statusReceived === true
      case 'payment_confirmed':
        return booking.statusPayment === true
      case 'reviewed':
        return booking.statusReviewed === true
      case 'session_confirmed':
        return booking.statusConfirmed === true
      default:
        return false
    }
  }

  // Determine which stage is currently active (first unreached stage)
  const getActiveStageIndex = (): number => {
    for (let i = 0; i < PROGRESS_STAGES.length; i++) {
      if (!isStageReached(PROGRESS_STAGES[i].key)) {
        return i
      }
    }
    return PROGRESS_STAGES.length - 1 // All stages reached, last one is active
  }

  // Calculate progress line fill percentage
  const getProgressFillPercentage = (): number => {
    const completedCount = PROGRESS_STAGES.filter(stage => isStageReached(stage.key)).length
    if (completedCount <= 1) return 0
    return ((completedCount - 1) / (PROGRESS_STAGES.length - 1)) * 100
  }

  // Format timestamp as "20 Jun, 03:35 am"
  const formatStageTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const day = date.getDate()
    const month = date.toLocaleString('en-US', { month: 'short' })
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours % 12 || 12
    return `${day} ${month}, ${displayHours}:${minutes} ${ampm}`
  }

  return (
    <div className="space-y-6">
      {/* Tracking Form */}
      <form onSubmit={handleTrack} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-white/50 uppercase tracking-widest font-bold mb-2">
              Booking Tracking ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                placeholder="Enter booking reference (e.g. 5a1b3c9f...)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#C5A880] transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#C5A880] hover:bg-[#b0936b] text-black font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Tracking...
                  </>
                ) : (
                  "Track Status"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Result state */}
      {loading && (
        <BookingLookupSkeleton />
      )}

      {booking && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6">
          
          {/* Header & Copy block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#C5A880" }}>Booking Details</p>
                <div className="mt-1 flex items-center gap-2.5">
                  <span className="font-mono text-sm font-semibold" style={{ color: "#C5A880" }}>
                    {booking.bookingCode}
                  </span>
                </div>
              </div>
              {lastUpdated && (
                <span className="text-[9px] text-white/30">
                  Updated {getRelativeTime(lastUpdated)}
                </span>
              )}
            </div>
            {pollError && (
              <div className="text-[10px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                {pollError}
              </div>
            )}
            <button
              onClick={handleCopyId}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
              </svg>
              Copy ID
            </button>
          </div>

          {booking.latestMessage && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-2">Message from S&amp;G Studios</p>
              <p className="text-white/85 text-sm leading-relaxed">{booking.latestMessage.text}</p>
              <p className="text-white/35 text-[10px] mt-2">
                {formatStageTimestamp(booking.latestMessage.timestamp)}
              </p>
            </div>
          )}

          {/* Session Progress — 4-stage stepper based on booking_status_history */}
          <div className="py-2">
            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-6 text-center" style={{ color: "#C5A880" }}>Session Progress</h4>

            {/* Mobile: vertical stack */}
            <div className="flex flex-col gap-3 md:hidden">
              {PROGRESS_STAGES.map((stage, index) => {
                const isReached = isStageReached(stage.key)
                const timestamp = getStageTimestamp(stage.key)
                const activeStageIndex = getActiveStageIndex()
                const isActive = index === activeStageIndex

                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    {/* Circle */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 select-none"
                      style={
                        isReached
                          ? { background: "#C5A880", color: "#000" }
                          : isActive
                          ? { background: "#0c0c0e", border: "2px solid #C5A880", color: "#C5A880" }
                          : { background: "#0c0c0e", border: "2px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.3)" }
                      }
                    >
                      {isReached ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : index + 1}
                    </div>

                    {/* Label + timestamp */}
                    <div className="flex flex-col">
                      <span
                        className="text-xs font-semibold leading-tight transition-colors duration-200"
                        style={{
                          color: isReached
                            ? "#C5A880"
                            : isActive
                            ? "#C5A880"
                            : "rgba(255,255,255,0.3)"
                        }}
                      >
                        {stage.label}
                      </span>
                      {isReached && timestamp && (
                        <span className="text-[9px] font-medium mt-0.5 text-[#C5A880]/85">
                          {formatStageTimestamp(timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: horizontal stepper */}
            <div className="relative hidden md:block">
              {/* Background connector line */}
              <div 
                className="absolute top-[16px] h-[1px] bg-white/10 -z-0 transition-all duration-300"
                style={{ left: "12.5%", right: "12.5%" }}
              />
              {/* Filled connector line */}
              <div 
                className="absolute top-[16px] h-[1px] bg-[#C5A880] -z-0 transition-all duration-300"
                style={{ 
                  left: "12.5%", 
                  width: `${(getActiveStageIndex() / (PROGRESS_STAGES.length - 1)) * 75}%` 
                }}
              />

              <div className="flex justify-between items-start w-full relative z-10">
                {PROGRESS_STAGES.map((stage, index) => {
                  const isReached = isStageReached(stage.key)
                  const timestamp = getStageTimestamp(stage.key)
                  const activeStageIndex = getActiveStageIndex()
                  const isActive = index === activeStageIndex

                  return (
                    <div key={stage.key} className="flex flex-col items-center flex-1 text-center px-1">
                      {/* Circle */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 select-none"
                        style={
                          isReached
                            ? { background: "#C5A880", color: "#000" }
                            : isActive
                            ? { background: "#0c0c0e", border: "2px solid #C5A880", color: "#C5A880" }
                            : { background: "#0c0c0e", border: "2px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.3)" }
                        }
                      >
                        {isReached ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : index + 1}
                      </div>

                      {/* Label */}
                      <span
                        className="text-xs font-semibold mt-2.5 leading-tight transition-colors duration-200"
                        style={{
                          color: isReached
                            ? "#C5A880"
                            : isActive
                            ? "#C5A880"
                            : "rgba(255,255,255,0.3)"
                        }}
                      >
                        {stage.label}
                      </span>

                      {/* Timestamp underneath for completed steps */}
                      {isReached && timestamp ? (
                        <span
                          className="text-[9px] font-medium mt-1 leading-normal text-[#C5A880]/85 max-w-[100px]"
                        >
                          {formatStageTimestamp(timestamp)}
                        </span>
                      ) : (
                        // Placeholder to balance layout heights
                        <span className="text-[9px] font-medium mt-1 leading-normal opacity-0 select-none pointer-events-none">
                          -
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Session Overview Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
            <div>
              <span className="block text-white/40 mb-0.5">Guest Name</span>
              <span className="text-white font-medium">{booking.customerName}</span>
            </div>
            <div>
              <span className="block text-white/40 mb-0.5">Studio Room</span>
              <span className="text-white font-medium">{booking.studio}</span>
            </div>
            <div>
              <span className="block text-white/40 mb-0.5">Date &amp; Time Slot</span>
              <span className="text-white font-medium">
                {booking.displayDate} · {booking.displayStartTime} – {booking.displayEndTime} ({booking.durationHours} hr{booking.durationHours !== 1 ? "s" : ""})
              </span>
            </div>
            <div>
              <span className="block text-white/40 mb-0.5">Amount Paid</span>
              <span className="text-white font-semibold">GH₵ {booking.amountGHS.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty / Not found states */}
      {searched && !loading && !booking && fetchState !== "idle" && (
        <TrackingErrorState state={fetchState} />
      )}
    </div>
  )
}

function BookingLookupSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6" aria-label="Loading booking details">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-2">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-4 w-36" />
        </div>
        <div className="skeleton h-8 w-24" />
      </div>
      <div className="py-2">
        <div className="skeleton h-3 w-32 mx-auto mb-5" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center flex-1 last:flex-none">
              <div className="skeleton w-8 h-8 rounded-full" />
              {index < 3 && <div className="skeleton flex-1 h-0.5 mx-2" />}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-3 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  )
}

function TrackingErrorState({ state }: { state: FetchState }) {
  const copy = {
    "not-found": {
      title: "Booking Not Found",
      body: "No active booking matches that reference. Please double check the code on your receipt or confirmation link.",
      tone: "text-white/60 border-white/10 bg-white/5",
    },
    "network-error": {
      title: "Connection Problem",
      body: "We couldn't connect to the booking server. Please check your connection and try again.",
      tone: "text-amber-100 border-amber-500/25 bg-amber-500/10",
    },
    "server-error": {
      title: "Booking Server Error",
      body: "The booking server had trouble loading this request. Please try again in a moment.",
      tone: "text-red-100 border-red-500/25 bg-red-500/10",
    },
    "idle": {
      title: "Enter a Booking Reference",
      body: "Use your booking reference to view the latest session status.",
      tone: "text-white/60 border-white/10 bg-white/5",
    },
    "loading": {
      title: "Loading",
      body: "Loading booking details.",
      tone: "text-white/60 border-white/10 bg-white/5",
    },
    "success": {
      title: "Loaded",
      body: "Booking details loaded.",
      tone: "text-white/60 border-white/10 bg-white/5",
    },
  }[state]

  return (
    <div className={`text-center py-10 border rounded-2xl ${copy.tone}`}>
          <svg className="w-10 h-10 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
      <p className="text-sm font-semibold">{copy.title}</p>
      <p className="text-xs opacity-75 mt-1 max-w-sm mx-auto">{copy.body}</p>
    </div>
  )
}
