// lib/prisma.ts
import { PrismaClient } from "@prisma/client"
import { mockPrisma } from "./mockPrisma"

declare global {
  // eslint-disable-next-line no-var
  var prisma: any
}

const isPlaceholderDb = !process.env.DATABASE_URL || 
  process.env.DATABASE_URL.includes("user:password") ||
  process.env.DATABASE_URL.includes("host:5432")

let prismaInstance: any

if (isPlaceholderDb) {
  prismaInstance = mockPrisma
} else {
  prismaInstance = global.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  if (process.env.NODE_ENV !== "production") {
    global.prisma = prismaInstance
  }
}

export default prismaInstance
