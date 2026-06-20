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
}

export default function AdminHeader() {
  const pathname = usePathname()
  const title = BREADCRUMBS[pathname] ?? "Admin"
  const [isDark, setIsDark] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const stored = localStorage.getItem("admin-theme")
    if (stored === "light") {
      setIsDark(false)
      document.documentElement.classList.add("light")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem("admin-theme", newTheme ? "dark" : "light")
    
    if (newTheme) {
      document.documentElement.classList.remove("light")
    } else {
      document.documentElement.classList.add("light")
    }
  }

  if (!isMounted) return null

  return (
    <header className="flex-shrink-0 h-14 bg-black/20 backdrop-blur-lg border-b border-white/5 flex items-center justify-between px-4 md:px-6 md:pl-6 pl-16 light:bg-white/80 light:border-gray-200">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/30 hidden md:inline tracking-wide text-xs uppercase light:text-gray-500">S&G Admin</span>
        <span className="text-white/20 hidden md:inline light:text-gray-300">/</span>
        <span className="text-white/80 tracking-wide text-xs uppercase font-medium light:text-gray-800">{title}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20 rounded-lg transition-all duration-150 light:text-gray-600 light:hover:text-gray-900 light:border-gray-200 light:hover:border-gray-400"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
          <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
        </button>

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/30 tracking-widest uppercase light:text-gray-500">Live</span>
        </div>

        {/* Admin pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full light:bg-gray-100 light:border-gray-300">
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center light:bg-gray-200">
            <span className="text-[8px] font-bold text-white light:text-gray-700">A</span>
          </div>
          <span className="text-xs text-white/60 font-medium light:text-gray-700">Admin</span>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-white/70 border border-white/8 hover:border-white/20 rounded-lg transition-all duration-150 light:text-gray-600 light:hover:text-gray-900 light:border-gray-200 light:hover:border-gray-400"
          title="Sign out"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
