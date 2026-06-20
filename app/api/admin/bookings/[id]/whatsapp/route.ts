import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sendBookingConfirmationNotifications, customerConfirmationMessage } from "@/lib/whatsapp"
import { formatDisplayDate, formatDisplayTime } from "@/lib/booking"
import { pesewasToGhs } from "@/lib/paystack"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const booking = await prisma.booking.findUnique({ where: { id: params.id } })
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 })

  const sessionDate = formatDisplayDate(
    booking.sessionDate.toISOString().slice(0, 10)
  )
  const startDisplay = formatDisplayTime(booking.startTime)
  const endDisplay = formatDisplayTime(booking.endTime)
  const amountGHS = pesewasToGhs(booking.amountGHS)

  const payload = {
    bookingId: booking.id,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    customerEmail: booking.customerEmail,
    sessionDate,
    startTime: startDisplay,
    endTime: endDisplay,
    durationHours: booking.durationHours,
    studio: booking.studio,
    equipment: booking.equipment,
    amountGHS,
    paystackReference: booking.paystackReference ?? "MANUAL",
    notes: booking.notes ?? undefined,
  }

  const messageText = customerConfirmationMessage(payload)
  
  // Format phone number for wa.me link: strip non-digits
  const cleanPhone = booking.customerPhone.replace(/\D/g, "")
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`

  const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)

  if (!hasTwilio) {
    // If Twilio is not configured, simulate it and return waLink for manual sending
    return NextResponse.json({
      success: true,
      simulated: true,
      message: "Twilio credentials not configured. Click the link to send via WhatsApp Web/app.",
      waLink,
    })
  }

  try {
    const { customerSent } = await sendBookingConfirmationNotifications(payload)
    
    // Update the notification status in DB if sent successfully
    if (customerSent) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { customerNotified: true },
      })
    }

    return NextResponse.json({
      success: true,
      simulated: false,
      message: customerSent ? "WhatsApp confirmation sent successfully!" : "Failed to send WhatsApp message via Twilio.",
      waLink,
    })
  } catch (err: any) {
    console.error("[WhatsApp Admin Route] Error sending WhatsApp:", err)
    return NextResponse.json({
      success: true,
      simulated: true,
      error: err.message ?? "Failed to send WhatsApp via Twilio",
      message: "Twilio send failed. Click the link below to send manually.",
      waLink,
    })
  }
}
