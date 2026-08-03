// app/api/producer/bookings/[id]/done/route.ts
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyProducerSession } from "@/lib/producer-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyProducerSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const bookingId = params.id

  try {
    const supabase = createServiceClient()
    const { data: booking, error: fetchErr } = await (supabase as any)
      .from("bookings")
      .select("id, pushed_to_producer, producer_marked_done")
      .eq("id", bookingId)
      .single()

    if (fetchErr || !booking || !booking.pushed_to_producer) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const nextState = !booking.producer_marked_done

    const { data: updated, error: updateErr } = await (supabase as any)
      .from("bookings")
      .update({
        producer_marked_done: nextState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      producerMarkedDone: updated.producer_marked_done,
    })
  } catch (err) {
    console.error("[Producer Toggle Done Error]:", err)
    return NextResponse.json({ error: "Failed to update session status" }, { status: 500 })
  }
}
