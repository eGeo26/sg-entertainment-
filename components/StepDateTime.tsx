"use client"
// components/StepDateTime.tsx
// Step 1: Pick date → duration auto-scrolls into view → pick time → proceed

import { useState, useEffect, useCallback, useRef } from "react"
import Calendar from "react-calendar"
import { format, addDays, isBefore, startOfDay, addMinutes } from "date-fns"
import clsx from "clsx"
import { BookingFormData, TIME_SLOTS } from "@/types"
import { isDateAvailable } from "@/lib/booking"
import "react-calendar/dist/Calendar.css"

const SESSION_RATE = 300
const MIN_MINUTES = 150   // 2h 30m
const MAX_MINUTES = 720   // 12h
const STEP_MINUTES = 30

function minutesToDisplay(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return min === 0 ? `${h}h` : `${h}h ${min}m`
}

function calcPrice(minutes: number): number {
  if (minutes <= MIN_MINUTES) return SESSION_RATE
  return SESSION_RATE + Math.ceil((minutes - MIN_MINUTES) / 30) * 60
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
  const [durationMinutes, setDurationMinutes] = useState<number>(
    form.durationHours ? Math.round(form.durationHours * 60) : MIN_MINUTES
  )
  const [slots, setSlots] = useState<Record<string, SlotStatus>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Refs for auto-scroll targets
  const durationRef = useRef<HTMLDivElement>(null)
  const timeSlotsRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

  // Auto-scroll to duration picker when date is selected
  const prevDate = useRef<Date | null>(null)
  useEffect(() => {
    if (selectedDate && prevDate.current?.getTime() !== selectedDate.getTime()) {
      prevDate.current = selectedDate
      setTimeout(() => {
        durationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
    }
  }, [selectedDate])

  // Auto-scroll to time slots when date is picked
  useEffect(() => {
    if (dateStr) {
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 350)
    }
  }, [dateStr])

  // Auto-scroll to pricing + continue when time is selected
  useEffect(() => {
    if (selectedTime) {
      setTimeout(() => {
        pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }, 150)
    }
  }, [selectedTime])

  // Fetch slot availability
  const fetchAvailability = useCallback(async (date: string, dur: number) => {
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/anolla/availability?date=${date}&duration=${dur}`)
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
    if (dateStr) fetchAvailability(dateStr, durationMinutes)
  }, [dateStr, durationMinutes, fetchAvailability])

  const isDisabledDate = (date: Date) =>
    isBefore(date, startOfDay(new Date())) || !isDateAvailable(format(date, "yyyy-MM-dd"))

  const endTime = selectedTime ? getEndTimestamp(dateStr, selectedTime, durationMinutes) : null
  const price = calcPrice(durationMinutes)
  const canProceed = !!selectedDate && !!selectedTime

  const handleNext = () => {
    if (!canProceed) return
    updateForm({
      sessionDate: dateStr,
      startTime: selectedTime,
      durationHours: durationMinutes / 60,
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

      {/* Duration + Time visible as soon as date is chosen */}
      {selectedDate && (
        <>
          {/* Duration */}
          <div ref={durationRef} className="card bg-black/40 backdrop-blur-sm scroll-mt-20">
            <h2 className="text-base font-semibold text-white mb-3">Session Duration</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDurationMinutes((d) => Math.max(MIN_MINUTES, d - STEP_MINUTES))}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center font-semibold"
                aria-label="Decrease duration"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-white">
                  {minutesToDisplay(durationMinutes)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDurationMinutes((d) => Math.min(MAX_MINUTES, d + STEP_MINUTES))}
                className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors flex items-center justify-center font-semibold"
                aria-label="Increase duration"
              >
                +
              </button>
            </div>
            <p className="text-white/30 text-xs text-center mt-2">
              Min 2h 30m · Max 12h · Steps of 30 min
            </p>
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
                  {selectedTime} → {endTime} · {minutesToDisplay(durationMinutes)}
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
