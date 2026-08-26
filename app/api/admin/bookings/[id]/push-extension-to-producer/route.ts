// app/api/admin/bookings/[id]/push-extension-to-producer/route.ts
// POST /api/admin/bookings/[id]/push-extension-to-producer
//
// Marks an extended booking as visible on the producer portal.
// Only bookings with extension_hours > 0 can be sent.
// This is ADDITIVE — it uses two new columns (extension_sent_to_producer,
// extension_sent_to_producer_at) and never touches the existing
// pushed_to_producer / push-producer flow.

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const bookingId = params.id

  try {
    const supabase = createServiceClient()

    const { data: booking, error: fetchErr } = await (supabase as any)
      .from("bookings")
      .select("id, status, extension_hours, extension_sent_to_producer")
      .eq("id", bookingId)
      .single()

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Booking must be confirmed before sending to producer" },
        { status: 409 }
      )
    }

    if (!booking.extension_hours || booking.extension_hours <= 0) {
      return NextResponse.json(
        { error: "Only extended bookings (with extra hours) can be sent via this route" },
        { status: 400 }
      )
    }

    // Toggle: if already sent, unsend; if not sent, mark as sent now
    const nextState = !booking.extension_sent_to_producer
    const nowIso = new Date().toISOString()

    const { data: updated, error: updateErr } = await (supabase as any)
      .from("bookings")
      .update({
        extension_sent_to_producer: nextState,
        extension_sent_to_producer_at: nextState ? nowIso : null,
        updated_at: nowIso,
      })
      .eq("id", bookingId)
      .select("extension_sent_to_producer, extension_sent_to_producer_at")
      .single()

    if (updateErr) throw updateErr

    console.log(`[push-extension-to-producer] Booking ${bookingId}: extension_sent_to_producer → ${nextState}`)

    return NextResponse.json({
      success: true,
      extensionSentToProducer: updated.extension_sent_to_producer,
      extensionSentToProducerAt: updated.extension_sent_to_producer_at,
    })
  } catch (err) {
    console.error("[push-extension-to-producer] Error:", err)
    return NextResponse.json({ error: "Failed to update producer visibility" }, { status: 500 })
  }
}
