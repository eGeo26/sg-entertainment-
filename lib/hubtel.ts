// lib/hubtel.ts
// Hubtel REST API client for S&G Entertainment booking system

// Environment configuration - defaults to sandbox for safety
const HUBTEL_ENV = (process.env.HUBTEL_ENV || "sandbox").toLowerCase()
const IS_SANDBOX = HUBTEL_ENV === "sandbox"

// Sandbox configuration
const SANDBOX_BASE_URL = "https://api-merchant.hubtel.com/v2/sandbox"
const SANDBOX_MERCHANT_ACCOUNT = process.env.HUBTEL_SANDBOX_MERCHANT_ACCOUNT_NUMBER || process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER
const SANDBOX_CLIENT_ID = process.env.HUBTEL_SANDBOX_CLIENT_ID || process.env.HUBTEL_CLIENT_ID
const SANDBOX_CLIENT_SECRET = process.env.HUBTEL_SANDBOX_CLIENT_SECRET || process.env.HUBTEL_CLIENT_SECRET

// Production configuration
const PRODUCTION_BASE_URL = "https://api-merchant.hubtel.com/v2"
const PRODUCTION_MERCHANT_ACCOUNT = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER
const PRODUCTION_CLIENT_ID = process.env.HUBTEL_CLIENT_ID
const PRODUCTION_CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET

// Use appropriate configuration based on environment
const BASE_URL = IS_SANDBOX ? SANDBOX_BASE_URL : PRODUCTION_BASE_URL
const MERCHANT_ACCOUNT = IS_SANDBOX ? SANDBOX_MERCHANT_ACCOUNT : PRODUCTION_MERCHANT_ACCOUNT
const CLIENT_ID = IS_SANDBOX ? SANDBOX_CLIENT_ID : PRODUCTION_CLIENT_ID
const CLIENT_SECRET = IS_SANDBOX ? SANDBOX_CLIENT_SECRET : PRODUCTION_CLIENT_SECRET

console.log(`[Hubtel] Using ${HUBTEL_ENV.toUpperCase()} environment (Base URL: ${BASE_URL})`)

function hubtelHeaders() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
  return {
    "Authorization": `Basic ${auth}`,
    "Content-Type": "application/json",
  }
}

interface InitializeParams {
  amountGHS: number
  description: string
  clientReference: string
  callbackUrl: string
  returnUrl: string
}

interface InitializeResponse {
  responseCode: string
  status: string
  data: {
    checkoutUrl: string
    checkoutId: string
    clientReference: string
    amount: number
  }
}

interface TransactionStatusResponse {
  responseCode: string
  status: string
  data: Array<{
    transactionId: string
    clientReference: string
    status: string // "Success" | "Completed" | "Pending" | "Failed"
    amount: number
    paymentMethod: string
  }>
}

/**
 * Initiate an Online Checkout transaction on Hubtel.
 * Returns the checkout page redirect URL.
 */
export async function initializeHubtelTransaction(
  params: InitializeParams
): Promise<InitializeResponse["data"]> {
  const url = `${BASE_URL}/merchantaccount/merchants/${MERCHANT_ACCOUNT}/receivepayment`
  
  const body = {
    amount: params.amountGHS,
    title: "Studio Session Booking",
    description: params.description,
    clientReference: params.clientReference,
    callbackUrl: params.callbackUrl,
    returnUrl: params.returnUrl,
    logoUrl: "https://sg-studio-booking.vercel.app/assets/sg-logo.png", // fallback production URL
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: hubtelHeaders(),
      body: JSON.stringify(body),
    })

    const data = await res.json() as InitializeResponse

    if (data.responseCode !== "0000" && data.status !== "Success") {
      throw new Error(`Hubtel API Error: ${data.status} (Code: ${data.responseCode})`)
    }

    return data.data
  } catch (err: any) {
    console.error("[Hubtel] Initialization failed:", err)
    throw err
  }
}

/**
 * Query the status of a transaction on Hubtel using the clientReference.
 */
export async function verifyHubtelTransaction(
  clientReference: string
): Promise<{ status: string; amount: number; transactionId?: string }> {
  const url = `${BASE_URL}/merchantaccount/merchants/${MERCHANT_ACCOUNT}/transactions/status?clientReference=${clientReference}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: hubtelHeaders(),
    })

    const data = await res.json() as TransactionStatusResponse

    if (!data.data || data.data.length === 0) {
      throw new Error(`No Hubtel transaction found for reference: ${clientReference}`)
    }

    const tx = data.data[0]
    return {
      status: tx.status, // "Success" / "Completed"
      amount: tx.amount,
      transactionId: tx.transactionId,
    }
  } catch (err: any) {
    console.error(`[Hubtel] Status check failed for ${clientReference}:`, err)
    throw err
  }
}

/** Helper to format GHS value from pesewas integer */
export function pesewasToGhs(pesewas: number): number {
  return parseFloat((pesewas / 100).toFixed(2))
}

/** Helper to format GHS display string */
export function formatGHS(amount: number): string {
  return `GHS ${amount.toFixed(2)}`
}
