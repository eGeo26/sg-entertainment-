// app/admin/components/StatCard.tsx

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  accent?: "gold" | "green" | "red" | "amber" | "blue"
  icon?: React.ReactNode
  loading?: boolean
}

const ICON_COLORS: Record<string, string> = {
  gold:  "var(--sg-gold)",
  green: "#34d399",
  red:   "var(--sg-crimson)",
  amber: "#fbbf24",
  blue:  "#60a5fa",
}

const ICON_BG: Record<string, string> = {
  gold:  "rgba(197,168,128,0.10)",
  green: "rgba(52,211,153,0.10)",
  red:   "rgba(158,0,0,0.12)",
  amber: "rgba(251,191,36,0.10)",
  blue:  "rgba(96,165,250,0.10)",
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
      <div
        className="glass-card p-5 animate-pulse"
        style={{ minHeight: "120px" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="h-2.5 rounded-full w-20" style={{ background: "var(--bg-hover)" }} />
          <div className="w-8 h-8 rounded-xl" style={{ background: "var(--bg-hover)" }} />
        </div>
        <div className="h-8 rounded-lg w-28 mb-2" style={{ background: "var(--bg-hover)" }} />
        <div className="h-2 rounded-full w-16" style={{ background: "var(--bg-overlay)" }} />
      </div>
    )
  }

  return (
    <div
      className="glass-card p-5 cursor-default transition-all duration-200"
      style={{ minHeight: "120px" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "var(--border-hover)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "var(--border)"
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
        {icon && (
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: ICON_BG[accent],
              color: ICON_COLORS[accent],
            }}
          >
            {icon}
          </span>
        )}
      </div>

      <p
        className="text-3xl font-light tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>

      {subtext && (
        <p
          className="text-[11px] mt-1.5 tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          {subtext}
        </p>
      )}

      {/* Bottom accent line */}
      <div
        className="mt-4 h-px w-full rounded-full opacity-40"
        style={{ background: `linear-gradient(to right, ${ICON_COLORS[accent]}, transparent)` }}
      />
    </div>
  )
}
