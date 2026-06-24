// app/api/admin/status/route.ts
export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPlaceholderDb = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("localhost")

  return NextResponse.json({
    isPlaceholderDb
  })
}
