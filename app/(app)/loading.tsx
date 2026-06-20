"use client"
// app/(app)/loading.tsx

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] relative z-20">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin" />
        </div>
        <p className="text-xs text-white/40 tracking-widest uppercase font-medium animate-pulse">
          Loading S&G Studios...
        </p>
      </div>
    </div>
  )
}
