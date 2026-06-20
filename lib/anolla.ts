// lib/anolla.ts
// Decoupled / stubbed Anolla REST API client for S&G Entertainment booking system

import { AnollaBookingPayload, AnollaAvailabilitySlot } from "@/types"

export async function getAvailability(
  date: string,
  durationMinutes: number = 60
): Promise<AnollaAvailabilitySlot[]> {
  return []
}

export async function getMonthAvailability(
  year: number,
  month: number
): Promise<{ date: string; available: boolean }[]> {
  return []
}

export async function createPendingBooking(
  payload: AnollaBookingPayload
): Promise<{ anollaBookingId: string }> {
  return { anollaBookingId: "mock-anolla-id" }
}

export async function confirmBooking(
  anollaBookingId: string,
  paystackReference: string
): Promise<void> {
  // stub
}

export async function cancelBooking(
  anollaBookingId: string,
  reason: string = "payment_failed"
): Promise<void> {
  // stub
}

export async function getBooking(anollaBookingId: string) {
  return { id: anollaBookingId, status: "confirmed" }
}

export async function updateBookingMetadata(
  anollaBookingId: string,
  metadata: Record<string, string>
): Promise<void> {
  // stub
}

export function getWidgetEmbedUrl(params?: {
  prefilledDate?: string
  theme?: "light" | "dark"
}) {
  return ""
}
