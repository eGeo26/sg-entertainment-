"use client"
// app/admin/components/AdminHeader.tsx

import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createBrowserSupabaseClient } from "@/lib/supabase"

const BREADCRUMBS: Record<string, string> = {
  "/prof-boss": "Overview",
  "/prof-boss/bookings": "Bookings",
  "/prof-boss/customers": "Customers",
  "/prof-boss/payments": "Payments",
  "/prof-boss/notifications": "Notifications",
  "/prof-boss/insights": "Insights",
  "/prof-boss/reviews": "Reviews",
  "/prof-boss/settings": "Settings",
}

export default function AdminHeader({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const title = BREADCRUMBS[pathname] ?? "Admin"
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push("/prof-boss/login")
    router.refresh()
  }

  if (!mounted) return (
    <header className="glass-header flex-shrink-0 h-14 flex items-center px-4 md:px-6 sticky top-0 z-20" />
  )

  return (
    <header className="glass-header flex-shrink-0 h-14 flex items-center justify-between px-3 md:px-6 sticky top-0 z-20 gap-2">

      {/* Breadcrumb / Compact Branding */}
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Mobile Hamburger menu */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/80 shrink-0"
          aria-label="Toggle navigation menu"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Desktop text branding */}
        <span
          className="hidden md:inline tracking-wide text-xs uppercase font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          S&amp;G Admin
        </span>
        <span className="hidden md:inline text-xs" style={{ color: "var(--border-hover)" }}>/</span>
        <span
          className="tracking-wide text-xs uppercase font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

        {/* Mobile admin mark belongs with the account controls, not the breadcrumb. */}
        <div className="md:hidden w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--sg-gold), var(--sg-crimson))" }}>
          <span className="text-[10px] font-bold text-black">A</span>
        </div>

        {/* Desktop Admin pill */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--sg-gold), var(--sg-crimson))" }}
          >
            <span className="text-[8px] font-bold text-black">A</span>
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Admin</span>
        </div>

        {/* Hubtel Back Office Link */}
        <a
          href="https://bo.hubtel.com/app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 hover:bg-white/5 shrink-0"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          title="Open Hubtel Back Office"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span className="inline">Hubtel</span>
        </a>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="btn-glass px-2 py-1.5 text-xs flex items-center gap-1 shrink-0"
          title="Sign out"
          id="admin-signout"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  )
}
