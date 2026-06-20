// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const keys = [
      "payment_simulation_mode",
      "admin_password",
      "simulated_activity_control"
    ]

    const settings = await Promise.all(
      keys.map(async (key) => {
        const found = await prisma.setting.findUnique({ where: { key } })
        return { key, value: found ? found.value : "" }
      })
    )

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as any)

    // Set defaults if empty
    if (!settingsMap.payment_simulation_mode) settingsMap.payment_simulation_mode = "true"
    if (!settingsMap.admin_password) settingsMap.admin_password = "admin"
    if (!settingsMap.simulated_activity_control) settingsMap.simulated_activity_control = "true"

    return NextResponse.json(settingsMap)
  } catch (err) {
    console.error("[Settings GET error]:", err)
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body

    if (action === "UPDATE_SETTINGS") {
      const { settings } = body
      if (!settings || typeof settings !== "object") {
        return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 })
      }

      await Promise.all(
        Object.entries(settings).map(async ([key, value]) => {
          await prisma.setting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
          })
        })
      )

      return NextResponse.json({ success: true })
    }

    if (action === "WIPE_DATABASE") {
      // Clear bookings, reviews
      await Promise.all([
        prisma.booking.deleteMany({}),
        prisma.review.deleteMany({})
      ])

      // If we are in local offline mode, mockPrisma has a clean helper
      if (typeof (prisma as any).resetDatabase === "function") {
        await (prisma as any).resetDatabase()
      }

      return NextResponse.json({ success: true, message: "Database wiped and reset to default settings." })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err) {
    console.error("[Settings POST error]:", err)
    return NextResponse.json({ error: "Failed to process settings updates" }, { status: 500 })
  }
}
