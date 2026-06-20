"use client"
// components/StepEquipment.tsx — Step 3: Optional equipment add-ons

import { BookingFormData } from "@/types"
import clsx from "clsx"

const EQUIPMENT_LIST = [
  {
    id: "condenser_mic",
    label: "Condenser Microphone",
    desc: "Large-diaphragm mic for pristine vocal clarity",
    priceGHS: 50,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: "dynamic_mic",
    label: "Dynamic Microphone",
    desc: "Ideal for instruments, live tracking & rap",
    priceGHS: 30,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: "headphones",
    label: "Studio Headphones (per pair)",
    desc: "Closed-back monitoring for accurate tracking",
    priceGHS: 20,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: "guitar_amp",
    label: "Guitar Amplifier",
    desc: "Professional amp for live instrument recording",
    priceGHS: 80,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
      </svg>
    ),
  },
  {
    id: "keyboard",
    label: "MIDI Keyboard",
    desc: "Full-size MIDI for melody, harmony & beats",
    priceGHS: 60,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16v12H4zM8 6v12M12 6v12M16 6v12" />
      </svg>
    ),
  },
  {
    id: "mixing_engineer",
    label: "In-house Mixing Engineer",
    desc: "Expert engineer to mix & master in session",
    priceGHS: 150,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
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

interface Props {
  form: Partial<BookingFormData>
  updateForm: (u: Partial<BookingFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function StepEquipment({ form, updateForm, onNext, onBack }: Props) {
  const selected = form.equipment ?? []
  const duration = form.durationHours ?? 2.5

  const toggle = (id: string) => {
    updateForm({
      equipment: selected.includes(id)
        ? selected.filter((e) => e !== id)
        : [...selected, id],
    })
  }

  const baseRate = calcSessionPrice(duration)
  const equipTotal = selected.reduce((sum, id) => {
    return sum + (EQUIPMENT_LIST.find((e) => e.id === id)?.priceGHS ?? 0)
  }, 0)
  const total = baseRate + equipTotal

  return (
    <div className="space-y-4">

      <div className="card bg-black/40 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Equipment Add-ons</h2>
            <p className="text-white/35 text-xs mt-0.5">
              All optional. Studio monitors &amp; basic cables included free.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {EQUIPMENT_LIST.map((item) => {
            const isSelected = selected.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={clsx(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 text-left",
                  isSelected
                    ? "bg-white/5 border-white/40"
                    : "bg-white/3 border-white/8 hover:border-white/18"
                )}
              >
                {/* Checkbox */}
                <div className={clsx(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                  isSelected ? "bg-white border-white" : "border-white/20"
                )}>
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <span className={clsx("shrink-0", isSelected ? "text-white" : "text-white/35")}>
                  {item.icon}
                </span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span className={clsx("text-xs font-medium block truncate", isSelected ? "text-white" : "text-white/65")}>
                    {item.label}
                  </span>
                  <span className="text-xs text-white/30 truncate block">{item.desc}</span>
                </div>

                {/* Price */}
                <span className={clsx("text-xs font-semibold shrink-0", isSelected ? "text-white" : "text-white/35")}>
                  +GHS {item.priceGHS}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Compact price summary */}
      <div className="card bg-black/30 backdrop-blur-sm py-3.5 px-4">
        <div className="flex justify-between text-xs text-white/50 mb-1">
          <span>Studio time ({minutesToDisplay(duration)})</span>
          <span>GHS {baseRate.toLocaleString()}</span>
        </div>
        {selected.map((id) => {
          const item = EQUIPMENT_LIST.find((e) => e.id === id)
          return item ? (
            <div key={id} className="flex justify-between text-xs text-white/50 mb-1">
              <span>{item.label}</span>
              <span>GHS {item.priceGHS}</span>
            </div>
          ) : null
        })}
        <div className="border-t border-white/8 pt-2.5 mt-2.5 flex justify-between items-center">
          <span className="text-white text-sm font-semibold">Total</span>
          <span className="text-lg font-bold text-white">GHS {total.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex-1 py-3.5 text-sm flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          id="btn-equipment-continue"
          className="btn-primary flex-1 py-3.5 text-sm flex items-center justify-center gap-1.5"
        >
          Review Booking
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
