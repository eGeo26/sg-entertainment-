// app/api/admin/customers/route.ts
export const dynamic = "force-dynamic"
// GET /api/admin/customers — CRM view, derived from bookings grouped by email

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = createServiceClient()

    // Get all bookings with customer fields
    const { data: bookings, error } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        amount_ghs,
        is_paid,
        status,
        hubtel_status,
        session_date,
        start_time,
        end_time,
        duration_hours,
        studio,
        created_at
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Group by email to build customer records
    const customerMap = new Map<
      string,
      {
        name: string
        email: string
        phone: string
        bookings: any[]
        totalSpentPesewas: number
        lastBookingDate: Date
      }
    >()

    for (const b of (bookings ?? [])) {
      const bDate = new Date(b.created_at)
      
      const formattedBooking = {
        id: b.id,
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        customerPhone: b.customer_phone,
        amountGHS: b.amount_ghs / 100,
        status: b.status,
        hubtelStatus: b.hubtel_status,
        sessionDate: b.session_date,
        startTime: b.start_time,
        endTime: b.end_time,
        durationHours: Number(b.duration_hours),
        studio: b.studio,
        createdAt: b.created_at,
      }

      const existing = customerMap.get(b.customer_email)
      if (existing) {
        existing.bookings.push(formattedBooking)
        existing.totalSpentPesewas += (b.hubtel_status === "SUCCESS" || b.is_paid === true) ? b.amount_ghs : 0
        if (bDate > existing.lastBookingDate) {
          existing.lastBookingDate = bDate
        }
      } else {
        customerMap.set(b.customer_email, {
          name: b.customer_name,
          email: b.customer_email,
          phone: b.customer_phone,
          bookings: [formattedBooking],
          totalSpentPesewas: (b.hubtel_status === "SUCCESS" || b.is_paid === true) ? b.amount_ghs : 0,
          lastBookingDate: bDate,
        })
      }
    }

    const customers = Array.from(customerMap.values())
      .map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        totalBookings: c.bookings.length,
        totalSpentGHS: c.totalSpentPesewas / 100,
        lastBooking: c.lastBookingDate,
        bookings: c.bookings,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings)

    return NextResponse.json({ customers })
  } catch (err) {
    console.error("[Admin Customers GET Error]:", err)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
