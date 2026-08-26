// app/api/producer/extended-bookings/route.ts
// GET /api/producer/extended-bookings
//
// Returns all confirmed bookings that have been explicitly forwarded to
// the producer as extended sessions (extension_sent_to_producer = true).
// Completely separate from the existing /api/producer/bookings route.

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyProducerSession } from "@/lib/producer-auth"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

export async function GET(req: NextRequest) {
  if (!verifyProducerSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    const { data: bookings, error } = await (supabase as any)
      .from("bookings")
      .select(
        "id, booking_code, customer_name, customer_phone, customer_email, " +
        "session_date, start_time, end_time, duration_hours, studio, notes, " +
        "amount_ghs, extension_hours, extension_amount, extended_at, " +
        "extension_sent_to_producer_at, created_at"
      )
      .eq("extension_sent_to_producer", true)
      .order("session_date", { ascending: true })

    if (error) throw error

    const formatted = (bookings ?? []).map((b: any) => {
      const baseAmountPesewas = Number(b.amount_ghs) - Number(b.extension_amount ?? 0)
      const extensionHours = Number(b.extension_hours ?? 0)
      const extensionAmountGHS = Number(b.extension_amount ?? 0) / 100
      const baseAmountGHS = baseAmountPesewas / 100
      const totalAmountGHS = Number(b.amount_ghs) / 100
      const totalDurationHours = Number(b.duration_hours)
      const baseDurationHours = totalDurationHours - extensionHours

      return {
        id: b.id,
        bookingCode: b.booking_code,
        customerName: b.customer_name,
        customerPhone: b.customer_phone,
        customerEmail: b.customer_email,
        sessionDate: b.session_date,
        displayDate: formatDisplayDate(b.session_date.slice(0, 10)),
        startTime: b.start_time,
        displayStartTime: formatDisplayTime(b.start_time),
        endTime: b.end_time,
        displayEndTime: formatDisplayTime(b.end_time),
        studio: b.studio,
        notes: b.notes ?? null,
        // Duration breakdown
        baseDurationHours,
        extensionHours,
        totalDurationHours,
        // Amount breakdown
        baseAmountGHS,
        extensionAmountGHS,
        totalAmountGHS,
        // Timestamps
        extendedAt: b.extended_at,
        sentToProducerAt: b.extension_sent_to_producer_at,
        createdAt: b.created_at,
      }
    })

    return NextResponse.json({ bookings: formatted })
  } catch (err) {
    console.error("[Producer Extended Bookings GET Error]:", err)
    return NextResponse.json({ error: "Failed to fetch extended bookings" }, { status: 500 })
  }
}
