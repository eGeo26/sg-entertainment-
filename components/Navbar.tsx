"use client"
// components/Navbar.tsx — Universal sticky header

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import dynamic from "next/dynamic"

// Lazy-load the beat station so it doesn't affect initial bundle size
const BeatStation = dynamic(() => import("./BeatStation"), { ssr: false })

const KONAMI = [
  "ArrowUp","ArrowUp","ArrowDown","ArrowDown",
  "ArrowLeft","ArrowRight","ArrowLeft","ArrowRight",
  "b","a",
]

export default function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  const [lastBookingId, setLastBookingId] = useState<string | null>(null)
  const [beatStationOpen, setBeatStationOpen] = useState(false)

  // Konami code tracking
  const konamiProgressRef = useRef<number>(0)
  // Logo click tracking (7 rapid clicks)
  const logoClicksRef = useRef<number>(0)
  const logoClickTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ── LocalStorage polling for active booking banner ──────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("last_initiated_booking_id")
    if (stored) setLastBookingId(stored)

    const interval = setInterval(() => {
      const storedVal = localStorage.getItem("last_initiated_booking_id")
      if (storedVal !== lastBookingId) setLastBookingId(storedVal)
    }, 1000)
    return () => clearInterval(interval)
  }, [lastBookingId])

  // ── Konami code listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === KONAMI[konamiProgressRef.current]) {
        konamiProgressRef.current += 1
        if (konamiProgressRef.current === KONAMI.length) {
          konamiProgressRef.current = 0
          setBeatStationOpen(true)
          toast("🎵 Secret unlocked — Beat Station!", {
            description: "Use keys Q–F or click pads to jam.",
            duration: 3000,
          })
        }
      } else {
        konamiProgressRef.current = 0
        // Check if this key restarts the sequence
        if (e.key === KONAMI[0]) konamiProgressRef.current = 1
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  // ── Logo 7-click easter egg ──────────────────────────────────────────────────
  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    logoClicksRef.current += 1

    if (logoClickTimerRef.current) clearTimeout(logoClickTimerRef.current)
    logoClickTimerRef.current = setTimeout(() => {
      logoClicksRef.current = 0
    }, 1500)

    if (logoClicksRef.current >= 7) {
      logoClicksRef.current = 0
      setBeatStationOpen(true)
      toast("🎵 You found it!", {
        description: "S&G Beat Station unlocked.",
        duration: 3000,
      })
    }
  }, [])

  return (
    <>
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
          {/* Logo — 7 fast clicks opens Beat Station */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 shrink-0 focus:outline-none"
            aria-label="S&G Studios – Home (click 7× for a surprise)"
          >
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
          </button>

          {/* Centre label on booking/services pages */}
          {!isHome && (
            <span className="text-white/40 text-xs font-medium uppercase tracking-widest hidden sm:block">
              {pathname === "/booking" && "Booking"}
              {pathname === "/services" && "Our Services"}
              {pathname?.startsWith("/success") && "Confirmed"}
            </span>
          )}

          {/* Right nav */}
          {!isHome ? (
            <div className="flex items-center gap-2">
              {pathname === "/booking" && null}
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
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Track booking link on home */}
              <Link
                href="/booking?track=true"
                className="flex items-center gap-1.5 text-white/55 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all"
                id="nav-track"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Track
              </Link>
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
            </div>
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

      {/* Beat Station Modal */}
      {beatStationOpen && (
        <BeatStation onClose={() => setBeatStationOpen(false)} />
      )}
    </>
  )
}
