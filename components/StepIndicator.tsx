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
  const circleOffsetPercent = 100 / (steps.length * 2)
  const maxFilledPercent = 100 - (100 / steps.length)
  const currentFilledPercent = steps.length > 1 ? (currentIndex / (steps.length - 1)) * maxFilledPercent : 0

  return (
    <div className="w-full relative">
      {/* Background connector line */}
      <div 
        className="absolute top-[14px] h-[1px] bg-white/10 -z-0 transition-all duration-300"
        style={{ left: `${circleOffsetPercent}%`, right: `${circleOffsetPercent}%` }}
      />
      {/* Filled connector line */}
      <div 
        className="absolute top-[14px] h-[1px] bg-studio-gold -z-0 transition-all duration-300"
        style={{ left: `${circleOffsetPercent}%`, width: `${currentFilledPercent}%` }}
      />

      <div className="flex justify-between items-start w-full relative z-10">
        {steps.map((step, i) => {
          const isDone = i < currentIndex
          const isActive = i === currentIndex

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 text-center px-1">
              {/* Circle node */}
              <div
                className={clsx(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 select-none",
                  isDone && "text-black",
                  isActive && "border-2 border-studio-gold text-studio-gold",
                  !isDone && !isActive && "bg-[#0c0c0e] border border-white/10 text-white/25"
                )}
                style={isDone ? { background: "var(--sg-gold, #C5A880)" } : isActive ? { background: "rgba(255,255,255,0.05)" } : {}}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>

              {/* Label - visible on all screens, wrapping/scaling nicely */}
              <span
                className={clsx(
                  "text-[10px] sm:text-xs font-medium mt-2 leading-tight transition-colors duration-200 max-w-[90px] sm:max-w-none",
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
