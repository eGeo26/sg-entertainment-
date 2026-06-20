"use client"
// components/StepCustomer.tsx — Step 2: Customer contact details

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { BookingFormData } from "@/types"
import { validateGhanaPhone } from "@/lib/booking"

const schema = z.object({
  customerName:  z.string().min(2, "Name must be at least 2 characters").max(100),
  customerEmail: z.string().email("Enter a valid email address"),
  customerPhone: z.string().refine(validateGhanaPhone, {
    message: "Enter a valid Ghana phone number (e.g. 0244123456)",
  }),
  notes: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  form: Partial<BookingFormData>
  updateForm: (u: Partial<BookingFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function StepCustomer({ form, updateForm, onNext, onBack }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName:  form.customerName  ?? "",
      customerEmail: form.customerEmail ?? "",
      customerPhone: form.customerPhone ?? "",
      notes:         form.notes         ?? "",
    },
  })

  const onSubmit = (data: FormValues) => {
    updateForm(data)
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div className="card bg-black/40 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-white mb-4">Your Contact Details</h2>

        <div className="space-y-4">

          {/* Full Name */}
          <div>
            <label className="label">Full Name</label>
            <input
              {...register("customerName")}
              placeholder="e.g. Kofi Mensah"
              className="input-field"
              autoComplete="name"
            />
            {errors.customerName && (
              <p className="text-red-400 text-xs mt-1">{errors.customerName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email Address</label>
            <input
              {...register("customerEmail")}
              type="email"
              placeholder="kofi@example.com"
              className="input-field"
              autoComplete="email"
            />
            {errors.customerEmail && (
              <p className="text-red-400 text-xs mt-1">{errors.customerEmail.message}</p>
            )}
            <p className="text-white/30 text-xs mt-1">
              Confirmation will be sent to this address
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone / WhatsApp</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 text-xs select-none">
                🇬🇭 GH
              </span>
              <input
                {...register("customerPhone")}
                type="tel"
                placeholder="0244 123 456"
                className="input-field pl-14"
                autoComplete="tel"
              />
            </div>
            {errors.customerPhone && (
              <p className="text-red-400 text-xs mt-1">{errors.customerPhone.message}</p>
            )}
            <p className="text-white/30 text-xs mt-1">
              Confirmation also sent via WhatsApp
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="label">
              Session Notes
              <span className="text-white/30 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              {...register("notes")}
              placeholder="Genre, number of artists, anything special…"
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>
      </div>

      {/* Privacy note — compact */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white/3 border border-white/8">
        <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        <p className="text-white/35 text-xs leading-relaxed">
          Your details are only used to process this booking.
          Payments are secured by Paystack — we never store card info.
        </p>
      </div>

      {/* Actions */}
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
          type="submit"
          id="btn-customer-continue"
          className="btn-primary flex-1 py-3.5 text-sm flex items-center justify-center gap-1.5"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </form>
  )
}
