// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"

const ReviewSchema = z.object({
  name: z.string().min(2).max(100),
  socialHandle: z.string().max(100).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10).max(1000),
  approved: z.boolean().optional()
})

export async function GET(req: NextRequest) {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json({ reviews })
  } catch (err) {
    console.error("[Reviews API GET]:", err)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = ReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const review = await prisma.review.create({
      data: {
        name: parsed.data.name,
        socialHandle: parsed.data.socialHandle,
        rating: parsed.data.rating,
        text: parsed.data.text,
        approved: parsed.data.approved !== undefined ? parsed.data.approved : true
      }
    })

    return NextResponse.json(review)
  } catch (err) {
    console.error("[Reviews API POST]:", err)
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
  }
}
