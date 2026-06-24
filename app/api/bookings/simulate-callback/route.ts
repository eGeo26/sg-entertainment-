// app/api/bookings/simulate-callback/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { bookingId, action } = await req.json()

    if (!bookingId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: booking, error: selectError } = await (supabase as any)
      .from("bookings")
      .select("*")
      .eq("booking_code", bookingId)
      .maybeSingle()

    if (selectError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    if (action === "SUCCESS") {
      console.log(`[Simulated Payment] Triggering success webhook for reference: ${booking.hubtel_reference}`)
      
      try {
        const webhookRes = await fetch(`${appUrl}/api/hubtel/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientReference: booking.hubtel_reference,
            transactionId: `sim-tx-${Date.now()}`,
            status: "Success",
            amount: booking.amount_ghs / 100,
          }),
        })

        if (!webhookRes.ok) {
          throw new Error(`Webhook responded with status ${webhookRes.status}`)
        }
      } catch (webhookErr) {
        console.error("[Simulated Payment] Webhook simulation failed, falling back to direct DB update:", webhookErr)

        await (supabase as any)
          .from("bookings")
          .update({
            status: "CONFIRMED",
            hubtel_status: "SUCCESS",
            is_paid: true,
            status_payment: true,
            status_payment_at: new Date().toISOString(),
          })
          .eq("booking_code", bookingId)
      }
    } else {
      await (supabase as any)
        .from("bookings")
        .update({
          status: "FAILED",
          hubtel_status: "FAILED",
        })
        .eq("booking_code", bookingId)
      console.log(`[Simulated Payment] Booking ${bookingId} marked as failed via simulation.`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Simulated Payment Callback Error]:", err)
    return NextResponse.json({ error: "Failed to process simulation callback" }, { status: 500 })
  }
}
