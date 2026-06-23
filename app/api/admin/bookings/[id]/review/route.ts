// app/api/admin/bookings/[id]/review/route.ts
// POST — mark booking as reviewed (writes to boolean + timestamp columns with cascade)
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient()

  try {
    // Check if booking exists and get current status
    const { data: booking, error: bookingError } = await (supabase as any)
      .from("bookings")
      .select("id, status_payment, status_payment_at, status_reviewed")
      .eq("id", params.id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    // Check if already reviewed
    if (booking.status_reviewed) {
      return NextResponse.json({ error: "Booking already reviewed" }, { status: 400 })
    }

    // Cascade logic: when marking as reviewed, also ensure payment is marked if not already
    const updateData: any = {
      status_reviewed: true,
      status_reviewed_at: new Date().toISOString(),
    }

    // If payment wasn't confirmed, cascade it now
    if (!booking.status_payment) {
      updateData.status_payment = true
      updateData.status_payment_at = new Date().toISOString()
    }

    // Update booking with cascade
    const { data: updatedBooking, error: updateError } = await (supabase as any)
      .from("bookings")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({ success: true, booking: updatedBooking })
  } catch (err) {
    console.error("[Admin Booking Review] Error:", err)
    return NextResponse.json({ error: "Failed to mark booking as reviewed" }, { status: 500 })
  }
}
