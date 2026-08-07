// app/booking/page.tsx
import { Suspense } from "react"
import BookingFlow from "@/components/BookingFlow"
import ClosedDateBanner from "@/components/ClosedDateBanner"

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
