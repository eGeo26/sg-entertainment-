"use client"
// app/(admin)/admin/loading.tsx

export default function AdminLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin" />
        </div>
        <p className="text-xs text-white/30 tracking-widest uppercase font-medium animate-pulse">
          Fetching records...
        </p>
      </div>
    </div>
  )
}
