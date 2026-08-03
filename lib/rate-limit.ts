import { NextRequest, NextResponse } from "next/server"

type RateLimitEntry = { count: number; resetAt: number }

const globalRateLimit = globalThis as typeof globalThis & {
  __sgRateLimitStore?: Map<string, RateLimitEntry>
}

const store = globalRateLimit.__sgRateLimitStore ?? new Map<string, RateLimitEntry>()
globalRateLimit.__sgRateLimitStore = store

export function getRequestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown"
}

export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  limit = 10,
  windowMs = 60_000
): NextResponse | null {
  const now = Date.now()
  const key = `${scope}:${getRequestIp(req)}`
  const current = store.get(key)
  const entry = !current || current.resetAt <= now
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt }

  store.set(key, entry)

  // Keep a long-lived server process from retaining expired IP entries forever.
  if (store.size > 1_000) {
    for (const [storedKey, storedEntry] of store) {
      if (storedEntry.resetAt <= now) store.delete(storedKey)
    }
  }

  if (entry.count <= limit) return null

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1_000))
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  )
}
