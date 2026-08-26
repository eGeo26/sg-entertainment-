"use client"
// components/StepDateTime.tsx

import { useState, useEffect, useCallback, useRef } from "react"
import Calendar from "react-calendar"
import { format, addDays, addMinutes } from "date-fns"
import clsx from "clsx"
import { BookingFormData, TIME_SLOTS } from "@/types"
import { isDateAvailable, toGhanaDateString, EXTRA_HOUR_RATE_GHS } from "@/lib/booking"
import "react-calendar/dist/Calendar.css"

const SESSION_RATE = 300
const DURATION_MINUTES = 150 // locked at 2h 30m
const MAX_EXTENSION_HOURS = 8 // maximum extra whole hours selectable

function minutesToDisplay(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h}h` : `${h}h ${min}m`
}

function getEndTimestamp(date: string, startTime: string, durationMinutes: number): string {
  const [yr, mo, dy] = date.split("-").map(Number)
  const [h, m] = startTime.split(":").map(Number)
  const start = new Date(yr, mo - 1, dy, h, m, 0)
  return format(addMinutes(start, durationMinutes), "HH:mm")
}

interface Props {
  form: Partial<BookingFormData>
  updateForm: (u: Partial<BookingFormData>) => void
  onNext: () => void
}

type SlotStatus = "available" | "unavailable" | "loading"

export default function StepDateTime({ form, updateForm, onNext }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!form.sessionDate) return null
    const [yr, mo, dy] = form.sessionDate.split("-").map(Number)
    return new Date(yr, mo - 1, dy)
  })
  const [selectedTime, setSelectedTime] = useState<string>(form.startTime ?? "")
  const [extensionHours, setExtensionHours] = useState<number>(form.extensionHours ?? 0)
  const [slots, setSlots] = useState<Record<string, SlotStatus>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  // Closed dates: map of "YYYY-MM-DD" -> note (or null)
  const [closedDates, setClosedDates] = useState<Map<string, string | null>>(new Map())

  // Refs for auto-scroll targets
  const timeSlotsRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

  // Auto-scroll to time slots when date is selected
  const prevDate = useRef<Date | null>(null)
  useEffect(() => {
    if (selectedDate && prevDate.current?.getTime() !== selectedDate.getTime()) {
      prevDate.current = selectedDate
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
    }
  }, [selectedDate])

  // Auto-scroll to pricing + continue when time is selected
  useEffect(() => {
    if (selectedTime) {
      setTimeout(() => {
        pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 150)
    }
  }, [selectedTime])

  // Fetch slot availability
  const fetchAvailability = useCallback(async (date: string) => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/availability?date=${date}&duration=${DURATION_MINUTES}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const statusMap: Record<string, SlotStatus> = {}
      for (const slot of data.slots ?? []) {
        statusMap[slot.start.slice(11, 16)] = slot.available ? "available" : "unavailable"
      }
      for (const t of TIME_SLOTS) {
        if (!statusMap[t]) statusMap[t] = "available"
      }
      setSlots(statusMap)
    } catch {
      const fallback: Record<string, SlotStatus> = {}
      for (const t of TIME_SLOTS) fallback[t] = "available"
      setSlots(fallback)
    } finally {
      setLoadingSlots(false)
    }
  }, [])

  useEffect(() => {
    if (dateStr) fetchAvailability(dateStr)
  }, [dateStr, fetchAvailability])

  // Fetch closed dates from the public API (no auth needed)
  useEffect(() => {
    async function loadClosedDates() {
      try {
        const res = await fetch("/api/closed-dates", { cache: "no-store" })
        if (!res.ok) return
        const { closedDates: list } = await res.json()
        const map = new Map<string, string | null>(
          (list ?? []).map((cd: { date: string; note: string | null }) => [cd.date, cd.note])
        )
        setClosedDates(map)
      } catch {
        // Non-critical — calendar degrades gracefully without closed-date markers
      }
    }
    loadClosedDates()
  }, [])

  // "Today" anchored to Ghana (Africa/Accra, UTC+0) — same value for every visitor worldwide.
  // This ensures minDate, maxDate, and tileDisabled all use the studio's local calendar.
  const ghanaToday = toGhanaDateString() // "YYYY-MM-DD"
  const [gY, gM, gD] = ghanaToday.split("-").map(Number)
  const ghanaTodayDate = new Date(gY, gM - 1, gD) // local midnight, same wall-clock day as Accra

  const isDisabledDate = (date: Date) => {
    const ds = format(date, "yyyy-MM-dd")
    // Disable past dates (anchored to Ghana today, not visitor clock)
    if (ds < ghanaToday) return true
    // Disable manually-closed dates
    if (closedDates.has(ds)) return true
    // Disable dates the isDateAvailable helper marks unavailable
    return !isDateAvailable(ds)
  }

  const endTime = selectedTime ? getEndTimestamp(dateStr, selectedTime, DURATION_MINUTES) : null
  // Extended end time includes the extra hours
  const totalDurationMinutes = DURATION_MINUTES + extensionHours * 60
  const extendedEndTime = selectedTime ? getEndTimestamp(dateStr, selectedTime, totalDurationMinutes) : null
  const price = SESSION_RATE
  const extensionTotal = extensionHours * EXTRA_HOUR_RATE_GHS
  const grandTotal = price + extensionTotal
  const canProceed = !!selectedDate && !!selectedTime

  const handleNext = () => {
    if (!canProceed) return
    updateForm({
      sessionDate: dateStr,
      startTime: selectedTime,
      durationHours: totalDurationMinutes / 60,  // e.g. 4.5 for 2.5h base + 2h extension
      extensionHours,
    })
    onNext()
  }

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <div className="card bg-black/40 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-white mb-3">Choose a Date</h2>
        <Calendar
          onChange={(val) => {
            setSelectedDate(val as Date)
            setSelectedTime("")
          }}
          value={selectedDate}
          tileDisabled={({ date }) => isDisabledDate(date)}
          tileContent={({ date, view }) => {
            if (view !== "month") return null
            const ds = format(date, "yyyy-MM-dd")
            const note = closedDates.get(ds)
            if (note === undefined) return null // date not closed
            const tooltipText = note
              ? `Closed: ${note}`
              : "Studio closed — no bookings available"
            return (
              <span
                title={tooltipText}
                aria-label={tooltipText}
                className="block text-[8px] leading-none font-bold text-amber-400 mt-0.5 uppercase tracking-tight"
              >
                Closed
              </span>
            )
          }}
          minDate={ghanaTodayDate}
          maxDate={addDays(ghanaTodayDate, 90)}
          locale="en-GH"
        />

      </div>

      {/* Info: Duration (Fixed) + Time Slots */}
      {selectedDate && (
        <>
          {/* Duration locked info */}
          <div className="card bg-black/40 backdrop-blur-sm">
            <h2 className="text-base font-semibold text-white mb-1">Session Duration</h2>
            <p className="text-studio-gold font-bold text-lg">2 hr 30 min session</p>
          </div>

          {/* Time slots */}
          <div ref={timeSlotsRef} className="card bg-black/40 backdrop-blur-sm scroll-mt-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Start Time</h2>
              {loadingSlots && (
                <span className="text-xs text-white/30 animate-pulse">Checking…</span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((time) => {
                const status = slots[time] ?? "loading"
                const isSelected = selectedTime === time
                const isUnavailable = status === "unavailable"
                const isLoading = status === "loading"
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={isUnavailable || isLoading}
                    onClick={() => setSelectedTime(time)}
                    className={clsx(
                      "py-2 px-1 rounded-lg text-xs font-medium transition-all duration-150",
                      isSelected
                        ? "bg-studio-gold text-black font-bold"
                        : isUnavailable
                        ? "bg-white/3 text-white/20 cursor-not-allowed line-through"
                        : isLoading
                        ? "skeleton text-transparent"
                        : "bg-white/5 border border-white/10 text-white hover:border-white/40 hover:bg-white/10"
                    )}
                  >
                    {time}
                  </button>
                )
              })}
            </div>

            {selectedTime && extendedEndTime && (
              <div className="mt-3 p-2.5 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-white/80 text-xs font-medium text-center">
                  {selectedTime} → {extendedEndTime} · {minutesToDisplay(totalDurationMinutes)}
                </p>
              </div>
            )}
          </div>

          {/* Extension / top-up stepper — shown after time is selected */}
          {selectedTime && (
            <div className="card bg-black/40 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Need more time?</h2>
                  <p className="text-white/40 text-xs mt-0.5">Add extra whole hours · GHS {EXTRA_HOUR_RATE_GHS}/hr</p>
                </div>
                {extensionHours > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/20">
                    +{extensionHours}h added
                  </span>
                )}
              </div>

              {/* Stepper */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  type="button"
                  id="btn-ext-minus"
                  onClick={() => setExtensionHours((h) => Math.max(0, h - 1))}
                  disabled={extensionHours === 0}
                  aria-label="Remove one extra hour"
                  className={clsx(
                    "w-10 h-10 rounded-xl border text-lg font-bold transition-all flex items-center justify-center",
                    extensionHours === 0
                      ? "border-white/8 text-white/20 cursor-not-allowed"
                      : "border-white/20 text-white hover:border-white/40 hover:bg-white/5 active:scale-95"
                  )}
                >
                  −
                </button>
                <div className="flex flex-col items-center min-w-[4rem]">
                  <span className="text-2xl font-bold text-white tabular-nums">{extensionHours}</span>
                  <span className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">
                    {extensionHours === 1 ? "extra hour" : "extra hours"}
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-ext-plus"
                  onClick={() => setExtensionHours((h) => Math.min(MAX_EXTENSION_HOURS, h + 1))}
                  disabled={extensionHours >= MAX_EXTENSION_HOURS}
                  aria-label="Add one extra hour"
                  className={clsx(
                    "w-10 h-10 rounded-xl border text-lg font-bold transition-all flex items-center justify-center",
                    extensionHours >= MAX_EXTENSION_HOURS
                      ? "border-white/8 text-white/20 cursor-not-allowed"
                      : "border-white/20 text-white hover:border-white/40 hover:bg-white/5 active:scale-95"
                  )}
                >
                  +
                </button>
              </div>

              {/* Live price summary */}
              <div className="p-3 bg-white/4 border border-white/8 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Base session (2h 30m)</span>
                  <span className="text-white/80">GHS {SESSION_RATE.toLocaleString()}</span>
                </div>
                {extensionHours > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-300/80">+{extensionHours} hr{extensionHours > 1 ? "s" : ""} extension</span>
                    <span className="text-amber-300/80">
                      {extensionHours} × GHS {EXTRA_HOUR_RATE_GHS} = GHS {extensionTotal.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-white/8">
                  <span className="text-white text-sm font-semibold">
                    {extensionHours > 0
                      ? `Total · ${minutesToDisplay(totalDurationMinutes)}`
                      : `Session total · ${minutesToDisplay(DURATION_MINUTES)}`}
                  </span>
                  <span className="text-white font-bold text-base">GHS {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Price preview + Continue */}
          {selectedTime && (
            <div ref={pricingRef} className="scroll-mt-20">

              <button
                ref={continueRef}
                type="button"
                onClick={handleNext}
                id="btn-datetime-continue"
                className="btn-primary w-full py-3.5 text-sm"
              >
                Continue
                <svg className="w-4 h-4 ml-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}

      {/* Prompt when no date yet */}
      {!selectedDate && (
        <p className="text-white/30 text-xs text-center py-2">
          Select a date above to continue
        </p>
      )}
    </div>
  )
}
