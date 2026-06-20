"use client"
// app/admin/components/AdminHeader.tsx

import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"

const BREADCRUMBS: Record<string, string> = {
  "/admin": "Overview",
  "/admin/bookings": "Bookings",
  "/admin/customers": "Customers",
  "/admin/payments": "Payments",
  "/admin/notifications": "Notifications",
  "/admin/insights": "Insights",
  "/admin/reviews": "Reviews",
  "/admin/settings": "Settings",
}

export default function AdminHeader() {
  const pathname = usePathname()
  const title = BREADCRUMBS[pathname] ?? "Admin"
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return (
    <header className="glass-header flex-shrink-0 h-14 flex items-center px-4 md:px-6 pl-16 md:pl-6" />
  )

  return (
    <header className="glass-header flex-shrink-0 h-14 flex items-center justify-between px-4 md:px-6 pl-16 md:pl-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span
          className="hidden md:inline tracking-wide text-xs uppercase font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          S&amp;G Admin
        </span>
        <span className="hidden md:inline text-xs" style={{ color: "var(--border-hover)" }}>/</span>
        <span
          className="tracking-wide text-xs uppercase font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Live indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] tracking-widest uppercase font-medium" style={{ color: "var(--text-muted)" }}>
            Live
          </span>
        </div>

        {/* Admin pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
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

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="btn-glass px-2.5 py-1.5"
          title="Sign out"
          id="admin-signout"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="hidden sm:inline text-xs">Sign out</span>
        </button>
      </div>
    </header>
  )
}
