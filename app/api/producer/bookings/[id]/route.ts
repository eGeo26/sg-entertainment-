// DELETE /api/producer/bookings/[id] — remove a completed session from producer visibility
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyProducerSession } from "@/lib/producer-auth"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyProducerSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()
    const { data: booking, error: fetchError } = await (supabase as any)
      .from("bookings")
      .select("id, pushed_to_producer, producer_marked_done")
      .eq("id", params.id)
      .single()

    if (fetchError || !booking || !booking.pushed_to_producer) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (!booking.producer_marked_done) {
      return NextResponse.json(
        { error: "Only completed sessions can be removed" },
        { status: 409 }
      )
    }

    const { error: updateError } = await (supabase as any)
      .from("bookings")
      .update({
        pushed_to_producer: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("producer_marked_done", true)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Producer Remove Session Error]:", error)
    return NextResponse.json(
      { error: "Failed to remove completed session" },
      { status: 500 }
    )
  }
}
