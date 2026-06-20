// lib/anolla.ts
// Anolla REST API client for S&G Entertainment booking system

import { AnollaBookingPayload, AnollaAvailabilitySlot } from "@/types"

const ANOLLA_BASE = process.env.ANOLLA_API_BASE_URL ?? "https://api.anolla.com/v1"
const API_KEY = process.env.ANOLLA_API_KEY!
const PROVIDER_ID = process.env.ANOLLA_PROVIDER_ID!
const RESOURCE_ID = process.env.ANOLLA_RESOURCE_ID!

function anollaHeaders() {
  return {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "X-Provider-ID": PROVIDER_ID,
  }
}

async function anollaFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${ANOLLA_BASE}${path}`, {
    ...options,
    headers: {
      ...anollaHeaders(),
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anolla API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

// ── Availability ──────────────────────────────────────────────────────────────

/**
 * Get available time slots for a given date range.
 * Returns an array of slots with start/end times and availability.
 */
export async function getAvailability(
  date: string,  // "YYYY-MM-DD"
  durationMinutes: number = 60
): Promise<AnollaAvailabilitySlot[]> {
  try {
    const params = new URLSearchParams({
      resource_id: RESOURCE_ID,
      date,
      duration: String(durationMinutes),
    })

    const data = await anollaFetch<{ slots: AnollaAvailabilitySlot[] }>(
      `/availability?${params}`
    )
    return data.slots ?? []
  } catch (err) {
    console.error("[Anolla] getAvailability error:", err)
    // Graceful degradation: return empty to trigger fallback UI
    return []
  }
}

/**
 * Get booked ranges for an entire month — used to render the calendar.
 */
export async function getMonthAvailability(
  year: number,
  month: number  // 1-12
): Promise<{ date: string; available: boolean }[]> {
  try {
    const params = new URLSearchParams({
      resource_id: RESOURCE_ID,
      year: String(year),
      month: String(month),
    })

    const data = await anollaFetch<{
      days: { date: string; available: boolean }[]
    }>(`/availability/month?${params}`)

    return data.days ?? []
  } catch (err) {
    console.error("[Anolla] getMonthAvailability error:", err)
    return []
  }
}

// ── Bookings ──────────────────────────────────────────────────────────────────

/**
 * Create a PENDING (tentative) booking in Anolla to hold the slot.
 * Returns the Anolla booking ID.
 */
export async function createPendingBooking(
  payload: AnollaBookingPayload
): Promise<{ anollaBookingId: string }> {
  const body = {
    resource_id: payload.resourceId,
    status: "pending",
    customer: {
      name: payload.customerName,
      email: payload.customerEmail,
      phone: payload.customerPhone,
    },
    start_time: payload.startDateTime,
    end_time: payload.endDateTime,
    notes: payload.notes ?? "",
    metadata: {
      source: "sg_website",
      payment_provider: "paystack",
      ...(payload.metadata ?? {}),
    },
  }

  const data = await anollaFetch<{ id: string; status: string }>(
    `/bookings`,
    { method: "POST", body: JSON.stringify(body) }
  )

  return { anollaBookingId: data.id }
}

/**
 * Confirm a booking in Anolla after successful Paystack payment.
 */
export async function confirmBooking(
  anollaBookingId: string,
  paystackReference: string
): Promise<void> {
  await anollaFetch(`/bookings/${anollaBookingId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "confirmed",
      metadata: {
        paystack_reference: paystackReference,
        confirmed_at: new Date().toISOString(),
      },
    }),
  })
}

/**
 * Cancel a booking in Anolla (e.g. payment failed / refund).
 */
export async function cancelBooking(
  anollaBookingId: string,
  reason: string = "payment_failed"
): Promise<void> {
  await anollaFetch(`/bookings/${anollaBookingId}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "cancelled",
      metadata: { cancellation_reason: reason },
    }),
  })
}

/**
 * Get booking details from Anolla.
 */
export async function getBooking(anollaBookingId: string) {
  return anollaFetch<Record<string, unknown>>(`/bookings/${anollaBookingId}`)
}

/**
 * Update booking notes/metadata in Anolla.
 */
export async function updateBookingMetadata(
  anollaBookingId: string,
  metadata: Record<string, string>
): Promise<void> {
  await anollaFetch(`/bookings/${anollaBookingId}`, {
    method: "PATCH",
    body: JSON.stringify({ metadata }),
  })
}

// ── Widget helpers ────────────────────────────────────────────────────────────

/**
 * Returns the embed URL for the Anolla booking widget (fallback UI).
 * Use this as an <iframe src="..."> when direct API is unavailable.
 */
export function getWidgetEmbedUrl(params?: {
  prefilledDate?: string
  theme?: "light" | "dark"
}) {
  const base = `https://widget.anolla.com/${process.env.ANOLLA_WIDGET_ID}`
  const search = new URLSearchParams({
    provider: PROVIDER_ID,
    resource: RESOURCE_ID,
    theme: params?.theme ?? "light",
    ...(params?.prefilledDate ? { date: params.prefilledDate } : {}),
  })
  return `${base}?${search}`
}
