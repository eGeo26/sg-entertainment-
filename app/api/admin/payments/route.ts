// app/api/admin/payments/route.ts
// GET /api/admin/payments — Payment transaction log from Booking table

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = createServiceClient()

    const { data: bookings, error } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        booking_code,
        paystack_reference,
        paystack_status,
        customer_name,
        customer_email,
        customer_phone,
        amount_ghs,
        status,
        created_at,
        updated_at
      `)
      .not("paystack_reference", "is", null)
      .order("created_at", { ascending: false })

    if (error) throw error

    const payments = (bookings ?? []).map((b: any) => ({
      id: b.id,
      bookingCode: b.booking_code,
      hubtelReference: b.paystack_reference,
      hubtelStatus: b.paystack_status,
      customerName: b.customer_name,
      customerEmail: b.customer_email,
      customerPhone: b.customer_phone,
      amountGHS: b.amount_ghs / 100,
      status: b.status,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }))

    return NextResponse.json({ payments })
  } catch (err) {
    console.error("[Admin Payments GET Error]:", err)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}
