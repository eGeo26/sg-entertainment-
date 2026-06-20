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
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isDone = i < currentIndex
        const isActive = i === currentIndex

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                  isDone && "text-black",
                  isActive && "border-2 border-white text-white",
                  !isDone && !isActive && "bg-white/5 border border-white/10 text-white/25"
                )}
                style={isDone ? { background: "#ffffff" } : isActive ? { background: "rgba(255,255,255,0.1)" } : {}}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span
                className={clsx(
                  "text-xs mt-1 font-medium whitespace-nowrap hidden sm:block",
                  isActive ? "text-white" : isDone ? "text-white/60" : "text-white/20"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className={clsx(
                  "h-px flex-1 mx-1.5 mb-3 sm:mb-5 transition-all duration-300",
                  i < currentIndex ? "bg-white" : "bg-white/10"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
