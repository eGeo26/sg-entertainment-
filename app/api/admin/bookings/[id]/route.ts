// app/api/admin/bookings/[id]/route.ts
// GET    — full booking detail
// PATCH  — update status / fields
// DELETE — cancel booking

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { pesewasToGhs } from "@/lib/paystack"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const booking = await prisma.booking.findUnique({ where: { id: params.id } })
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ...booking, amountGHS: pesewasToGhs(booking.amountGHS) })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json({ ...updated, amountGHS: pesewasToGhs(updated.amountGHS) })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  })

  return NextResponse.json({ ...updated, amountGHS: pesewasToGhs(updated.amountGHS) })
}
