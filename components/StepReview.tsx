"use client"
// components/StepReview.tsx — Final review before Paystack payment

import { useState, useEffect, useRef } from "react"
import { BookingFormData } from "@/types"
import { formatDisplayDate, formatDisplayTime, getEndTime } from "@/lib/booking"

const EQUIPMENT_LIST = [
  { id: "condenser_mic",  label: "Condenser Microphone",       priceGHS: 50  },
  { id: "dynamic_mic",   label: "Dynamic Microphone",          priceGHS: 30  },
  { id: "headphones",    label: "Studio Headphones (per pair)",priceGHS: 20  },
  { id: "guitar_amp",    label: "Guitar Amplifier",            priceGHS: 80  },
  { id: "keyboard",      label: "MIDI Keyboard",               priceGHS: 60  },
  { id: "mixing_engineer",label:"In-house Mixing Engineer",    priceGHS: 150 },
]

function calcSessionPrice(durationHours: number): number {
  const mins = Math.round(durationHours * 60)
  if (mins <= 150) return 300
  return 300 + Math.ceil((mins - 150) / 30) * 60
}

function minutesToDisplay(h: number): string {
  const mins = Math.round(h * 60)
  const hr = Math.floor(mins / 60)
  const min = mins % 60
  return min === 0 ? `${hr}h` : `${hr}h ${min}m`
}

interface Particle {
  id: number
  symbol: string
  dx: number   // pixels from button centre
  dy: number
  size: number
  color: string
  delay: number
}

interface Props {
  form: BookingFormData
  onBack: () => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
}

export default function StepReview({ form, onBack, onSubmit, isSubmitting }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [btnRect, setBtnRect] = useState<DOMRect | null>(null)
  const [animating, setAnimating] = useState(false)

  const endTime = getEndTime(form.sessionDate, form.startTime, form.durationHours)
  const displayDate = formatDisplayDate(form.sessionDate)
  const baseRate = calcSessionPrice(form.durationHours)
  const equipmentTotal = form.equipment.reduce((sum, id) => {
    return sum + (EQUIPMENT_LIST.find((e) => e.id === id)?.priceGHS ?? 0)
  }, 0)
  const total = baseRate + equipmentTotal
  const equipmentLabels = form.equipment.map(
    (id) => EQUIPMENT_LIST.find((e) => e.id === id)?.label ?? id
  )

  // Clear particles after animation completes
  useEffect(() => {
    if (particles.length === 0) return
    const t = setTimeout(() => {
      setParticles([])
      setBtnRect(null)
    }, 1800)
    return () => clearTimeout(t)
  }, [particles])

  const triggerSparkles = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setBtnRect(rect)

    const symbols = ["♪", "♫", "★", "✦", "♩", "✶", "♬", "♭"]
    const colors  = ["#ffffff", "#cccccc", "#888888", "#444444", "#aaaaaa"]

    const ps: Particle[] = Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const dist  = 40 + Math.random() * 100
      return {
        id:     i,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        dx:     Math.cos(angle) * dist,
        dy:     Math.sin(angle) * dist - 30, // bias upward
        size:   11 + Math.random() * 14,
        color:  colors[Math.floor(Math.random() * colors.length)],
        delay:  Math.random() * 120,
      }
    })
    setParticles(ps)
    setAnimating(true)
    setTimeout(() => setAnimating(false), 500)
  }

  const handleSubmit = async () => {
    triggerSparkles()
    await new Promise((r) => setTimeout(r, 350))
    await onSubmit()
  }

  return (
    <div className="space-y-4 relative">

      {/* ── Sparkles — fixed over button centre ── */}
      {particles.length > 0 && btnRect && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden" aria-hidden="true">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute select-none font-bold leading-none"
              style={{
                left:  btnRect.left + btnRect.width  / 2,
                top:   btnRect.top  + btnRect.height / 2,
                fontSize: `${p.size}px`,
                color: p.color,
                transform: "translate(-50%,-50%)",
                animation: `sg-sparkle 1.5s ease-out ${p.delay}ms forwards`,
                "--sg-dx": `${p.dx}px`,
                "--sg-dy": `${p.dy}px`,
              } as React.CSSProperties}
            >
              {p.symbol}
            </span>
          ))}
        </div>
      )}

      {/* Summary card — compact */}
      <div className="card bg-black/40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Review Booking</h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 text-white/35 hover:text-white/60 transition-colors text-xs print:hidden"
            title="Print receipt"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>

        <div className="space-y-3">
          {/* Session */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Session</p>
            <p className="text-white font-semibold text-sm">{displayDate}</p>
            <p className="text-white/65 text-xs mt-0.5">
              {formatDisplayTime(form.startTime)} – {formatDisplayTime(endTime)} · {minutesToDisplay(form.durationHours)}
            </p>
            <p className="text-white/40 text-xs">{form.studio} · S&amp;G Entertainment, Accra</p>
          </div>

          {/* Customer */}
          <div className="border-t border-white/8 pt-3">
            <p className="text-white/35 text-xs uppercase tracking-wider mb-2">Customer</p>
            <div className="space-y-1.5">
              <Row label="Name"  value={form.customerName} />
              <Row label="Email" value={form.customerEmail} />
              <Row label="Phone" value={form.customerPhone} />
              {form.notes && <Row label="Notes" value={form.notes} />}
            </div>
          </div>

          {/* Equipment */}
          {equipmentLabels.length > 0 && (
            <div className="border-t border-white/8 pt-3">
              <p className="text-white/35 text-xs uppercase tracking-wider mb-2">Add-ons</p>
              <div className="flex flex-wrap gap-1.5">
                {equipmentLabels.map((label) => (
                  <span key={label} className="text-xs bg-white/8 text-white/65 px-2.5 py-1 rounded-full">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="border-t border-white/8 pt-3">
            <p className="text-white/35 text-xs uppercase tracking-wider mb-2">Pricing</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Studio time ({minutesToDisplay(form.durationHours)})</span>
                <span className="text-white/80">GHS {baseRate.toLocaleString()}</span>
              </div>
              {form.equipment.map((id) => {
                const item = EQUIPMENT_LIST.find((e) => e.id === id)
                return item ? (
                  <div key={id} className="flex justify-between text-xs">
                    <span className="text-white/50">{item.label}</span>
                    <span className="text-white/80">GHS {item.priceGHS}</span>
                  </div>
                ) : null
              })}
            </div>
            <div className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-white/8">
              <span className="text-white text-sm font-semibold">Total Due</span>
              <span className="text-xl font-bold text-white">
                GHS {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment — Paystack only, compact */}
      <div className="card bg-black/30 backdrop-blur-sm py-3 px-4">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <div>
            <p className="text-white text-sm font-semibold">Paystack</p>
            <p className="text-white/40 text-xs">MoMo · Visa · Mastercard · Bank Transfer</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span className="text-white/30 text-xs">Secure</span>
          </div>
        </div>
      </div>

      <p className="text-white/20 text-xs text-center leading-relaxed px-4">
        By proceeding you agree to S&amp;G Entertainment's booking policy.
        Cancellations 24h+ before the session are fully refundable.
      </p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="btn-secondary flex-1 py-3.5 text-sm flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          ref={btnRef}
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          id="btn-pay"
          className={`btn-primary flex-1 py-3.5 text-sm transition-transform duration-150 ${animating ? "scale-95" : ""}`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Redirecting…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              Pay GHS {total.toLocaleString()}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {/* Sparkle keyframes */}
      <style jsx global>{`
        @keyframes sg-sparkle {
          0%   { opacity:1; transform:translate(-50%,-50%) scale(1); }
          100% { opacity:0; transform:translate(calc(-50% + var(--sg-dx)),calc(-50% + var(--sg-dy))) scale(0.2) rotate(480deg); }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-white/35 text-xs shrink-0">{label}</span>
      <span className="text-white/75 text-xs text-right break-all">{value}</span>
    </div>
  )
}
