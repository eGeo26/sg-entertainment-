// app/api/admin/reviews/route.ts
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"
import { z } from "zod"

const ReviewSchema = z.object({
  name: z.string().min(2).max(100),
  socialHandle: z.string().max(100).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(1000),
  approved: z.boolean().optional()
})

function mapDbToCamel(r: any) {
  return {
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    socialHandle: r.social_handle,
    rating: r.rating,
    text: r.text,
    approved: r.approved
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    const { data: reviews, error } = await (supabase as any)
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ reviews: (reviews ?? []).map(mapDbToCamel) })
  } catch (err) {
    console.error("[Reviews API GET]:", err)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = ReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: review, error } = await (supabase as any)
      .from("reviews")
      .insert({
        name: parsed.data.name,
        social_handle: parsed.data.socialHandle ?? null,
        rating: parsed.data.rating,
        text: parsed.data.text,
        approved: parsed.data.approved !== undefined ? parsed.data.approved : true
      })
      .select()
      .single()

    if (error || !review) throw error ?? new Error("Failed to insert review")

    return NextResponse.json(mapDbToCamel(review))
  } catch (err) {
    console.error("[Reviews API POST]:", err)
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
  }
}
