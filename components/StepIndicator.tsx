"use client"
// components/StepIndicator.tsx

import { BookingStep } from "./BookingFlow"
import clsx from "clsx"

interface Props {
  steps: { id: BookingStep; label: string }[]
  currentStep: BookingStep
}

export default function StepIndicator({ steps, currentStep }: Props) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="w-full">
      {/* Top row: circles + connectors, all vertically centred */}
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isDone = i < currentIndex
          const isActive = i === currentIndex

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Circle node */}
              <div
                className={clsx(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                  isDone && "text-black",
                  isActive && "border-2 border-studio-gold text-studio-gold",
                  !isDone && !isActive && "bg-white/5 border border-white/10 text-white/25"
                )}
                style={isDone ? { background: "var(--sg-gold)" } : isActive ? { background: "rgba(255,255,255,0.1)" } : {}}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>

              {/* Connector line — same row as circles, vertically centred */}
              {i < steps.length - 1 && (
                <div
                  className={clsx(
                    "flex-1 h-px mx-1.5 transition-all duration-300",
                    i < currentIndex ? "bg-studio-gold" : "bg-white/10"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom row: labels, only visible on sm+ */}
      <div className="hidden sm:flex items-start mt-1.5">
        {steps.map((step, i) => {
          const isDone = i < currentIndex
          const isActive = i === currentIndex

          return (
            <div key={step.id} className="flex-1 last:flex-none flex justify-center last:justify-center">
              <span
                className={clsx(
                  "text-xs font-medium whitespace-nowrap",
                  isActive ? "text-studio-gold" : isDone ? "text-white/60" : "text-white/20"
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
