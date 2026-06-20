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

const STATUS_STYLES: Record<StatusType, { bg: string; text: string; dot: string; label: string }> = {
  AWAITING_PAYMENT: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", label: "Awaiting Payment" },
  CONFIRMED:        { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Confirmed" },
  CANCELLED:        { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", label: "Cancelled" },
  REFUNDED:         { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Refunded" },
  FAILED:           { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", label: "Failed" },
  EXPIRED:          { bg: "bg-white/10", text: "text-white/40", dot: "bg-white/30", label: "Expired" },
  PENDING:          { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", label: "Pending" },
  SUCCESS:          { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", label: "Success" },
  ABANDONED:        { bg: "bg-white/10", text: "text-white/40", dot: "bg-white/30", label: "Abandoned" },
  REVERSED:         { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400", label: "Reversed" },
  NO_SHOW:          { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400", label: "No Show" },
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
