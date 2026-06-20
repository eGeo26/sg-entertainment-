// app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { z } from "zod"

const ReviewSchema = z.object({
  name: z.string().min(2).max(100),
  socialHandle: z.string().max(100).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(1000)
})

export async function GET(req: NextRequest) {
  try {
    const reviews = await prisma.review.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json({ reviews })
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

    const review = await prisma.review.create({
      data: {
        name: parsed.data.name,
        socialHandle: parsed.data.socialHandle || "",
        rating: parsed.data.rating,
        text: parsed.data.text,
        approved: false // explicitly draft by default
      }
    })

    return NextResponse.json(review)
  } catch (err) {
    console.error("[Storefront Reviews API POST]:", err)
    return NextResponse.json({ error: "Failed to submit testimonial" }, { status: 500 })
  }
}
