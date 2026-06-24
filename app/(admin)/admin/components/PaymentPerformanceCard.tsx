"use client"
// app/(admin)/admin/components/PaymentPerformanceCard.tsx

interface PaymentPerformanceCardProps {
  baseAmount?: number
  paidAmount?: number
}

export default function PaymentPerformanceCard({
  baseAmount = 300,
  paidAmount = 294.15,
}: PaymentPerformanceCardProps) {
  const percentage = (paidAmount / baseAmount) * 100
  const deduction = baseAmount - paidAmount
  const deductionPercentage = ((deduction / baseAmount) * 100).toFixed(2)

  const formatGHS = (val: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  }

  // Calculate SVG circle parameters
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[280px]">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
          Payment Percentage
        </h3>
      </div>

      {/* Progress Ring */}
      <div className="relative mb-6">
        <svg width="160" height="160" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#paymentGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.5s ease-in-out",
            }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="paymentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Central percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>
            {percentage.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Subtext */}
      <div className="text-center mb-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          of {formatGHS(baseAmount)} paid ({formatGHS(paidAmount)})
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="text-center p-3 rounded-lg" style={{ background: "var(--bg-overlay)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Amount Paid
          </p>
          <p className="text-lg font-semibold" style={{ color: "#10B981" }}>
            {formatGHS(paidAmount)}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg" style={{ background: "var(--bg-overlay)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
            Deduction
          </p>
          <p className="text-lg font-semibold" style={{ color: "#EF4444" }}>
            {formatGHS(deduction)}
          </p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {deductionPercentage}%
          </p>
        </div>
      </div>
    </div>
  )
}
