"use client"

import { useState } from "react"
import StatCard from "./StatCard"

export interface StatItem {
  label: string
  value: string | number
  subtext?: string
  accent?: "gold" | "green" | "red" | "amber" | "blue"
  icon?: React.ReactNode
  loading?: boolean
}

interface CollapsibleStatRowProps {
  stats: StatItem[]
}

export default function CollapsibleStatRow({ stats }: CollapsibleStatRowProps) {
  const [expanded, setExpanded] = useState(false)

  if (!stats || stats.length === 0) return null

  return (
    <div>
      {/* Mobile unified summary card & collapsible row */}
      <div className="block sm:hidden">
        <div
          className="glass-card p-4 transition-all duration-300 relative overflow-hidden"
          style={{ borderColor: expanded ? "var(--sg-gold)" : "var(--border)" }}
        >
          {/* Header Toggle Row */}
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between text-left focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">
                Summary Metrics
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                {stats.length} metrics
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs font-semibold text-amber-400">
              <span>{expanded ? "Collapse" : "Expand"}</span>
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  expanded ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </button>

          {/* COLLAPSED READOUT: Compact summary readout */}
          {!expanded && (
            <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
              {stats.map((s, idx) => (
                <div key={idx} className="bg-white/5 rounded-lg p-2 flex flex-col justify-center">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 font-medium truncate">
                    {s.label}
                  </span>
                  <span className="text-sm font-semibold text-white mt-0.5 truncate">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* EXPANDED CONTENT: Staggered Full Stat Cards */}
          {expanded && (
            <div className="mt-4 space-y-3 pt-3 border-t border-white/10 animate-fadeIn">
              {stats.map((s, idx) => (
                <div
                  key={idx}
                  className="transition-all duration-300 transform translate-y-0 opacity-100"
                  style={{
                    animationDelay: `${idx * 60}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <StatCard {...s} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop / Tablet standard row */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <StatCard key={idx} {...s} />
        ))}
      </div>
    </div>
  )
}
