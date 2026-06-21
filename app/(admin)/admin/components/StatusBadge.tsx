// app/admin/components/StatusBadge.tsx

type StatusType =
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "REFUNDED"
  | "FAILED"
  | "EXPIRED"
  | "PENDING"
  | "SUCCESS"
  | "ABANDONED"
  | "REVERSED"
  | "NO_SHOW"
  | "REVIEWED"
  | "GRANTED"

// Neutral, low-saturation palette — no loud red/green/yellow
const STATUS_STYLES: Record<StatusType, { bg: string; text: string; dot: string; label: string }> = {
  AWAITING_PAYMENT: { bg: "bg-white/5",  text: "text-white/50",  dot: "bg-white/40",  label: "Pending Payment" },
  CONFIRMED:        { bg: "bg-white/8",  text: "text-white/80",  dot: "bg-white/60",  label: "Confirmed" },
  CANCELLED:        { bg: "bg-white/5",  text: "text-white/35",  dot: "bg-white/25",  label: "Cancelled" },
  REFUNDED:         { bg: "bg-white/5",  text: "text-white/45",  dot: "bg-white/30",  label: "Refunded" },
  FAILED:           { bg: "bg-white/5",  text: "text-white/35",  dot: "bg-white/20",  label: "Failed" },
  EXPIRED:          { bg: "bg-white/[0.03]", text: "text-white/30", dot: "bg-white/20", label: "Expired" },
  PENDING:          { bg: "bg-white/5",  text: "text-white/50",  dot: "bg-white/40",  label: "Pending" },
  SUCCESS:          { bg: "bg-white/8",  text: "text-white/80",  dot: "bg-white/60",  label: "Success" },
  ABANDONED:        { bg: "bg-white/[0.03]", text: "text-white/30", dot: "bg-white/20", label: "Abandoned" },
  REVERSED:         { bg: "bg-white/5",  text: "text-white/45",  dot: "bg-white/30",  label: "Reversed" },
  NO_SHOW:          { bg: "bg-white/5",  text: "text-white/40",  dot: "bg-white/25",  label: "No Show" },
  REVIEWED:         { bg: "bg-white/8",  text: "text-white/70",  dot: "bg-white/50",  label: "Reviewed" },
  GRANTED:          { bg: "bg-white/8",  text: "text-white/85",  dot: "bg-white/65",  label: "Granted" },
}

interface StatusBadgeProps {
  status: StatusType | string
  size?: "sm" | "md"
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status as StatusType] ?? {
    bg: "bg-white/5",
    text: "text-white/40",
    dot: "bg-white/30",
    label: status,
  }

  const sizeClasses = size === "sm"
    ? "text-[9px] px-1.5 py-0.5"
    : "text-[10px] px-2 py-1"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium tracking-widest uppercase ${style.bg} ${style.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
      {style.label}
    </span>
  )
}
