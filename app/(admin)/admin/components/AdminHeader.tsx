"use client"
// app/admin/components/AdminHeader.tsx

import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"

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

type Theme = "dark" | "light" | "system"

function getSystemDark() {
  if (typeof window === "undefined") return true
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null

  if (theme === "dark") {
    root.setAttribute("data-theme", "dark")
    root.style.colorScheme = "dark"
    if (meta) meta.content = "dark"
  } else if (theme === "light") {
    root.setAttribute("data-theme", "light")
    root.style.colorScheme = "light"
    if (meta) meta.content = "light"
  } else {
    // system
    root.removeAttribute("data-theme")
    root.style.colorScheme = "light dark"
    if (meta) meta.content = "light dark"
  }
}

export default function AdminHeader() {
  const pathname = usePathname()
  const title = BREADCRUMBS[pathname] ?? "Admin"
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = (localStorage.getItem("sg-admin-theme") ?? "dark") as Theme
    setTheme(stored)
    applyTheme(stored)
  }, [])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("sg-admin-theme", next)
    applyTheme(next)
  }, [theme])

  const isDark = theme === "dark" || (theme === "system" && getSystemDark())

  if (!mounted) return (
    <header className="glass-header flex-shrink-0 h-14 flex items-center px-4 md:px-6 pl-16 md:pl-6" />
  )

  return (
    <header className="glass-header flex-shrink-0 h-14 flex items-center justify-between px-4 md:px-6 pl-16 md:pl-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span style={{ color: "var(--text-muted)" }} className="hidden md:inline tracking-wide text-xs uppercase font-medium">
          S&amp;G Admin
        </span>
        <span style={{ color: "var(--border-hover)" }} className="hidden md:inline text-xs">/</span>
        <span style={{ color: "var(--text-primary)" }} className="tracking-wide text-xs uppercase font-semibold">
          {title}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-glass gap-1.5 px-3 py-1.5 text-xs"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          id="admin-theme-toggle"
        >
          {isDark ? (
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5" />
              <path strokeLinecap="round" d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
          <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
        </button>

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] tracking-widest uppercase font-medium" style={{ color: "var(--text-muted)" }}>Live</span>
        </div>

        {/* Admin pill */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)" }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--sg-gold), var(--sg-crimson))" }}>
            <span className="text-[8px] font-bold text-black">A</span>
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Admin</span>
        </div>

        {/* Logout */}
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
