// lib/hubtel.ts
// Hubtel REST API client for S&G Entertainment booking system

const MERCHANT_ACCOUNT = process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER!
const CLIENT_ID = process.env.HUBTEL_CLIENT_ID!
const CLIENT_SECRET = process.env.HUBTEL_CLIENT_SECRET!
const BASE_URL = "https://api-merchant.hubtel.com/v2"

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
