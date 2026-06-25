// app/api/admin/settings/route.ts
export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const keys = [
      "simulated_activity_control"
    ]

    const supabase = createServiceClient()

    const settings = await Promise.all(
      keys.map(async (key) => {
        const { data } = await (supabase as any)
          .from("settings")
          .select("value")
          .eq("key", key)
          .maybeSingle()
        return { key, value: data ? data.value : "" }
      })
    )

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as any)

    // Set defaults if empty
    if (!settingsMap.simulated_activity_control) settingsMap.simulated_activity_control = "true"

    return NextResponse.json(settingsMap)
  } catch (err) {
    console.error("[Settings GET error]:", err)
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body
    const supabase = createServiceClient()

    if (action === "UPDATE_SETTINGS") {
      const { settings } = body
      if (!settings || typeof settings !== "object") {
        return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 })
      }

      await Promise.all(
        Object.entries(settings).map(async ([key, value]) => {
          const { error } = await (supabase as any)
            .from("settings")
            .upsert({ key, value: String(value) })
          if (error) throw error
        })
      )

      return NextResponse.json({ success: true })
    }

    if (action === "WIPE_DATABASE") {
      // Hard delete all data - bookings, reviews, webhook_events, sync_events, booking_status_history
      const [delBookings, delReviews, delWebhookEvents, delSyncEvents, delHistory] = await Promise.all([
        (supabase as any).from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        (supabase as any).from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        (supabase as any).from("webhook_events").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        (supabase as any).from("sync_events").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        (supabase as any).from("booking_status_history").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      ])

      if (delBookings.error) throw delBookings.error
      if (delReviews.error) throw delReviews.error
      if (delWebhookEvents.error) throw delWebhookEvents.error
      if (delSyncEvents.error) throw delSyncEvents.error
      if (delHistory.error) throw delHistory.error

      return NextResponse.json({ success: true, message: "Database wiped and reset to default settings." })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("[Settings POST error]:", err)
    return NextResponse.json({ error: "Failed to process settings updates" }, { status: 500 })
  }
}
