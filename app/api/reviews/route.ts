// app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase"
import { z } from "zod"

const ReviewSchema = z.object({
  name: z.string().min(2).max(100),
  socialHandle: z.string().max(100).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(1000)
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
      .eq("approved", true)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ reviews: (reviews ?? []).map(mapDbToCamel) })
  } catch (err) {
    console.error("[Storefront Reviews API GET]:", err)
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ReviewSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Invalid review fields", 
        details: parsed.error.flatten() 
      }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: review, error } = await (supabase as any)
      .from("reviews")
      .insert({
        name: parsed.data.name,
        social_handle: parsed.data.socialHandle || "",
        rating: parsed.data.rating,
        text: parsed.data.text,
        approved: false // explicitly draft by default
      })
      .select()
      .single()

    if (error || !review) throw error ?? new Error("Failed to insert review")

    return NextResponse.json(mapDbToCamel(review))
  } catch (err) {
    console.error("[Storefront Reviews API POST]:", err)
    return NextResponse.json({ error: "Failed to submit testimonial" }, { status: 500 })
  }
}
