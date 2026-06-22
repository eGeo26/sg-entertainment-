"use client"
// components/Navbar.tsx — Universal sticky header

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"

export default function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  const [lastBookingId, setLastBookingId] = useState<string | null>(null)

  useEffect(() => {
    // Read from localStorage on mount
    const stored = localStorage.getItem("last_initiated_booking_id")
    if (stored) {
      setLastBookingId(stored)
    }

    // Interval checks
    const interval = setInterval(() => {
      const storedVal = localStorage.getItem("last_initiated_booking_id")
      if (storedVal !== lastBookingId) {
        setLastBookingId(storedVal)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastBookingId])

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex flex-col"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-5xl mx-auto w-full px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo — always links to home */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="S&G Studios – Home">
          <Image
            src="/assets/sg-logo.png"
            alt="S&G Studios"
            width={36}
            height={36}
            className="rounded-lg object-contain"
            priority
          />
          <span className="text-white font-semibold text-sm tracking-tight hidden sm:block">
            S&amp;G Studios
          </span>
        </Link>

        {/* Centre label on booking/services pages */}
        {!isHome && (
          <span className="text-white/40 text-xs font-medium uppercase tracking-widest hidden sm:block">
            {pathname === "/booking" && "Booking"}
            {pathname === "/services" && "Our Services"}
            {pathname?.startsWith("/success") && "Confirmed"}
          </span>
        )}

        {/* Right — back home on sub-pages */}
        {!isHome ? (
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm font-medium"
            id="nav-back-home"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Home</span>
          </Link>
        ) : (
          <Link
            href="/booking"
            className="flex items-center gap-1.5 text-xs font-bold text-black bg-studio-gold hover:bg-studio-gold/90 px-4 py-2 rounded-lg transition-all"
            id="nav-book"
          >
            Book
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* Floating payment notification banner */}
      {lastBookingId && (
        <div className="bg-black/90 border-t border-[#C5A880]/30 py-2.5 px-4 text-center text-xs flex flex-wrap items-center justify-center gap-x-4 gap-y-2 backdrop-blur-md">
          <span className="text-white/60">
            Payment initiated! Reference ID:{" "}
            <span className="font-mono font-bold text-[#C5A880]">
              {lastBookingId}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastBookingId)
                toast.success("Booking ID copied to clipboard!")
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[#C5A880] rounded border border-[#C5A880]/20 text-[10px] font-bold uppercase transition-all"
            >
              Copy ID
            </button>
            <Link
              href={`/booking?track=true&id=${lastBookingId}`}
              className="px-2.5 py-1 bg-[#C5A880] hover:bg-[#b0936b] text-black rounded text-[10px] font-bold uppercase transition-all"
            >
              Track Status
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("last_initiated_booking_id")
                setLastBookingId(null)
              }}
              className="text-white/40 hover:text-white ml-2 text-xs font-bold"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

