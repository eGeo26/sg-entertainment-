"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function PaymentFailedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference")

  useEffect(() => {
    // Show error toast on mount
    // toast.error("Payment was cancelled or failed")
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 py-8">
      <div className="card bg-black/40 border border-red-500/20 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Payment Unsuccessful</h1>
        <p className="text-white/50 text-sm mb-6">
          Your payment was cancelled or declined. No charges were made to your account.
        </p>

        {reference && (
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 mb-6">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1">Reference</p>
            <p className="font-mono text-white/60 text-sm">{reference}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full btn-primary py-3 text-sm"
          >
            Try Again
          </button>
          <Link href="/booking" className="btn-secondary w-full py-3 text-sm inline-block text-center">
            Start New Booking
          </Link>
        </div>
      </div>
    </div>
  )
}
