// app/(app)/booking/success/page.tsx — Payment success page
import { Suspense } from "react"
import SuccessContent from "@/components/SuccessContent"

export default function BookingSuccessPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <Suspense fallback={<LoadingState />}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center">
      <div className="w-14 h-14 border-2 border-white/10 border-t-white rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white/50 text-sm">Confirming your booking…</p>
    </div>
  )
}
