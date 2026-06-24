'use client'
// app/(app)/booking/simulate-payment/error.tsx

import { useEffect } from 'react'

export default function SimulatePaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Simulate Payment Error]:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="card bg-red-500/10 border border-red-500/25 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-14 h-14 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payment Gateway Error</h2>
        <p className="text-white/50 text-sm mb-6 leading-relaxed">
          An error occurred in the payment gateway. Your booking has not been charged.
          Please try again or contact us directly.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="btn-primary py-2.5 px-5 text-sm"
          >
            Try again
          </button>
          <a href="/booking" className="btn-secondary py-2.5 px-5 text-sm">
            Go Back
          </a>
        </div>
      </div>
    </div>
  )
}
