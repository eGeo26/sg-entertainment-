// app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getAdminSession, createServiceClient } from "@/lib/supabase"

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const supabase = createServiceClient()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.socialHandle !== undefined) updateData.social_handle = body.socialHandle
    if (body.rating !== undefined) updateData.rating = body.rating
    if (body.text !== undefined) updateData.text = body.text
    if (body.approved !== undefined) updateData.approved = body.approved

    const { data: updated, error } = await (supabase as any)
      .from("reviews")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error || !updated) throw error ?? new Error("Failed to update review")

    return NextResponse.json(mapDbToCamel(updated))
  } catch (err) {
    console.error("[Single Review PATCH Error]:", err)
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = createServiceClient()
    const { data: deleted, error } = await (supabase as any)
      .from("reviews")
      .delete()
      .eq("id", params.id)
      .select()
      .single()

    if (error || !deleted) throw error ?? new Error("Failed to delete review")

    return NextResponse.json(mapDbToCamel(deleted))
  } catch (err) {
    console.error("[Single Review DELETE Error]:", err)
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
  }
}
