"use client"
// components/StepDateTime.tsx

import { useState, useEffect, useCallback, useRef } from "react"
import Calendar from "react-calendar"
import { format, addDays, isBefore, startOfDay, addMinutes } from "date-fns"
import clsx from "clsx"
import { BookingFormData, TIME_SLOTS } from "@/types"
import { isDateAvailable } from "@/lib/booking"
import "react-calendar/dist/Calendar.css"

const SESSION_RATE = 300
const DURATION_MINUTES = 150 // locked at 2h 30m

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
  const [slots, setSlots] = useState<Record<string, SlotStatus>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)

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
      const res = await fetch(`/api/anolla/availability?date=${date}&duration=${DURATION_MINUTES}`)
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

  const isDisabledDate = (date: Date) =>
    isBefore(date, startOfDay(new Date())) || !isDateAvailable(format(date, "yyyy-MM-dd"))

  const endTime = selectedTime ? getEndTimestamp(dateStr, selectedTime, DURATION_MINUTES) : null
  const price = SESSION_RATE
  const canProceed = !!selectedDate && !!selectedTime

  const handleNext = () => {
    if (!canProceed) return
    updateForm({
      sessionDate: dateStr,
      startTime: selectedTime,
      durationHours: DURATION_MINUTES / 60, // 2.5
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
          minDate={addDays(new Date(), 0)}
          maxDate={addDays(new Date(), 90)}
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

            {selectedTime && endTime && (
              <div className="mt-3 p-2.5 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-white/80 text-xs font-medium text-center">
                  {selectedTime} → {endTime} · {minutesToDisplay(DURATION_MINUTES)}
                </p>
              </div>
            )}
          </div>

          {/* Price preview + Continue */}
          {selectedTime && (
            <div ref={pricingRef} className="scroll-mt-20">
              <div className="card bg-black/30 backdrop-blur-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/55 text-sm">Session total</span>
                  <span className="font-bold text-lg text-white">
                    GHS {price.toLocaleString()}
                  </span>
                </div>
              </div>

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
