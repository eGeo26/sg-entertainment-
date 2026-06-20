"use client"
// components/BookingFlow.tsx
// Multi-step booking wizard: Date/Time → Details → Equipment → Review → Payment

import { useState, useCallback } from "react"
import { toast } from "sonner"
import StepIndicator from "./StepIndicator"
import StepDateTime from "./StepDateTime"
import StepCustomer from "./StepCustomer"
import StepEquipment from "./StepEquipment"
import StepReview from "./StepReview"
import { BookingFormData } from "@/types"
import { calculateTotal } from "@/lib/booking"

export type BookingStep = "datetime" | "customer" | "review"

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "datetime", label: "Date & Time" },
  { id: "customer", label: "Your Details" },
  { id: "review", label: "Review & Pay" },
]

export default function BookingFlow() {
  const [step, setStep] = useState<BookingStep>("datetime")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState<Partial<BookingFormData>>({
    studio: "Main Studio",
    equipment: [],
  })

  const currentStepIndex = STEPS.findIndex((s) => s.id === step)

  const updateForm = useCallback((updates: Partial<BookingFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }, [])

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex].id)
      // Scroll to top of content area smoothly
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
    }
  }, [currentStepIndex])

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex].id)
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50)
    }
  }, [currentStepIndex])

  const handleProceedToPayment = async () => {
    const data = form as BookingFormData
    const { total } = calculateTotal(data.durationHours, data.equipment ?? [])

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create booking")
      window.location.href = json.authorizationUrl
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 py-6 px-4">
      {/* Booking header — centred, no duplicate nav */}
      <div className="max-w-xl mx-auto mb-6 text-center">
        <h1 className="text-xl font-bold text-white mb-1">Book a Recording Session</h1>
        <div className="inline-flex items-center gap-1.5 text-white/40 text-xs">
          <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
          Secure booking powered by Hubtel
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-xl mx-auto mb-6">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      {/* Step content */}
      <div className="max-w-xl mx-auto pb-4">
        {step === "datetime" && (
          <StepDateTime form={form} updateForm={updateForm} onNext={goNext} />
        )}
        {step === "customer" && (
          <StepCustomer form={form} updateForm={updateForm} onNext={goNext} onBack={goBack} />
        )}

        {step === "review" && (
          <StepReview
            form={form as BookingFormData}
            onBack={goBack}
            onSubmit={handleProceedToPayment}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
