// app/api/admin/notifications/route.ts
// GET /api/admin/notifications — WebhookEvent log

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const events = await prisma.webhookEvent.findMany({
    orderBy: { processedAt: "desc" },
    take: 200,
  })

  // Extract booking reference from payload if available
  const enriched = events.map((e: any) => {
    const payload = e.payload as Record<string, unknown>
    const data = payload?.data as Record<string, unknown> | undefined
    const bookingRef =
      (data?.reference as string) ||
      (data?.metadata as Record<string, unknown>)?.paystack_reference ||
      (data?.metadata as Record<string, unknown>)?.booking_id ||
      null

    return {
      id: e.id,
      source: e.source,
      eventId: e.eventId,
      eventType: e.eventType,
      bookingRef,
      processedAt: e.processedAt,
      payload: e.payload,
    }
  })

  return NextResponse.json({ events: enriched })
}
