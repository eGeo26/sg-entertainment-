// lib/booking.ts
// Booking utilities — pricing, date/time helpers, validation

import { format, addMinutes } from "date-fns"
import { EQUIPMENT_OPTIONS } from "@/types"

// Session pricing:
//   Minimum session: 2h 30m = GHS 300
//   Each additional 30 min: +GHS 60
const SESSION_BASE_RATE = 300      // GHS for first 2h 30m
const MIN_MINUTES = 150            // 2h 30m minimum
const RATE_PER_30MIN = 60          // GHS per additional 30 min
const MAX_HOURS = parseInt(process.env.NEXT_PUBLIC_MAX_HOURS ?? "12")

// Shared hold / expiry window for pending (AWAITING_PAYMENT) bookings
export const PENDING_BOOKING_WINDOW_MINUTES = 45
export const PENDING_BOOKING_WINDOW_MS = PENDING_BOOKING_WINDOW_MINUTES * 60 * 1000

export async function deleteStaleAwaitingPaymentBookings(supabase: any) {
  const cutoffTimeIso = new Date(Date.now() - PENDING_BOOKING_WINDOW_MS).toISOString()
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("status", "AWAITING_PAYMENT")
    .lt("created_at", cutoffTimeIso)

  return error
}


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
  const [yr, mo, dy] = date.split("-").map(Number)
  const [h, m] = time.split(":").map(Number)
  return new Date(yr, mo - 1, dy, h, m, 0)
}

export function getEndTime(date: string, startTime: string, durationHours: number): string {
  const durationMinutes = Math.round(durationHours * 60)
  const start = buildDateTime(date, startTime)
  const end = addMinutes(start, durationMinutes)
  return format(end, "HH:mm")
}

export function formatDisplayDate(dateStr: string): string {
  const [yr, mo, dy] = dateStr.split("-").map(Number)
  const d = new Date(yr, mo - 1, dy)
  return format(d, "EEEE, d MMMM yyyy")
}

export function formatDisplayTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return format(d, "hh:mm a")
}

/**
 * Returns today's date string (YYYY-MM-DD) in Ghana local time (Africa/Accra, UTC+0, no DST).
 * Using Intl guarantees the same result for every visitor regardless of their browser/OS timezone.
 */
export function toGhanaDateString(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Africa/Accra" })
  // en-CA uses YYYY-MM-DD format, which is what we need for ISO date comparisons
}

/**
 * Returns the current time in Ghana as { hours, minutes } (24-hour).
 * Used to apply the same-day lead-hours check without touching cross-day logic.
 */
export function getGhanaTime(): { hours: number; minutes: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Accra",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now)
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0")
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0")
  return { hours: h, minutes: m }
}

/**
 * Checks whether a given date string (YYYY-MM-DD) is available for booking.
 *
 * Rules (all anchored to Africa/Accra, UTC+0):
 *  - Past dates:   always false.
 *  - Future dates: always true — zero lead-hours restriction applied cross-day.
 *  - Today:        true only if at least one TIME_SLOT (last = 23:00 = 1380 min)
 *                  remains >= leadHours ahead of the current Ghana clock.
 *                  e.g. with 2h lead: today greys out at 21:00 Ghana time because
 *                  cutoff (21:00 + 2h = 23:00) == last slot, so no slot is strictly
 *                  ahead. At 21:01 the cutoff exceeds 23:00 → no slots left today.
 *
 * Lead-hours NEVER touches tomorrow or any future date — that was the original bug.
 */
export function isDateAvailable(dateStr: string): boolean {
  const todayGhana = toGhanaDateString()
  if (dateStr < todayGhana) return false  // past date — never bookable
  if (dateStr > todayGhana) return true   // future date — always fully bookable

  // ── Same day (today in Ghana) ────────────────────────────────────────────
  // Today is available only if at least one TIME_SLOT is still reachable
  // within the lead-hours window. The last slot starts at 23:00 (1380 min).
  // If the lead-hours cutoff has already passed 23:00, today has no slots left.
  const { hours, minutes } = getGhanaTime()
  const leadHours     = parseInt(process.env.NEXT_PUBLIC_BOOKING_LEAD_HOURS ?? "2")
  const nowMinutes    = hours * 60 + minutes
  const cutoffMinutes = nowMinutes + leadHours * 60
  // cutoff must be <= 23:00 (1380 min) for at least the last slot to be available
  return cutoffMinutes <= 23 * 60
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

// Country dial codes for international phone selector
export interface CountryDialCode {
  code: string
  name: string
  dial: string
  flag: string
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { code: "GH", name: "Ghana",          dial: "+233", flag: "🇬🇭" },
  { code: "NG", name: "Nigeria",         dial: "+234", flag: "🇳🇬" },
  { code: "GB", name: "United Kingdom",  dial: "+44",  flag: "🇬🇧" },
  { code: "US", name: "United States",   dial: "+1",   flag: "🇺🇸" },
  { code: "CA", name: "Canada",          dial: "+1",   flag: "🇨🇦" },
  { code: "CI", name: "Côte d'Ivoire",   dial: "+225", flag: "🇨🇮" },
  { code: "TG", name: "Togo",            dial: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Benin",           dial: "+229", flag: "🇧🇯" },
  { code: "KE", name: "Kenya",           dial: "+254", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa",    dial: "+27",  flag: "🇿🇦" },
  { code: "DE", name: "Germany",         dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "France",          dial: "+33",  flag: "🇫🇷" },
  { code: "NL", name: "Netherlands",     dial: "+31",  flag: "🇳🇱" },
].sort((a, b) => (a.name === "Ghana" ? -1 : b.name === "Ghana" ? 1 : a.name.localeCompare(b.name)))

export function validatePhoneNumber(phoneOrDial: string, localNumber?: string): boolean {
  let fullLocal = localNumber !== undefined ? localNumber : phoneOrDial
  const digits = fullLocal.replace(/\D/g, "")
  return digits.length >= 6 && digits.length <= 12
}

export function normalizePhone(dialCodeOrPhone: string, localNumber?: string): string {
  if (localNumber !== undefined) {
    const dial = dialCodeOrPhone.startsWith("+") ? dialCodeOrPhone : "+" + dialCodeOrPhone
    let cleanLocal = localNumber.replace(/\D/g, "")
    if (cleanLocal.startsWith("0")) {
      cleanLocal = cleanLocal.slice(1)
    }
    return `${dial}${cleanLocal}`
  }
  
  const cleaned = dialCodeOrPhone.replace(/\s+/g, "")
  if (cleaned.startsWith("+")) return cleaned
  if (cleaned.startsWith("0")) return "+233" + cleaned.slice(1)
  if (cleaned.startsWith("233")) return "+" + cleaned
  return "+" + cleaned
}

// ── Reference / booking code generation ──────────────────────────────────────

/**
 * Generates a unique booking code in the format SG-YYXXXXXX
 * e.g. SG-26A3F9KQ
 * YY = 2-digit year, XXXXXX = 6 random uppercase alphanumeric characters
 */
export function generateBookingCode(): string {
  const year = new Date().getFullYear().toString().slice(-2) // "26"
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no ambiguous I/1/O/0
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SG-${year}${suffix}`
}

/**
 * @deprecated Use generateBookingCode() instead.
 * Retained for backwards-compatibility during migration.
 */
export function generatePaystackReference(bookingId: string): string {
  return generateBookingCode()
}
