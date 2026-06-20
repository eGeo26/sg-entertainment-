// lib/whatsapp.ts
// WhatsApp notifications via Twilio for S&G Entertainment
// Sends booking confirmations to both customer and studio owner

import { formatGHS } from "./paystack"

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN!
const FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886"
const OWNER_NUMBER = process.env.STUDIO_OWNER_WHATSAPP!

export interface BookingNotificationData {
  bookingId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  sessionDate: string         // "Monday, 12 August 2024"
  startTime: string           // "10:00 AM"
  endTime: string             // "02:00 PM"
  durationHours: number
  studio: string
  equipment: string[]
  amountGHS: number
  paystackReference: string
  notes?: string
}

// ── Twilio API call ───────────────────────────────────────────────────────────

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  const params = new URLSearchParams({ From: FROM, To: to, Body: body })

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Twilio error ${res.status}: ${err.message}`)
  }

  const data = await res.json()
  console.log(`[WhatsApp] Message sent to ${to}. SID: ${data.sid}`)
}

// ── Message templates ─────────────────────────────────────────────────────────

export function customerConfirmationMessage(d: BookingNotificationData): string {
  const equipmentList =
    d.equipment.length > 0 ? d.equipment.join(", ") : "None"

  return `
✅ *Booking Confirmed — S&G Entertainment*

Hi ${d.customerName}! Your studio session is confirmed. Here are your booking details:

📅 *Date:* ${d.sessionDate}
⏰ *Time:* ${d.startTime} – ${d.endTime} (${d.durationHours} hour${d.durationHours > 1 ? "s" : ""})
🎙️ *Studio:* ${d.studio}
🎛️ *Equipment:* ${equipmentList}
💰 *Amount Paid:* ${formatGHS(d.amountGHS)}
🔖 *Reference:* ${d.bookingId.slice(0, 8).toUpperCase()}

📍 *Location:* Taifa, Accra, Ghana
📞 *Studio:* ${process.env.NEXT_PUBLIC_STUDIO_PHONE}

${d.notes ? `📝 *Your notes:* ${d.notes}\n` : ""}
Please arrive 10 minutes early. Bring a valid ID.

See you soon! 🎵
S&G Entertainment Team
`.trim()
}

function ownerNewBookingMessage(d: BookingNotificationData): string {
  const equipmentList =
    d.equipment.length > 0 ? d.equipment.join(", ") : "None"

  return `
🔔 *New Booking — S&G Entertainment*

A new paid booking has been confirmed!

👤 *Client:* ${d.customerName}
📱 *Phone:* ${d.customerPhone}
📧 *Email:* ${d.customerEmail}

📅 *Date:* ${d.sessionDate}
⏰ *Time:* ${d.startTime} – ${d.endTime} (${d.durationHours} hrs)
🎙️ *Studio:* ${d.studio}
🎛️ *Equipment:* ${equipmentList}
💰 *Revenue:* ${formatGHS(d.amountGHS)}
💳 *Paystack Ref:* ${d.paystackReference}
🆔 *Booking ID:* ${d.bookingId.slice(0, 8).toUpperCase()}

${d.notes ? `📝 *Client notes:* ${d.notes}` : ""}
`.trim()
}

function customerCancellationMessage(d: BookingNotificationData): string {
  return `
⚠️ *Booking Cancelled — S&G Entertainment*

Hi ${d.customerName}, your booking has been cancelled.

📅 *Date:* ${d.sessionDate}
⏰ *Time:* ${d.startTime} – ${d.endTime}
🔖 *Reference:* ${d.bookingId.slice(0, 8).toUpperCase()}

Your refund of *${formatGHS(d.amountGHS)}* will be processed within 3–5 business days.

For questions, call us at ${process.env.NEXT_PUBLIC_STUDIO_PHONE}.

S&G Entertainment Team
`.trim()
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Send booking confirmation to customer + owner.
 * Called after successful Paystack payment + Anolla confirmation.
 */
export async function sendBookingConfirmationNotifications(
  data: BookingNotificationData
): Promise<{ customerSent: boolean; ownerSent: boolean }> {
  let customerSent = false
  let ownerSent = false

  const customerWA = `whatsapp:${data.customerPhone}`

  try {
    await sendWhatsApp(customerWA, customerConfirmationMessage(data))
    customerSent = true
  } catch (err) {
    console.error("[WhatsApp] Failed to notify customer:", err)
  }

  try {
    await sendWhatsApp(OWNER_NUMBER, ownerNewBookingMessage(data))
    ownerSent = true
  } catch (err) {
    console.error("[WhatsApp] Failed to notify owner:", err)
  }

  return { customerSent, ownerSent }
}

/**
 * Send cancellation notification.
 */
export async function sendCancellationNotifications(
  data: BookingNotificationData
): Promise<void> {
  const customerWA = `whatsapp:${data.customerPhone}`

  try {
    await sendWhatsApp(customerWA, customerCancellationMessage(data))
  } catch (err) {
    console.error("[WhatsApp] Failed to send cancellation to customer:", err)
  }

  try {
    const ownerMsg = `❌ *Booking Cancelled*\nClient: ${data.customerName}\nDate: ${data.sessionDate} ${data.startTime}–${data.endTime}\nRef: ${data.bookingId.slice(0, 8).toUpperCase()}`
    await sendWhatsApp(OWNER_NUMBER, ownerMsg)
  } catch (err) {
    console.error("[WhatsApp] Failed to send cancellation to owner:", err)
  }
}
