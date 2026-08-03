// app/api/producer/bookings/route.ts
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { verifyProducerSession } from "@/lib/producer-auth"

export async function GET(req: NextRequest) {
  if (!verifyProducerSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Fetch only pushed bookings
    const { data: bookings, error } = await (supabase as any)
      .from("bookings")
      .select("id, booking_code, customer_name, customer_phone, session_date, start_time, end_time, duration_hours, studio, selected_package, pushed_to_producer, producer_marked_done, created_at")
      .eq("pushed_to_producer", true)
      .order("session_date", { ascending: true })

    if (error) throw error

    const formatted = (bookings ?? []).map((b: any) => {
      let pkgName = ""
      let pkgPrice = 0

      if (b.selected_package) {
        if (typeof b.selected_package === "string") {
          try {
            const parsed = JSON.parse(b.selected_package)
            pkgName = parsed.name || parsed.title || b.selected_package
            pkgPrice = parsed.price || 0
          } catch {
            pkgName = b.selected_package
          }
        } else if (typeof b.selected_package === "object") {
          pkgName = b.selected_package.name || b.selected_package.title || ""
          pkgPrice = b.selected_package.price || 0
        }
      }

      return {
        id: b.id,
        bookingCode: b.booking_code,
        customerName: b.customer_name,
        customerPhone: b.customer_phone,
        sessionDate: b.session_date,
        startTime: b.start_time,
        endTime: b.end_time,
        durationHours: Number(b.duration_hours),
        studio: b.studio,
        packageName: pkgName,
        packagePrice: pkgPrice,
        pushedToProducer: b.pushed_to_producer ?? false,
        producerMarkedDone: b.producer_marked_done ?? false,
        createdAt: b.created_at,
      }
    })

    return NextResponse.json({ bookings: formatted })
  } catch (err) {
    console.error("[Producer Bookings GET Error]:", err)
    return NextResponse.json({ error: "Failed to fetch producer bookings" }, { status: 500 })
  }
}
