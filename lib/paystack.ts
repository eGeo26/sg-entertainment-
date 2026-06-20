// lib/paystack.ts
// Paystack integration for S&G Entertainment — Ghana (GHS, MoMo, Cards, USSD)

import crypto from "crypto"

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!
const BASE_URL = "https://api.paystack.co"

function paystackHeaders() {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  }
}

async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...paystackHeaders(), ...(options.headers ?? {}) },
  })
  const data = await res.json()
  if (!res.ok || !data.status) {
    throw new Error(`Paystack error: ${data.message ?? res.statusText}`)
  }
  return data as T
}

// ── Initialize transaction ────────────────────────────────────────────────────

export interface InitializeParams {
  email: string
  amountKobo: number          // amount in pesewas (1 GHS = 100 pesewas)
  reference: string
  callbackUrl: string
  metadata: {
    booking_id: string
    customer_name: string
    customer_phone: string
    session_date: string
    start_time: string
    end_time: string
    duration_hours: number
    studio: string
    cancel_action: string
  }
  channels?: string[]
}

export interface InitializeResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

/**
 * Initialize a Paystack transaction.
 * Supports MoMo (mobile_money), card, bank, USSD for Ghana.
 */
export async function initializeTransaction(
  params: InitializeParams
): Promise<InitializeResponse["data"]> {
  const payload = {
    email: params.email,
    amount: params.amountKobo,
    reference: params.reference,
    currency: "GHS",
    callback_url: params.callbackUrl,
    metadata: params.metadata,
    // Ghana-specific channels: mobile_money is MoMo (MTN, Vodafone Cash, AirtelTigo)
    channels: params.channels ?? ["card", "mobile_money", "bank", "ussd"],
  }

  const res = await paystackFetch<InitializeResponse>(
    "/transaction/initialize",
    { method: "POST", body: JSON.stringify(payload) }
  )
  return res.data
}

// ── Verify transaction ────────────────────────────────────────────────────────

export interface VerifyResponse {
  status: boolean
  message: string
  data: {
    id: number
    domain: string
    status: string            // "success" | "failed" | "abandoned"
    reference: string
    amount: number            // in pesewas
    currency: string
    paid_at: string
    customer: {
      email: string
      phone?: string
    }
    metadata: Record<string, unknown>
    channel: string           // "mobile_money" | "card" | "bank" etc.
    authorization?: {
      bank?: string
      brand?: string
      last4?: string
        channel: string
    }
  }
}

/**
 * Verify a Paystack transaction by reference.
 * Always verify on the backend — never trust frontend-only callbacks.
 */
export async function verifyTransaction(reference: string): Promise<VerifyResponse["data"]> {
  const res = await paystackFetch<VerifyResponse>(`/transaction/verify/${reference}`)
  return res.data
}

// ── Webhook signature verification ───────────────────────────────────────────

/**
 * Verify the Paystack webhook signature.
 * Must be called before processing any webhook payload.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? process.env.PAYSTACK_SECRET_KEY!
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex")
  return hash === signature
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export interface RefundParams {
  transaction: string          // Paystack transaction ID or reference
  amount?: number              // partial refund in pesewas; omit for full refund
  reason?: string
}

export async function refundTransaction(params: RefundParams): Promise<void> {
  await paystackFetch("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: params.transaction,
      ...(params.amount ? { amount: params.amount } : {}),
      merchant_note: params.reason ?? "Customer requested refund",
    }),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert GHS to pesewas (Paystack requires pesewas) */
export function ghsToPesewas(ghs: number): number {
  return Math.round(ghs * 100)
}

/** Convert pesewas to GHS */
export function pesewasToGhs(pesewas: number): number {
  return pesewas / 100
}

/** Format GHS currency for display */
export function formatGHS(ghs: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(ghs)
}
