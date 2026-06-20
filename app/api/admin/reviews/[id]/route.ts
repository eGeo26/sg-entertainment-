// app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const updated = await prisma.review.update({
      where: { id: params.id },
      data: body
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error("[Single Review PATCH Error]:", err)
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const deleted = await prisma.review.delete({
      where: { id: params.id }
    })
    return NextResponse.json(deleted)
  } catch (err) {
    console.error("[Single Review DELETE Error]:", err)
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
  }
}
