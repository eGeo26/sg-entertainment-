// app/api/admin/bookings/route.ts
// GET  /api/admin/bookings — list all bookings (with filters)
// POST /api/admin/bookings — create a manual booking
// DELETE /api/admin/bookings — bulk delete bookings
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { getEndTime, generateBookingCode, normalizePhone } from "@/lib/booking"

const ghsToPesewas = (ghs: number) => Math.round(ghs * 100)
const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "50")

  try {
    const supabase = createServiceClient()

    // 1. Build filtering query for the requested page
    let query = (supabase as any)
      .from("bookings")
      .select("*", { count: "exact" })

    if (status && status !== "ALL") {
      query = query.eq("status", status)
    }
    if (from) {
      query = query.gte("session_date", `${from}T00:00:00Z`)
    }
    if (to) {
      query = query.lte("session_date", `${to}T23:59:59Z`)
    }
    if (search) {
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)
      if (looksLikeUuid) {
        query = query.eq("id", search)
      } else {
        query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%,booking_code.ilike.%${search}%`)
      }
    }

    const startRange = (page - 1) * limit
    const endRange = page * limit - 1

    const { data: bookings, count, error } = await query
      .order("created_at", { ascending: false })
      .range(startRange, endRange)

    if (error) throw error

    // 2. Fetch stats
    const { data: revenueData } = await (supabase as any)
      .from("bookings")
      .select("amount_ghs")
      .eq("status", "CONFIRMED")

    const totalRevenue = (revenueData ?? []).reduce((sum: number, item: any) => sum + item.amount_ghs, 0)

    const { count: activeCount } = await (supabase as any)
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "CONFIRMED")

    const { count: deliveredCount } = await (supabase as any)
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status_confirmed", true)

    const total = count ?? 0

    // Map DB rows to camelCase
    const formattedBookings = (bookings ?? []).map((b: any) => ({
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
      currency: b.currency ?? "GHS",
      hubtelReference: b.hubtel_reference,
      hubtelStatus: b.hubtel_status,
      status: b.status,
      statusPayment: b.status_payment,
      statusPaymentAt: b.status_payment_at,
      statusReviewed: b.status_reviewed,
      statusReviewedAt: b.status_reviewed_at,
      statusConfirmed: b.status_confirmed,
      statusConfirmedAt: b.status_confirmed_at,
      isPaid: b.is_paid,
      isPacked: b.status_reviewed ?? false,
      isDelivered: b.status_confirmed ?? false,
      adminNotes: b.admin_notes,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }))

    return NextResponse.json({
      bookings: formattedBookings,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        totalRevenueGHS: totalRevenue / 100,
        activeBookings: activeCount ?? 0,
        grantedSessions: deliveredCount ?? 0
      }
    })
  } catch (err) {
    console.error("[Admin Bookings GET] Error:", err)
    return NextResponse.json({ error: "Failed to list bookings" }, { status: 500 })
  }
}

const ManualBookingSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(9).max(16),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(1).max(12),
  studio: z.string().default("Main Studio"),
  equipment: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
  amountGHS: z.number().min(0),
})

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = ManualBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const phone = normalizePhone(data.customerPhone)
    const endTime = getEndTime(data.sessionDate, data.startTime, data.durationHours)
    const bookingId = uuidv4()
    const bookingCode = generateBookingCode()

    const supabase = createServiceClient()

    const { data: booking, error } = await (supabase as any)
      .from("bookings")
      .insert({
        id: bookingId,
        booking_code: bookingCode,
        customer_name: data.customerName,
        customer_email: data.customerEmail,
        customer_phone: phone,
        session_date: new Date(`${data.sessionDate}T${data.startTime}:00Z`).toISOString(),
        start_time: data.startTime,
        end_time: endTime,
        duration_hours: data.durationHours,
        studio: data.studio,
        equipment: data.equipment,
        notes: data.notes ?? null,
        amount_ghs: ghsToPesewas(data.amountGHS),
        hubtel_reference: bookingCode,
        status: "CONFIRMED", // Manual bookings are auto-confirmed
        hubtel_status: "SUCCESS",
        is_paid: true,
      })
      .select()
      .single()

    if (error || !booking) {
      throw error ?? new Error("Failed to insert manual booking")
    }

    return NextResponse.json({
      id: booking.id,
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      sessionDate: booking.session_date,
      startTime: booking.start_time,
      endTime: booking.end_time,
      durationHours: Number(booking.duration_hours),
      studio: booking.studio,
      equipment: booking.equipment ?? [],
      notes: booking.notes,
      amountGHS: pesewasToGhs(booking.amount_ghs),
      currency: booking.currency ?? "GHS",
      hubtelReference: booking.hubtel_reference,
      hubtelStatus: booking.hubtel_status,
      status: booking.status,
      statusPayment: booking.status_payment,
      statusPaymentAt: booking.status_payment_at,
      statusReviewed: booking.status_reviewed,
      statusReviewedAt: booking.status_reviewed_at,
      statusConfirmed: booking.status_confirmed,
      statusConfirmedAt: booking.status_confirmed_at,
      isPaid: booking.is_paid,
      isPacked: booking.status_reviewed ?? false,
      isDelivered: booking.status_confirmed ?? false,
      adminNotes: booking.admin_notes,
      createdAt: booking.created_at,
    })
  } catch (err) {
    console.error("[Admin Bookings POST] Create error:", err)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { ids } = await req.json()
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await (supabase as any)
      .from("bookings")
      .delete()
      .in("id", ids)

    if (error) throw error

    return NextResponse.json({ success: true, count: ids.length })
  } catch (err) {
    console.error("[Admin Bookings DELETE] Bulk Delete error:", err)
    return NextResponse.json({ error: "Failed to delete bookings" }, { status: 500 })
  }
}
