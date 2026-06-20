"use client"
// components/Navbar.tsx — Universal sticky header

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const pathname = usePathname()
  const isHome = pathname === "/"

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
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
    </header>
  )
}
