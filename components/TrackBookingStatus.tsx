"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

interface BookingData {
  id: string
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
}

export default function TrackBookingStatus() {
  const searchParams = useSearchParams()
  const [bookingId, setBookingId] = useState("")
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const idParam = searchParams.get("id")
    if (idParam) {
      const trimmed = idParam.trim()
      setBookingId(trimmed)
      
      const fetchDirectly = async (id: string) => {
        setLoading(true)
        setSearched(true)
        setBooking(null)
        try {
          const res = await fetch(`/api/bookings/${id}`)
          if (!res.ok) throw new Error("Booking not found")
          const data = await res.json()
          setBooking(data)
        } catch (err) {
          console.error(err)
          toast.error("Could not retrieve booking details. Please verify the ID.")
        } finally {
          setLoading(false)
        }
      }
      fetchDirectly(trimmed)
    }
  }, [searchParams])

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookingId.trim()) {
      toast.error("Please enter a Booking ID")
      return
    }

    setLoading(true)
    setSearched(true)
    setBooking(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId.trim()}`)
      if (!res.ok) {
        throw new Error("Booking not found")
      }
      const data = await res.json()
      setBooking(data)
      toast.success("Booking retrieved successfully")
    } catch (err: any) {
      console.error(err)
      toast.error("Could not retrieve booking details. Please verify the ID.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyId = () => {
    if (booking) {
      navigator.clipboard.writeText(booking.id)
      toast.success("Booking ID copied to clipboard!")
    }
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
      {booking && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-6">
          
          {/* Header & Copy block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#C5A880" }}>Booking Details</p>
              <div className="mt-1 flex items-center gap-2.5">
                <span className="font-mono text-sm font-semibold" style={{ color: "#C5A880" }}>
                  {booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
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

          {/* Session Progress — matches booking StepIndicator layout */}
          <div className="py-2">
            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-5 text-center" style={{ color: "#C5A880" }}>Session Progress</h4>

            {/* Row 1: circles + connectors */}
            <div className="flex items-center">

              {/* Step 1: Paid */}
              <div className="flex items-center flex-1 last:flex-none">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={
                    booking.isPaid
                      ? { background: "#C5A880", color: "#000" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.25)" }
                  }
                >
                  {booking.isPaid ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : 1}
                </div>
                {/* Connector to step 2 */}
                <div
                  className="flex-1 h-px mx-1.5 transition-all duration-300"
                  style={{ background: booking.isPaid ? "#C5A880" : "rgba(255,255,255,0.10)" }}
                />
              </div>

              {/* Step 2: Reviewed */}
              <div className="flex items-center flex-1 last:flex-none">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={
                    booking.isPacked
                      ? { background: "#C5A880", color: "#000" }
                      : booking.isPaid
                      ? { background: "rgba(255,255,255,0.08)", border: "2px solid #C5A880", color: "#C5A880" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.25)" }
                  }
                >
                  {booking.isPacked ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : 2}
                </div>
                {/* Connector to step 3 */}
                <div
                  className="flex-1 h-px mx-1.5 transition-all duration-300"
                  style={{ background: booking.isPacked ? "#C5A880" : "rgba(255,255,255,0.10)" }}
                />
              </div>

              {/* Step 3: Granted */}
              <div className="flex items-center last:flex-none">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                  style={
                    booking.isDelivered
                      ? { background: "#C5A880", color: "#000" }
                      : booking.isPacked
                      ? { background: "rgba(255,255,255,0.08)", border: "2px solid #C5A880", color: "#C5A880" }
                      : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.25)" }
                  }
                >
                  {booking.isDelivered ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : 3}
                </div>
              </div>

            </div>

            {/* Row 2: labels — pinned to circle positions via grid */}
            <div className="grid mt-2" style={{ gridTemplateColumns: "28px 1fr 28px" }}>
              <div className="flex justify-center">
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: booking.isPaid ? "#C5A880" : "rgba(255,255,255,0.25)" }}>
                  Paid
                </span>
              </div>
              <div className="flex justify-center">
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: booking.isPacked ? "#C5A880" : booking.isPaid ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
                  Reviewed
                </span>
              </div>
              <div className="flex justify-center">
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: booking.isDelivered ? "#C5A880" : booking.isPacked ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}>
                  Granted
                </span>
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
      {searched && !loading && !booking && (
        <div className="text-center py-10 bg-white/5 border border-white/10 rounded-2xl">
          <svg className="w-10 h-10 text-white/20 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-white/60 text-xs">No active booking was found with that ID.</p>
          <p className="text-white/30 text-[10px] mt-1">Please double check your reference link or receipt.</p>
        </div>
      )}
    </div>
  )
}
