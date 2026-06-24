// app/api/admin/notification-counts/route.ts
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // 1. Unapproved reviews count
    const { count: unapprovedReviewsCount, error: reviewsError } = await (supabase as any)
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("approved", false)

    if (reviewsError) {
      console.error("[Notification Counts API] Reviews fetch error:", reviewsError)
    }

    // 2. Bookings count (status = 'CONFIRMED' but status_confirmed = false)
    const { count: pendingBookingsCount, error: bookingsError } = await (supabase as any)
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "CONFIRMED")
      .eq("status_confirmed", false)

    if (bookingsError) {
      console.error("[Notification Counts API] Bookings fetch error:", bookingsError)
    }

    return NextResponse.json({
      reviews: unapprovedReviewsCount ?? 0,
      bookings: pendingBookingsCount ?? 0,
    })
  } catch (err) {
    console.error("[Notification Counts API GET Error]:", err)
    return NextResponse.json({ error: "Failed to fetch notification counts" }, { status: 500 })
  }
}
