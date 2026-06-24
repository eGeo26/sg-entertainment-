// lib/hubtel.ts
// Hubtel POS Online Checkout API client — S&G Entertainment booking system
//
// SECURITY RULES:
//   - All env vars prefixed HUBTEL_ are SERVER-SIDE ONLY.
//   - Never import this file inside a "use client" component.
//   - Credentials are Base64-encoded at runtime and never cached in module scope.

const HUBTEL_INITIATE_URL =
  "https://payproxyapi.hubtel.com/items/initiate"

// ── Auth header builder ────────────────────────────────────────────────────────
// Uses HUBTEL_API_ID and HUBTEL_API_KEY (as supplied in the user spec).
// Falls back to legacy HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET for backwards compat.
function buildBasicAuth(): string {
  const apiId =
    process.env.HUBTEL_API_ID ||
    process.env.HUBTEL_CLIENT_ID ||
    ""
  const apiKey =
    process.env.HUBTEL_API_KEY ||
    process.env.HUBTEL_CLIENT_SECRET ||
    ""

  if (!apiId || !apiKey) {
    throw new Error(
      "[Hubtel] Missing credentials. Set HUBTEL_API_ID and HUBTEL_API_KEY in .env.local"
    )
  }

  return "Basic " + Buffer.from(`${apiId}:${apiKey}`).toString("base64")
}

function hubtelHeaders(): Record<string, string> {
  return {
    Authorization: buildBasicAuth(),
    "Content-Type": "application/json",
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HubtelInitiateParams {
  totalAmount: number            // GHS value e.g. 300.00
  description: string
  clientReference: string        // your booking code — must be unique per transaction
  callbackUrl: string            // server-side callback (webhook)
  returnUrl: string              // redirect after success
  cancellationUrl: string        // redirect after cancel / failure
  customerName?: string
  customerEmail?: string
  customerMobileNumber?: string
}

export interface HubtelInitiateResult {
  /** The hosted Hubtel checkout page to redirect the user to */
  checkoutUrl: string
  /** Hubtel's internal checkout/transaction ID */
  checkoutId?: string
  clientReference: string
}

interface HubtelApiResponse {
  // Hubtel returns different wrapper shapes — handle both
  status?: string
  responseCode?: string
  message?: string
  data?: {
    checkoutUrl?: string
    checkout_url?: string
    checkoutId?: string
    transactionId?: string
    clientReference?: string
  }
  // Some endpoints return the URL directly at the root
  checkoutUrl?: string
  checkout_url?: string
}

// ── Initiate Transaction ───────────────────────────────────────────────────────

/**
 * Initiates a Hubtel POS Online Checkout transaction.
 * Returns the checkout URL to redirect the customer to.
 *
 * Throws with a structured HubtelError on failure so the caller can provide
 * user-friendly messages.
 */
export async function initiateHubtelTransaction(
  params: HubtelInitiateParams
): Promise<HubtelInitiateResult> {
  const merchantAccountNumber =
    process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER ||
    process.env.HUBTEL_SANDBOX_MERCHANT_ACCOUNT_NUMBER ||
    ""

  if (!merchantAccountNumber) {
    throw new HubtelError(
      "config",
      "HUBTEL_MERCHANT_ACCOUNT_NUMBER is not set.",
      null
    )
  }

  const requestBody = {
    merchantAccountNumber,
    amount: params.totalAmount,
    description: params.description,
    clientReference: params.clientReference,
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    cancellationUrl: params.cancellationUrl,
  }

  console.log("[Hubtel] Calling URL:", HUBTEL_INITIATE_URL)
  console.log("[Hubtel] Payload:", JSON.stringify(requestBody))

  let res: Response
  try {
    res = await fetch(HUBTEL_INITIATE_URL, {
      method: "POST",
      headers: hubtelHeaders(),
      body: JSON.stringify(requestBody),
      // 30s timeout guard
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      console.error("[Hubtel] Request timed out after 30s")
      throw new HubtelError(
        "timeout",
        "The payment gateway timed out. Please try again in a moment.",
        err
      )
    }
    console.error("[Hubtel] Network error:", err)
    throw new HubtelError(
      "network",
      "Could not reach the payment gateway. Please check your connection.",
      err
    )
  }

  let json: HubtelApiResponse
  try {
    json = await res.json()
  } catch {
    console.error("[Hubtel] Non-JSON response, status:", res.status)
    throw new HubtelError(
      "invalid_response",
      "Received an unexpected response from the payment gateway.",
      null,
      res.status
    )
  }

  console.log("[Hubtel] API response:", {
    status: res.status,
    responseCode: json.responseCode,
    hubtelStatus: json.status,
    message: json.message,
    fullResponse: JSON.stringify(json)
  })

  // ── Credential/auth errors ─────────────────────────────────────────────────
  if (res.status === 401 || res.status === 403) {
    console.error("[Hubtel] Auth error - Full response:", JSON.stringify(json))
    throw new HubtelError(
      "invalid_credentials",
      "Payment gateway authentication failed. Please contact support.",
      json,
      res.status
    )
  }

  // ── Declined / business-rule errors ───────────────────────────────────────
  if (!res.ok) {
    const msg =
      json.message ||
      `Hubtel returned status ${res.status}`
    console.error("[Hubtel] Declined error - Full response:", JSON.stringify(json))
    throw new HubtelError("declined", msg, json, res.status)
  }

  // ── Extract checkout URL from either response shape ────────────────────────
  const checkoutUrl =
    json.data?.checkoutUrl ||
    json.data?.checkout_url ||
    json.checkoutUrl ||
    json.checkout_url

  if (!checkoutUrl) {
    console.error("[Hubtel] No checkoutUrl in response:", json)
    throw new HubtelError(
      "missing_checkout_url",
      "The payment gateway did not return a checkout link. Please try again.",
      json,
      res.status
    )
  }

  return {
    checkoutUrl,
    checkoutId: json.data?.checkoutId ?? json.data?.transactionId,
    clientReference:
      json.data?.clientReference ?? params.clientReference,
  }
}

// ── Verify Transaction Status ──────────────────────────────────────────────────

export interface HubtelVerifyResult {
  status: string   // "Success" | "Completed" | "Pending" | "Failed"
  amount: number
  transactionId?: string
}

/**
 * Queries Hubtel for the current status of a transaction by clientReference.
 * Used in the callback route to confirm payment before updating the DB.
 */
export async function verifyHubtelTransaction(
  clientReference: string
): Promise<HubtelVerifyResult> {
  const MERCHANT_ACCOUNT =
    process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER ||
    process.env.HUBTEL_SANDBOX_MERCHANT_ACCOUNT_NUMBER ||
    ""

  if (!MERCHANT_ACCOUNT) {
    throw new HubtelError(
      "config",
      "HUBTEL_MERCHANT_ACCOUNT_NUMBER is not set.",
      null
    )
  }

  const url = `https://api-merchant.hubtel.com/v2/merchantaccount/merchants/${MERCHANT_ACCOUNT}/transactions/status?clientReference=${encodeURIComponent(clientReference)}`

  let res: Response
  try {
    res = await fetch(url, {
      method: "GET",
      headers: hubtelHeaders(),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (err: any) {
    throw new HubtelError(
      err?.name === "TimeoutError" ? "timeout" : "network",
      "Could not verify transaction status with Hubtel.",
      err
    )
  }

  if (!res.ok) {
    throw new HubtelError(
      "verify_failed",
      `Hubtel verification returned status ${res.status}`,
      null,
      res.status
    )
  }

  const json = await res.json() as {
    data?: Array<{
      transactionId?: string
      clientReference?: string
      status?: string
      amount?: number
    }>
  }

  if (!json.data || json.data.length === 0) {
    throw new HubtelError(
      "not_found",
      `No Hubtel transaction found for reference: ${clientReference}`,
      null
    )
  }

  const tx = json.data[0]
  return {
    status: tx.status ?? "Unknown",
    amount: tx.amount ?? 0,
    transactionId: tx.transactionId,
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert raw pesewas integer to GHS float */
export function pesewasToGhs(pesewas: number): number {
  return parseFloat((pesewas / 100).toFixed(2))
}

/** Format a GHS amount as a display string */
export function formatGHS(amount: number): string {
  return `GHS ${amount.toFixed(2)}`
}

// ── Error class ────────────────────────────────────────────────────────────────

export type HubtelErrorCode =
  | "timeout"
  | "network"
  | "invalid_credentials"
  | "declined"
  | "invalid_response"
  | "missing_checkout_url"
  | "verify_failed"
  | "not_found"
  | "config"

export class HubtelError extends Error {
  public readonly code: HubtelErrorCode
  public readonly raw: unknown
  public readonly httpStatus?: number

  constructor(
    code: HubtelErrorCode,
    message: string,
    raw: unknown,
    httpStatus?: number
  ) {
    super(message)
    this.name = "HubtelError"
    this.code = code
    this.raw = raw
    this.httpStatus = httpStatus
  }

  /** Returns a safe, user-facing message (no internal details) */
  toUserMessage(): string {
    switch (this.code) {
      case "timeout":
        return "The payment gateway timed out. Please try again in a moment."
      case "network":
        return "Could not connect to the payment gateway. Please check your connection and try again."
      case "invalid_credentials":
        return "Payment configuration error. Please contact us directly to complete your booking."
      case "declined":
        return this.message || "Your payment was declined. Please try a different method."
      case "invalid_response":
      case "missing_checkout_url":
        return "The payment gateway returned an unexpected response. Please try again or contact us."
      case "verify_failed":
      case "not_found":
        return "We could not confirm your payment status. Please contact us with your booking reference."
      case "config":
        return "Payment system is not fully configured. Please contact us directly."
      default:
        return "An unexpected error occurred with the payment system. Please try again."
    }
  }
}

// ── Legacy alias (keeps bookings/create/route.ts importing without change) ─────
/**
 * @deprecated Use initiateHubtelTransaction() instead.
 * Kept for backwards-compatibility during the transition from the old lib.
 */
export async function initializeHubtelTransaction(params: {
  amountGHS: number
  description: string
  clientReference: string
  callbackUrl: string
  returnUrl: string
}): Promise<{ checkoutUrl: string; checkoutId?: string; clientReference: string }> {
  return initiateHubtelTransaction({
    totalAmount: params.amountGHS,
    description: params.description,
    clientReference: params.clientReference,
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    cancellationUrl: params.callbackUrl, // legacy callers didn't supply cancellationUrl
  })
}
