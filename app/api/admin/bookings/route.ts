// app/api/admin/bookings/route.ts
// GET  /api/admin/bookings — list all bookings (with filters)
// POST /api/admin/bookings — create a manual booking

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { getEndTime, generatePaystackReference, normalizePhone } from "@/lib/booking"
import { Prisma } from "@prisma/client"

const ghsToPesewas = (ghs: number) => Math.round(ghs * 100)
const pesewasToGhs = (p: number | null) => (p ?? 0) / 100

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "50")

  const where: Prisma.BookingWhereInput = {}

  if (status && status !== "ALL") {
    where.status = status as Prisma.EnumBookingStatusFilter
  }
  if (from || to) {
    where.sessionDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59Z") } : {}),
    }
  }
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { customerPhone: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ]
  }

  const [bookings, total, totalRevenueAgg, activeCount, pendingCount] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
    prisma.booking.aggregate({
      _sum: { amountGHS: true },
      where: { status: "CONFIRMED" }
    }),
    prisma.booking.count({
      where: { status: "CONFIRMED" }
    }),
    prisma.booking.count({
      where: { isDelivered: true }
    })
  ])

  return NextResponse.json({
    bookings: bookings.map((b: any) => ({ ...b, amountGHS: pesewasToGhs(b.amountGHS) })),
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      totalRevenueGHS: (totalRevenueAgg._sum.amountGHS ?? 0) / 100,
      activeBookings: activeCount,
      grantedSessions: pendingCount
    }
  })
}

const ManualBookingSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(9).max(16),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.number().min(1).max(12),
  studio: z.string().default("Main Studio"),
  equipment: z.array(z.string()).default([]),
  notes: z.string().max(500).optional(),
  amountGHS: z.number().min(0),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = ManualBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data
    const phone = normalizePhone(data.customerPhone)
    const endTime = getEndTime(data.sessionDate, data.startTime, data.durationHours)
    const bookingId = uuidv4()
    const paystackRef = generatePaystackReference(bookingId)

    const booking = await prisma.booking.create({
      data: {
        id: bookingId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: phone,
        sessionDate: new Date(`${data.sessionDate}T${data.startTime}:00Z`),
        startTime: data.startTime,
        endTime,
        durationHours: data.durationHours,
        studio: data.studio,
        equipment: data.equipment,
        notes: data.notes,
        amountGHS: ghsToPesewas(data.amountGHS),
        paystackReference: paystackRef,
        status: "CONFIRMED", // Manual bookings are auto-confirmed
        paystackStatus: "SUCCESS",
      },
    })

    return NextResponse.json({ ...booking, amountGHS: pesewasToGhs(booking.amountGHS) })
  } catch (err) {
    console.error("[Admin Bookings] Create error:", err)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { ids } = await req.json()
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const deleteCount = await prisma.booking.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    return NextResponse.json({ success: true, count: deleteCount.count })
  } catch (err) {
    console.error("[Admin Bookings] Bulk Delete error:", err)
    return NextResponse.json({ error: "Failed to delete bookings" }, { status: 500 })
  }
}
