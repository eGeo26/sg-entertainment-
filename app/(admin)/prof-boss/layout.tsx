"use client"
// app/(admin)/prof-boss/layout.tsx
// Dashboard layout wrapper — client component to toggle sidebar/header/bottom nav on login page.
// Includes admin idle-timeout logic: after NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MINUTES of inactivity
// (default 15 min) the admin is signed out and redirected to the login page.
// A warning modal appears at (timeout - 60 s) so an active admin is never kicked mid-task.

import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, useRef, useCallback } from "react"
import AdminSidebar from "./components/AdminSidebar"
import AdminHeader from "./components/AdminHeader"
import AdminIdleWarningModal from "@/components/AdminIdleWarningModal"
import { createBrowserSupabaseClient } from "@/lib/supabase"

// ── Idle timeout config ──────────────────────────────────────────────────────
// Configurable via NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MINUTES (default: 15 minutes).
// Set to a small value (e.g. 0.1) during development to test quickly.
const TIMEOUT_MINUTES = parseFloat(
  process.env.NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MINUTES ?? "15"
)
const TIMEOUT_MS  = TIMEOUT_MINUTES * 60 * 1000
// Show warning 60 s before auto-logout (unless timeout is very short)
const WARNING_LEAD_MS = Math.min(60_000, TIMEOUT_MS * 0.5)
// Events that reset the idle clock
const RESET_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove", "keydown", "click", "scroll", "touchstart", "pointerdown",
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const router     = useRouter()
  const isLoginPage = pathname === "/prof-boss/login"

  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [showWarning, setShowWarning]     = useState(false)
  const [warningSeconds, setWarningSeconds] = useState(60)

  // Use refs so event listeners always see the latest value without re-registering
  const lastActivityRef  = useRef<number>(Date.now())
  const warningShownRef  = useRef<boolean>(false)
  const signedOutRef     = useRef<boolean>(false)

  // ── Sign-out helper ──────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    if (signedOutRef.current) return
    signedOutRef.current = true
    setShowWarning(false)
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push("/prof-boss/login")
    router.refresh()
  }, [router])

  // ── Reset idle clock ─────────────────────────────────────────────────────
  const resetIdle = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (warningShownRef.current) {
      warningShownRef.current = false
      setShowWarning(false)
      setWarningSeconds(Math.round(WARNING_LEAD_MS / 1000))
    }
  }, [])

  // ── Idle-timer effect — only runs on non-login admin pages ───────────────
  useEffect(() => {
    if (isLoginPage) return

    // Register activity listeners
    RESET_EVENTS.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }))

    // Poll every second to check elapsed idle time
    const interval = setInterval(() => {
      if (signedOutRef.current) return
      const elapsed = Date.now() - lastActivityRef.current

      if (elapsed >= TIMEOUT_MS) {
        // Full timeout reached — sign out
        handleSignOut()
        return
      }

      const remaining = TIMEOUT_MS - elapsed

      if (remaining <= WARNING_LEAD_MS && !warningShownRef.current) {
        // Enter warning window
        warningShownRef.current = true
        setWarningSeconds(Math.round(remaining / 1000))
        setShowWarning(true)
      }

      if (warningShownRef.current) {
        // Keep the seconds counter in sync with real elapsed time
        setWarningSeconds(Math.max(0, Math.round(remaining / 1000)))
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      RESET_EVENTS.forEach((ev) => window.removeEventListener(ev, resetIdle))
    }
  }, [isLoginPage, handleSignOut, resetIdle])

  // ── Login page — bare wrapper ────────────────────────────────────────────
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="admin-body min-h-screen relative text-[#F5F5F5] bg-[#161619]">
      {/* Deep dark mesh gradient background */}
      <div className="admin-mesh-bg" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen items-start">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 min-h-screen">
          <AdminHeader onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 pb-4 md:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Idle session warning modal */}
      {showWarning && (
        <AdminIdleWarningModal
          secondsRemaining={warningSeconds}
          onStay={resetIdle}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  )
}
