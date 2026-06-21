// app/api/admin/status/route.ts
import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPlaceholderDb = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost")

  let paymentSimulationMode = true
  try {
    const supabase = createServiceClient()
    const { data: simSetting } = await (supabase as any)
      .from("settings")
      .select("value")
      .eq("key", "payment_simulation_mode")
      .single()

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
