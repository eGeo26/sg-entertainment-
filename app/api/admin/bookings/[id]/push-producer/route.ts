// app/api/admin/bookings/[id]/push-producer/route.ts
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
      .select("id, status, selected_package, pushed_to_producer")
      .eq("id", bookingId)
      .single()

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Payment must be confirmed before this booking can be pushed to producer" },
        { status: 409 }
      )
    }

    if (!booking.selected_package) {
      return NextResponse.json(
        { error: "Only bookings with a selected package can be pushed to producer" },
        { status: 400 }
      )
    }

    const nextState = !booking.pushed_to_producer

    const { data: updated, error: updateErr } = await (supabase as any)
      .from("bookings")
      .update({
        pushed_to_producer: nextState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      pushedToProducer: updated.pushed_to_producer,
    })
  } catch (err) {
    console.error("[Push to Producer API Error]:", err)
    return NextResponse.json({ error: "Failed to push booking to producer" }, { status: 500 })
  }
}
