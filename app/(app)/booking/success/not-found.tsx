import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div className="card bg-black/40 border border-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <svg className="w-16 h-16 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Booking not found</h2>
        <p className="text-white/50 text-sm mb-6">
          We couldn't find the booking confirmation you're looking for.
        </p>
        <Link href="/booking" className="btn-primary py-2.5 px-5 text-sm inline-block">
          Back to booking
        </Link>
      </div>
    </div>
  )
}
