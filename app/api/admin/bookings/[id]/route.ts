// app/api/admin/bookings/[id]/route.ts
// GET    — full booking detail
// PATCH  — update status / fields
// DELETE — cancel booking

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { Database } from "@/types/supabase"

type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"]

/** Convert stored integer pesewas (×100) back to GHS float */
const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

// Helper to map DB row (snake_case) to Frontend model (camelCase)
function mapDbToCamel(b: any) {
  return {
    id: b.id,
    customerName: b.customer_name,
    customerEmail: b.customer_email,
    customerPhone: b.customer_phone,
    sessionDate: b.session_date,
    startTime: b.start_time,
    endTime: b.end_time,
    durationHours: Number(b.duration_hours),
    studio: b.studio,
    equipment: b.equipment ?? [],
    notes: b.notes,
    amountGHS: pesewasToGhs(b.amount_ghs),
    status: b.status,
    paystackReference: b.paystack_reference,
    paystackStatus: b.paystack_status,
    anollaBookingId: b.anolla_booking_id,
    anollaStatus: b.anolla_status,
    isPaid: b.is_paid,
    isPacked: b.is_packed,
    isDispatched: b.is_dispatched,
    isDelivered: b.is_delivered,
    adminNotes: b.admin_notes,
    estimatedDeliveryTime: b.estimated_delivery_time,
    createdAt: b.created_at,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient()

  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()

  if (error || !booking) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(mapDbToCamel(booking))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  // Map incoming camelCase properties to DB snake_case columns
  const updateData: BookingUpdate = {}
  
  if (body.status !== undefined) updateData.status = body.status
  if (body.anollaStatus !== undefined) updateData.anolla_status = body.anollaStatus
  if (body.paystackStatus !== undefined) updateData.paystack_status = body.paystackStatus
  if (body.adminNotes !== undefined) updateData.admin_notes = body.adminNotes
  if (body.estimatedDeliveryTime !== undefined) updateData.estimated_delivery_time = body.estimatedDeliveryTime
  
  if (body.isPaid !== undefined) updateData.is_paid = body.isPaid
  if (body.isPacked !== undefined) updateData.is_packed = body.isPacked
  if (body.isDispatched !== undefined) updateData.is_dispatched = body.isDispatched
  if (body.isDelivered !== undefined) updateData.is_delivered = body.isDelivered

  const { data: updated, error } = await (supabase as any)
    .from("bookings")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single()

  if (error || !updated) {
    console.error("[Admin Booking PATCH] Error:", error)
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 })
  }

  return NextResponse.json(mapDbToCamel(updated))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient()

  const { data: updated, error } = await (supabase as any)
    .from("bookings")
    .update({ status: "CANCELLED" })
    .eq("id", params.id)
    .select()
    .single()

  if (error || !updated) {
    console.error("[Admin Booking DELETE] Error:", error)
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 })
  }

  return NextResponse.json(mapDbToCamel(updated))
}
