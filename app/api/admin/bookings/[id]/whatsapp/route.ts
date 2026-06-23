// app/api/admin/bookings/[id]/whatsapp/route.ts
// POST /api/admin/bookings/:id/whatsapp — Trigger a manual notification
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { sendBookingConfirmationNotifications, customerConfirmationMessage } from "@/lib/whatsapp"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"

const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = createServiceClient()

  const { data: booking, error: fetchError } = await (supabase as any)
    .from("bookings")
    .select("*")
    .eq("id", params.id)
    .maybeSingle()

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const sessionDate = formatDisplayDate(
    new Date(booking.session_date).toISOString().slice(0, 10)
  )
  const startDisplay = formatDisplayTime(booking.start_time)
  const endDisplay = formatDisplayTime(booking.end_time)
  const amountGHS = pesewasToGhs(booking.amount_ghs)

  const payload = {
    bookingId: booking.id,
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    customerEmail: booking.customer_email,
    sessionDate,
    startTime: startDisplay,
    endTime: endDisplay,
    durationHours: Number(booking.duration_hours),
    studio: booking.studio,
    equipment: booking.equipment ?? [],
    amountGHS,
    paystackReference: booking.paystack_reference ?? "MANUAL",
    notes: booking.notes ?? undefined,
  }

  const messageText = customerConfirmationMessage(payload)
  
  // Format phone number for wa.me link: strip non-digits and leading +
  const cleanPhone = booking.customer_phone.replace(/\D/g, "")
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`

  const hasMeta = !!(process.env.META_WHATSAPP_ACCESS_TOKEN && process.env.META_WHATSAPP_PHONE_NUMBER_ID)

  if (!hasMeta) {
    // If Meta API credentials are not configured, simulate it and return waLink for manual sending
    return NextResponse.json({
      success: true,
      simulated: true,
      message: "Meta WhatsApp credentials not configured. Click the link to send via WhatsApp Web/app.",
      waLink,
    })
  }

  try {
    const { customerSent } = await sendBookingConfirmationNotifications(payload)
    
    // Update the notification status in DB if sent successfully
    if (customerSent) {
      await (supabase as any)
        .from("bookings")
        .update({ customer_notified: true })
        .eq("id", booking.id)
    }

    return NextResponse.json({
      success: true,
      simulated: false,
      message: customerSent ? "WhatsApp confirmation sent successfully!" : "Failed to send WhatsApp message via Meta Cloud API.",
      waLink,
    })
  } catch (err: any) {
    console.error("[WhatsApp Admin Route] Error sending WhatsApp:", err)
    return NextResponse.json({
      success: true,
      simulated: true,
      error: err.message ?? "Failed to send WhatsApp via Meta Cloud API",
      message: "Meta send failed. Click the link below to send manually.",
      waLink,
    })
  }
}
