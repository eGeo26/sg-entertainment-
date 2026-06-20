// app/admin/components/StatCard.tsx

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  accent?: "gold" | "green" | "red" | "amber" | "blue"
  icon?: React.ReactNode
  loading?: boolean
}

const ACCENT_COLORS = {
  gold: "border-white",
  green: "border-white",
  red: "border-white",
  amber: "border-white/30",
  blue: "border-white/60",
}

const ACCENT_TEXT = {
  gold: "text-white",
  green: "text-white",
  red: "text-white/60",
  amber: "text-white/50",
  blue: "text-white/80",
}

export default function StatCard({
  label,
  value,
  subtext,
  accent = "gold",
  icon,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={`bg-white/[0.02] backdrop-blur-md border border-white/5 border-l-4 ${ACCENT_COLORS[accent]} rounded-xl p-5 animate-pulse`}>
        <div className="h-3 bg-white/10 rounded w-24 mb-4" />
        <div className="h-8 bg-white/10 rounded w-32 mb-2" />
        <div className="h-2 bg-white/10 rounded w-20" />
      </div>
    )
  }

  return (
    <div className={`bg-white/[0.02] backdrop-blur-md border border-white/5 border-l-4 ${ACCENT_COLORS[accent]} rounded-xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-medium tracking-widest uppercase text-white/40">{label}</p>
        {icon && (
          <span className={`${ACCENT_TEXT[accent]} opacity-60`}>{icon}</span>
        )}
      </div>
      <p className={`text-3xl font-light tracking-tight ${ACCENT_TEXT[accent]}`}>{value}</p>
      {subtext && (
        <p className="text-[11px] text-white/30 mt-1.5 tracking-wide">{subtext}</p>
      )}
    </div>
  )
}
