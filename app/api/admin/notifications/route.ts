// app/api/admin/notifications/route.ts
// GET /api/admin/notifications — WebhookEvent log
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = createServiceClient()

    const { data: events, error } = await supabase
      .from("webhook_events")
      .select("*")
      .order("processed_at", { ascending: false })
      .limit(200)

    if (error) throw error

    // Extract booking reference from payload if available
    const enriched = (events ?? []).map((e: any) => {
      const payload = e.payload as Record<string, unknown>
      const data = payload?.data as Record<string, unknown> | undefined
      
      // Support paystack or Hubtel keys inside webhook payload
      const bookingRef =
        (payload?.clientReference as string) ||
        (payload?.ClientReference as string) ||
        (payload?.Reference as string) ||
        (data?.reference as string) ||
        (data?.metadata as Record<string, unknown>)?.hubtel_reference ||
        (data?.metadata as Record<string, unknown>)?.booking_id ||
        null

      return {
        id: e.id,
        source: e.source,
        eventId: e.event_id,
        eventType: e.event_type,
        bookingRef,
        processedAt: e.processed_at,
        payload: e.payload,
      }
    })

    return NextResponse.json({ events: enriched })
  } catch (err) {
    console.error("[Admin Notifications GET Error]:", err)
    return NextResponse.json({ error: "Failed to fetch notifications log" }, { status: 500 })
  }
}
