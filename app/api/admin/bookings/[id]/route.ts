// app/api/admin/bookings/[id]/route.ts
// GET    — full booking detail
// PATCH  — update status / fields
// DELETE — cancel booking
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"]

/** Convert stored integer pesewas (×100) back to GHS float */
const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

// Helper to map DB row (snake_case) to Frontend model (camelCase)
function mapDbToCamel(b: any) {
  return {
    id: b.id,
    bookingCode: b.booking_code,
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
    hubtelReference: b.hubtel_reference,
    hubtelStatus: b.hubtel_status,
    statusPayment: b.status_payment,
    statusPaymentAt: b.status_payment_at,
    statusReviewed: b.status_reviewed,
    statusReviewedAt: b.status_reviewed_at,
    statusConfirmed: b.status_confirmed,
    statusConfirmedAt: b.status_confirmed_at,
    isPaid: b.is_paid ?? false,
    isPacked: b.status_reviewed ?? false,
    isDelivered: b.status_confirmed ?? false,
    adminNotes: b.admin_notes,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
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

  // Fetch existing status columns to preserve or cascade timestamps correctly
  const { data: currentBooking, error: fetchError } = await (supabase as any)
    .from("bookings")
    .select("status_payment, status_payment_at, status_reviewed, status_reviewed_at, status_confirmed, status_confirmed_at")
    .eq("id", params.id)
    .maybeSingle()

  if (fetchError || !currentBooking) {
    console.error("[Admin Booking PATCH] Fetch error:", fetchError)
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  // Map incoming camelCase properties to DB snake_case columns
  const updateData: any = {}
  
  if (body.status !== undefined) {
    updateData.status = body.status
    if (body.status === "CONFIRMED") {
      updateData.status_confirmed = true
      updateData.status_confirmed_at = currentBooking.status_confirmed_at || new Date().toISOString()
      updateData.status_reviewed = true
      updateData.status_reviewed_at = currentBooking.status_reviewed_at || new Date().toISOString()
      updateData.status_payment = true
      updateData.status_payment_at = currentBooking.status_payment_at || new Date().toISOString()
    }
  }
  if (body.hubtelStatus !== undefined) updateData.hubtel_status = body.hubtelStatus
  if (body.adminNotes !== undefined) updateData.admin_notes = body.adminNotes

  if (body.isPaid !== undefined) {
    updateData.is_paid = body.isPaid
    // isPaid → also mark status_payment (what the customer stepper reads)
    if (body.isPaid === true) {
      updateData.status_payment = true
      updateData.status_payment_at = currentBooking.status_payment_at || new Date().toISOString()
    } else {
      updateData.status_payment = false
      updateData.status_payment_at = null
    }
  }
  if (body.isPacked !== undefined) {
    // isPacked = "Reviewed" in the UI → cascade to status_reviewed (stepper stage 3)
    if (body.isPacked === true) {
      updateData.status_reviewed = true
      updateData.status_reviewed_at = currentBooking.status_reviewed_at || new Date().toISOString()
      // Also cascade payment confirmation if not already set
      updateData.status_payment = true
      updateData.status_payment_at = currentBooking.status_payment_at || new Date().toISOString()
    } else {
      updateData.status_reviewed = false
      updateData.status_reviewed_at = null
    }
  }
  if (body.isDelivered !== undefined) {
    // isDelivered = "Granted" in the UI → cascade to status_confirmed (stepper stage 4)
    if (body.isDelivered === true) {
      updateData.status_confirmed = true
      updateData.status_confirmed_at = currentBooking.status_confirmed_at || new Date().toISOString()
      // Cascade all prior stages
      updateData.status_reviewed = true
      updateData.status_reviewed_at = currentBooking.status_reviewed_at || new Date().toISOString()
      updateData.status_payment = true
      updateData.status_payment_at = currentBooking.status_payment_at || new Date().toISOString()
    } else {
      updateData.status_confirmed = false
      updateData.status_confirmed_at = null
    }
  }

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

  // Insert sync_events rows so the admin Realtime subscription fires immediately
  const syncInserts: Array<Promise<any>> = []

  if (updateData.status_reviewed === true) {
    syncInserts.push(
      (supabase as any).from("sync_events").insert({
        event_type: "booking.reviewed",
        booking_id: params.id,
        booking_code: updated.booking_code,
        payload: { status_reviewed: true, reviewed_at: updateData.status_reviewed_at },
        delivered: false,
        delivery_attempts: 0,
      })
    )
  }

  if (updateData.status_confirmed === true) {
    syncInserts.push(
      (supabase as any).from("sync_events").insert({
        event_type: "booking.confirmed",
        booking_id: params.id,
        booking_code: updated.booking_code,
        payload: { status_confirmed: true, confirmed_at: updateData.status_confirmed_at },
        delivered: false,
        delivery_attempts: 0,
      })
    )
  }

  if (syncInserts.length > 0) {
    const results = await Promise.allSettled(syncInserts)
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[Admin Booking PATCH] sync_events insert ${i} failed:`, r.reason)
      }
    })
  }

  // If customer message is provided, save it to booking_status_history
  if (body.customerMessage && body.customerMessage.trim()) {
    try {
      await (supabase as any)
        .from("booking_status_history")
        .insert({
          booking_id: params.id,
          status: body.status || updated.status,
          label: body.customerMessage.trim(),
          is_admin_message: true,          // ← marks this as an explicit admin-written message
          created_at: new Date().toISOString()
        })
    } catch (historyError) {
      console.error("[Admin Booking PATCH] Failed to save customer message to history:", historyError)
      // Don't fail the whole request if history insert fails
    }
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

  // Hard delete - removes the booking and all related records via CASCADE
  const { data: deleted, error } = await (supabase as any)
    .from("bookings")
    .delete()
    .eq("id", params.id)
    .select()
    .single()

  if (error || !deleted) {
    console.error("[Admin Booking DELETE] Error:", error)
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
  }

  return NextResponse.json({ success: true, deletedId: params.id })
}
