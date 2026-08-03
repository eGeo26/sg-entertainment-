// lib/producer-auth.ts
import { type NextRequest } from "next/server"
import { createHmac, randomBytes, timingSafeEqual } from "crypto"

const PRODUCER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24

function getSigningSecret() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error("Producer session signing secret is not configured")
  return secret
}

export function createProducerSessionToken(): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = `${issuedAt}.${randomBytes(16).toString("base64url")}`
  const signature = createHmac("sha256", getSigningSecret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function verifyProducerSession(req: NextRequest): boolean {
  const token = req.cookies.get("producer_auth")?.value
  if (!token) return false

  const parts = token.split(".")
  if (parts.length !== 3) return false

  const [issuedAtRaw, nonce, suppliedSignature] = parts
  const issuedAt = Number(issuedAtRaw)
  const age = Math.floor(Date.now() / 1000) - issuedAt
  if (!Number.isFinite(issuedAt) || age < 0 || age > PRODUCER_SESSION_MAX_AGE_SECONDS) return false

  const payload = `${issuedAtRaw}.${nonce}`
  const expectedSignature = createHmac("sha256", getSigningSecret()).update(payload).digest()

  let supplied: Buffer
  try {
    supplied = Buffer.from(suppliedSignature, "base64url")
  } catch {
    return false
  }

  return supplied.length === expectedSignature.length && timingSafeEqual(supplied, expectedSignature)
}
