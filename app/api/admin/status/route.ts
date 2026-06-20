// app/api/admin/status/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPlaceholderDb = !process.env.DATABASE_URL || 
    process.env.DATABASE_URL.includes("user:password") ||
    process.env.DATABASE_URL.includes("host:5432")

  let paymentSimulationMode = true
  try {
    const simSetting = await prisma.setting.findUnique({
      where: { key: "payment_simulation_mode" }
    })
    if (simSetting) {
      paymentSimulationMode = simSetting.value === "true"
    }
  } catch (e) {
    console.error("Failed to query settings table", e)
  }

  return NextResponse.json({
    isPlaceholderDb,
    paymentSimulationMode
  })
}
