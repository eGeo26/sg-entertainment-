// lib/booking.ts
// Booking utilities — pricing, date/time helpers, validation

import { format, addHours, addMinutes, parseISO, isAfter, isBefore, startOfDay } from "date-fns"
import { EQUIPMENT_OPTIONS } from "@/types"

// Session pricing:
//   Minimum session: 2h 30m = GHS 300
//   Each additional 30 min: +GHS 60
const SESSION_BASE_RATE = 300      // GHS for first 2h 30m
const MIN_MINUTES = 150            // 2h 30m minimum
const RATE_PER_30MIN = 60          // GHS per additional 30 min
const MAX_HOURS = parseInt(process.env.NEXT_PUBLIC_MAX_HOURS ?? "12")

// ── Pricing ───────────────────────────────────────────────────────────────────

export function calcSessionBase(durationHours: number): number {
  const durationMinutes = Math.round(durationHours * 60)
  if (durationMinutes <= MIN_MINUTES) return SESSION_BASE_RATE
  const extra30s = Math.ceil((durationMinutes - MIN_MINUTES) / 30)
  return SESSION_BASE_RATE + extra30s * RATE_PER_30MIN
}

export function calculateTotal(
  durationHours: number,
  selectedEquipment: string[]
): { baseRate: number; equipmentTotal: number; total: number; breakdown: string[] } {
  const baseRate = calcSessionBase(durationHours)
  const durationDisplay = minutesToDisplay(Math.round(durationHours * 60))

  const breakdown: string[] = [
    `Studio time (${durationDisplay}): GHS ${baseRate}`,
  ]

  let equipmentTotal = 0
  for (const id of selectedEquipment) {
    const item = EQUIPMENT_OPTIONS.find((e) => e.id === id)
    if (item) {
      equipmentTotal += item.priceGHS
      breakdown.push(`${item.label}: GHS ${item.priceGHS}`)
    }
  }

  return {
    baseRate,
    equipmentTotal,
    total: baseRate + equipmentTotal,
    breakdown,
  }
}

function minutesToDisplay(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Date/time ─────────────────────────────────────────────────────────────────

export function buildDateTime(date: string, time: string): Date {
  return parseISO(`${date}T${time}:00`)
}

export function getEndTime(date: string, startTime: string, durationHours: number): string {
  const durationMinutes = Math.round(durationHours * 60)
  const start = buildDateTime(date, startTime)
  const end = addMinutes(start, durationMinutes)
  return format(end, "HH:mm")
}

export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE, d MMMM yyyy")
}

export function formatDisplayTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const d = new Date()
  d.setHours(hours, minutes)
  return format(d, "hh:mm a")
}

export function isDateAvailable(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const now = new Date()
  const leadHours = parseInt(process.env.NEXT_PUBLIC_BOOKING_LEAD_HOURS ?? "2")
  const minDate = addHours(now, leadHours)
  return isAfter(date, startOfDay(minDate))
}

export function buildISODateTime(date: string, time: string): string {
  return `${date}T${time}:00+00:00`
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateBookingMinutes(minutes: number): boolean {
  return minutes >= MIN_MINUTES && minutes <= MAX_HOURS * 60
}

export function validateBookingHours(hours: number): boolean {
  return validateBookingMinutes(Math.round(hours * 60))
}

export function validateGhanaPhone(phone: string): boolean {
  // Ghana mobile: +233 2X XXXXXXX or 02X XXXXXXX (MTN, Vodafone, AirtelTigo)
  const cleaned = phone.replace(/\s+/g, "")
  return /^(\+233|0)(2[0-9]|5[0-9])\d{7}$/.test(cleaned)
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "")
  if (cleaned.startsWith("0")) return "+233" + cleaned.slice(1)
  if (cleaned.startsWith("233")) return "+" + cleaned
  return cleaned
}

// ── Reference generation ──────────────────────────────────────────────────────

export function generatePaystackReference(bookingId: string): string {
  const timestamp = Date.now()
  const shortId = bookingId.slice(0, 8).toUpperCase()
  return `SG-${shortId}-${timestamp}`
}
