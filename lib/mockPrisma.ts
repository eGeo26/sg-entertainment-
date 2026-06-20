// lib/mockPrisma.ts
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const MOCK_DB_PATH = path.join(process.cwd(), "prisma", "mock-db.json")

interface Booking {
  id: string
  createdAt: Date
  updatedAt: Date
  customerName: string
  customerEmail: string
  customerPhone: string
  sessionDate: Date
  startTime: string
  endTime: string
  durationHours: number
  studio: string
  equipment: string[]
  notes: string | null
  amountGHS: number
  currency: string
  anollaBookingId: string | null
  anollaStatus: string
  paystackReference: string | null
  paystackStatus: string
  status: string
  customerNotified: boolean
  ownerNotified: boolean
  processedEvents: string[]
  isPaid: boolean
  isPacked: boolean
  isDispatched: boolean
  isDelivered: boolean
  adminNotes: string | null
  estimatedDeliveryTime: string | null
}

interface WebhookEvent {
  id: string
  source: string
  eventId: string
  eventType: string
  payload: any
  processedAt: Date
}

interface Review {
  id: string
  createdAt: Date
  name: string
  socialHandle: string | null
  rating: number
  text: string
  approved: boolean
}

interface Setting {
  key: string
  value: string
}

interface MockData {
  bookings: Booking[]
  webhookEvents: WebhookEvent[]
  reviews: Review[]
  settings: Setting[]
}

function generateMockData(): MockData {
  return {
    bookings: [],
    webhookEvents: [],
    reviews: [],
    settings: [
      { key: "payment_simulation_mode", value: "true" },
      { key: "admin_password", value: "admin" },
      { key: "simulated_activity_control", value: "true" }
    ]
  }
}

function loadData(): MockData {
  if (!fs.existsSync(MOCK_DB_PATH)) {
    const defaultData = generateMockData()
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true })
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(defaultData, null, 2))
    return defaultData
  }
  try {
    const raw = fs.readFileSync(MOCK_DB_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    
    const bookings = (parsed.bookings || []).map((b: any) => ({
      ...b,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
      sessionDate: new Date(b.sessionDate)
    }))
    const webhookEvents = (parsed.webhookEvents || []).map((e: any) => ({
      ...e,
      processedAt: new Date(e.processedAt)
    }))
    const reviews = (parsed.reviews || []).map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      approved: r.approved !== undefined ? r.approved : false
    }))
    const settings = parsed.settings || [
      { key: "payment_simulation_mode", value: "true" },
      { key: "admin_password", value: "admin" },
      { key: "simulated_activity_control", value: "true" }
    ]
    return { bookings, webhookEvents, reviews, settings }
  } catch (err) {
    console.error("Failed to parse mock-db.json, recreating", err)
    const defaultData = generateMockData()
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(defaultData, null, 2))
    return defaultData
  }
}

function saveData(data: MockData) {
  fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2))
}

export const mockPrisma = {
  resetDatabase: async () => {
    const defaultData = generateMockData()
    saveData(defaultData)
    return true
  },

  booking: {
    findMany: async (args: any = {}) => {
      const data = loadData()
      let result = [...data.bookings]

      if (args.where) {
        result = result.filter((b) => {
          if (args.where.status) {
            if (typeof args.where.status === "string" && b.status !== args.where.status) {
              return false
            }
          }
          if (args.where.paystackStatus && b.paystackStatus !== args.where.paystackStatus) {
            return false
          }
          if (args.where.sessionDate) {
            const sd = b.sessionDate.getTime()
            if (args.where.sessionDate.gte && sd < new Date(args.where.sessionDate.gte).getTime()) {
              return false
            }
            if (args.where.sessionDate.lte && sd > new Date(args.where.sessionDate.lte).getTime()) {
              return false
            }
          }
          if (args.where.OR) {
            const orMatch = args.where.OR.some((cond: any) => {
              const [[key, value]] = Object.entries(cond)
              const term = (value as any).contains.toLowerCase()
              const bVal = (b as any)[key]
              return bVal && bVal.toString().toLowerCase().includes(term)
            })
            if (!orMatch) return false
          }
          return true
        })
      }

      if (args.orderBy) {
        const [[key, dir]] = Object.entries(args.orderBy)
        result.sort((a: any, b: any) => {
          const valA = a[key] instanceof Date ? a[key].getTime() : a[key]
          const valB = b[key] instanceof Date ? b[key].getTime() : b[key]
          if (dir === "desc") {
            return valB > valA ? 1 : valB < valA ? -1 : 0
          } else {
            return valA > valB ? 1 : valA < valB ? -1 : 0
          }
        })
      }

      if (args.skip !== undefined) {
        result = result.slice(args.skip)
      }
      if (args.take !== undefined) {
        result = result.slice(0, args.take)
      }

      return result
    },

    findUnique: async (args: any) => {
      const data = loadData()
      const { where } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const found = data.bookings.find((b: any) => b[key] === val)
      return found || null
    },

    count: async (args: any = {}) => {
      const bookings = await mockPrisma.booking.findMany({ where: args.where })
      return bookings.length
    },

    aggregate: async (args: any = {}) => {
      const bookings = await mockPrisma.booking.findMany({ where: args.where })
      let sum = 0
      if (args._sum && args._sum.amountGHS) {
        sum = bookings.reduce((acc, curr) => acc + curr.amountGHS, 0)
      }
      return {
        _sum: {
          amountGHS: sum
        }
      }
    },

    create: async (args: any) => {
      const data = loadData()
      const newBooking: Booking = {
        id: args.data.id || uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        customerName: args.data.customerName,
        customerEmail: args.data.customerEmail,
        customerPhone: args.data.customerPhone,
        sessionDate: new Date(args.data.sessionDate),
        startTime: args.data.startTime,
        endTime: args.data.endTime,
        durationHours: args.data.durationHours,
        studio: args.data.studio || "Main Studio",
        equipment: args.data.equipment || [],
        notes: args.data.notes || null,
        amountGHS: args.data.amountGHS,
        currency: args.data.currency || "GHS",
        anollaBookingId: args.data.anollaBookingId || null,
        anollaStatus: args.data.anollaStatus || "PENDING",
        paystackReference: args.data.paystackReference || null,
        paystackStatus: args.data.paystackStatus || "PENDING",
        status: args.data.status || "AWAITING_PAYMENT",
        customerNotified: args.data.customerNotified || false,
        ownerNotified: args.data.ownerNotified || false,
        processedEvents: args.data.processedEvents || [],
        isPaid: args.data.isPaid || false,
        isPacked: args.data.isPacked || false,
        isDispatched: args.data.isDispatched || false,
        isDelivered: args.data.isDelivered || false,
        adminNotes: args.data.adminNotes || null,
        estimatedDeliveryTime: args.data.estimatedDeliveryTime || null,
      }
      data.bookings.unshift(newBooking)
      saveData(data)
      return newBooking
    },

    update: async (args: any) => {
      const data = loadData()
      const { where, data: updateFields } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const idx = data.bookings.findIndex((b: any) => b[key] === val)
      if (idx === -1) {
        throw new Error(`Record to update not found: ${key}=${val}`)
      }
      const existing = data.bookings[idx]

      const updated = {
        ...existing,
        ...updateFields,
        updatedAt: new Date()
      }
      if (updateFields.sessionDate) updated.sessionDate = new Date(updateFields.sessionDate)
      
      data.bookings[idx] = updated
      saveData(data)
      return updated
    },

    delete: async (args: any) => {
      const data = loadData()
      const { where } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const idx = data.bookings.findIndex((b: any) => b[key] === val)
      if (idx === -1) {
        throw new Error(`Record to delete not found: ${key}=${val}`)
      }
      const deleted = data.bookings.splice(idx, 1)[0]
      saveData(data)
      return deleted
    },

    deleteMany: async (args: any = {}) => {
      const data = loadData()
      if (args.where && args.where.id && args.where.id.in) {
        const ids = args.where.id.in as string[]
        const beforeCount = data.bookings.length
        data.bookings = data.bookings.filter(b => !ids.includes(b.id))
        saveData(data)
        return { count: beforeCount - data.bookings.length }
      }
      data.bookings = []
      saveData(data)
      return { count: data.bookings.length }
    }
  },

  webhookEvent: {
    findMany: async (args: any = {}) => {
      const data = loadData()
      let result = [...data.webhookEvents]

      if (args.where) {
        result = result.filter((e) => {
          if (args.where.source && e.source !== args.where.source) return false
          return true
        })
      }

      if (args.orderBy) {
        const [[key, dir]] = Object.entries(args.orderBy)
        result.sort((a: any, b: any) => {
          const valA = a[key] instanceof Date ? a[key].getTime() : a[key]
          const valB = b[key] instanceof Date ? b[key].getTime() : b[key]
          if (dir === "desc") {
            return valB > valA ? 1 : valB < valA ? -1 : 0
          } else {
            return valA > valB ? 1 : valA < valB ? -1 : 0
          }
        })
      }

      return result
    },

    findUnique: async (args: any) => {
      const data = loadData()
      const { where } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const found = data.webhookEvents.find((e: any) => e[key] === val)
      return found || null
    },

    create: async (args: any) => {
      const data = loadData()
      const newEvent: WebhookEvent = {
        id: args.data.id || uuidv4(),
        source: args.data.source,
        eventId: args.data.eventId,
        eventType: args.data.eventType,
        payload: args.data.payload,
        processedAt: new Date()
      }
      data.webhookEvents.unshift(newEvent)
      saveData(data)
      return newEvent
    }
  },

  review: {
    findMany: async (args: any = {}) => {
      const data = loadData()
      let result = [...data.reviews]

      if (args.where) {
        result = result.filter((r) => {
          if (args.where.approved !== undefined && r.approved !== args.where.approved) {
            return false
          }
          return true
        })
      }

      if (args.orderBy) {
        const [[key, dir]] = Object.entries(args.orderBy)
        result.sort((a: any, b: any) => {
          const valA = a[key] instanceof Date ? a[key].getTime() : a[key]
          const valB = b[key] instanceof Date ? b[key].getTime() : b[key]
          if (dir === "desc") {
            return valB > valA ? 1 : valB < valA ? -1 : 0
          } else {
            return valA > valB ? 1 : valA < valB ? -1 : 0
          }
        })
      }

      if (args.skip !== undefined) {
        result = result.slice(args.skip)
      }
      if (args.take !== undefined) {
        result = result.slice(0, args.take)
      }

      return result
    },

    findUnique: async (args: any) => {
      const data = loadData()
      const { where } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const found = data.reviews.find((r: any) => r[key] === val)
      return found || null
    },

    count: async (args: any = {}) => {
      const data = loadData()
      return data.reviews.length
    },

    create: async (args: any) => {
      const data = loadData()
      const newReview: Review = {
        id: args.data.id || uuidv4(),
        createdAt: new Date(),
        name: args.data.name,
        socialHandle: args.data.socialHandle || null,
        rating: args.data.rating,
        text: args.data.text,
        approved: args.data.approved || false
      }
      data.reviews.unshift(newReview)
      saveData(data)
      return newReview
    },

    update: async (args: any) => {
      const data = loadData()
      const { where, data: updateFields } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const idx = data.reviews.findIndex((r: any) => r[key] === val)
      if (idx === -1) {
        throw new Error(`Review to update not found: ${key}=${val}`)
      }
      const existing = data.reviews[idx]

      const updated = {
        ...existing,
        ...updateFields
      }
      data.reviews[idx] = updated
      saveData(data)
      return updated
    },

    delete: async (args: any) => {
      const data = loadData()
      const { where } = args
      const key = Object.keys(where)[0]
      const val = where[key]
      const idx = data.reviews.findIndex((r: any) => r[key] === val)
      if (idx === -1) {
        throw new Error(`Review to delete not found: ${key}=${val}`)
      }
      const deleted = data.reviews.splice(idx, 1)[0]
      saveData(data)
      return deleted
    }
  },

  setting: {
    findUnique: async (args: any) => {
      const data = loadData()
      const { where } = args
      const found = data.settings.find(s => s.key === where.key)
      return found || null
    },

    upsert: async (args: any) => {
      const data = loadData()
      const { where, update, create } = args
      const idx = data.settings.findIndex(s => s.key === where.key)
      if (idx !== -1) {
        data.settings[idx].value = update.value
        saveData(data)
        return data.settings[idx]
      } else {
        const newSetting = { key: create.key, value: create.value }
        data.settings.push(newSetting)
        saveData(data)
        return newSetting
      }
    },

    update: async (args: any) => {
      const data = loadData()
      const { where, data: updateFields } = args
      const idx = data.settings.findIndex(s => s.key === where.key)
      if (idx === -1) {
        throw new Error(`Setting not found: ${where.key}`)
      }
      data.settings[idx].value = updateFields.value
      saveData(data)
      return data.settings[idx]
    }
  }
}
