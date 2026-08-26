"use client"
// components/AdminIdleWarningModal.tsx
// Shown when the admin has been idle for (timeout - 60s).
// Counts down the remaining seconds and offers "Stay Logged In" / "Sign Out Now".

import { useEffect, useState } from "react"

interface Props {
  secondsRemaining: number
  onStay: () => void
  onSignOut: () => void
}

export default function AdminIdleWarningModal({ secondsRemaining, onStay, onSignOut }: Props) {
  const [displayed, setDisplayed] = useState(secondsRemaining)

  // Keep a live ticking countdown so the admin can see time draining
  useEffect(() => {
    setDisplayed(secondsRemaining)
  }, [secondsRemaining])

  useEffect(() => {
    if (displayed <= 0) return
    const t = setInterval(() => setDisplayed((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [displayed])

  const pct = Math.max(0, Math.min(100, (displayed / 60) * 100))

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-modal-title"
      aria-describedby="idle-modal-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onStay}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121a]/90 backdrop-blur-xl shadow-2xl p-6 flex flex-col items-center gap-5"
        style={{ boxShadow: "0 0 60px rgba(197,168,128,0.08), 0 25px 50px rgba(0,0,0,0.6)" }}
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <h2 id="idle-modal-title" className="text-white font-semibold text-base mb-1">
            Session Expiring
          </h2>
          <p id="idle-modal-desc" className="text-white/55 text-sm leading-relaxed">
            You've been inactive. You'll be signed out automatically.
          </p>
        </div>

        {/* Countdown ring + number */}
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={displayed <= 10 ? "#ef4444" : "#C5A880"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums ${
              displayed <= 10 ? "text-red-400" : "text-white"
            }`}
          >
            {displayed}
          </span>
        </div>

        {/* Progress bar (secondary visual) */}
        <div className="w-full h-1 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${pct}%`,
              background: displayed <= 10
                ? "linear-gradient(90deg,#ef4444,#dc2626)"
                : "linear-gradient(90deg,#C5A880,#A3845B)",
            }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onSignOut}
            id="idle-modal-signout"
            className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 text-sm font-medium hover:bg-white/10 hover:text-white/80 transition-all"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={onStay}
            id="idle-modal-stay"
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black transition-all"
            style={{ background: "linear-gradient(135deg,#C5A880 0%,#A3845B 100%)" }}
            autoFocus
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}
