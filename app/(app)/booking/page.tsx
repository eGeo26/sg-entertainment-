// app/booking/page.tsx
import type { Metadata } from "next"
import { Suspense } from "react"
import BookingFlow from "@/components/BookingFlow"
import ClosedDateBanner from "@/components/ClosedDateBanner"

export const metadata: Metadata = {
  title: "Book a Recording Session | S&G Studios, Accra",
  description:
    "Reserve your professional studio session at S&G Studios in Accra. Choose your date and time, add equipment, and pay securely via Hubtel Mobile Money or Card. Sessions from GHS 300.",
  openGraph: {
    title: "Book a Recording Session | S&G Studios, Accra",
    description:
      "Reserve your studio session online — pay securely via Hubtel. Sessions from GHS 300.",
    url: "https://sngent.com/booking",
  },
}


export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm tracking-wider uppercase font-medium">Loading Booking Portal...</p>
      </div>
    }>
      {/* Banner only renders when TODAY (Ghana time) is a closed date */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <ClosedDateBanner />
      </div>
      <BookingFlow />
    </Suspense>
  )
}
