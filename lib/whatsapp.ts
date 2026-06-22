// lib/whatsapp.ts
// WhatsApp notifications via Meta Cloud Graph API for S&G Entertainment
// Sends booking confirmations to both customer and studio owner

const formatGHS = (amount: number) =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount)

const META_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN!
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID!
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

// Helper to clean phone number for Meta WhatsApp Cloud API (expects raw digits, e.g., 233XXXXXXXXX)
function cleanPhoneForMeta(phone: string): string {
  let cleaned = phone.trim()
  if (cleaned.startsWith("whatsapp:")) {
    cleaned = cleaned.substring(9)
  }
  // Strip non-digits
  cleaned = cleaned.replace(/\D/g, "")
  return cleaned
}

// ── Meta WhatsApp Cloud API call ───────────────────────────────────────────────
async function sendWhatsApp(to: string, body: string): Promise<void> {
  const cleanTo = cleanPhoneForMeta(to)

  if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.warn(`[Meta WhatsApp Simulation] To: ${cleanTo} | Body:\n${body}`)
    return // Skip actual API call if keys are not set
  }

  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanTo,
    type: "text",
    text: {
      preview_url: false,
      body: body,
    },
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const errMsg = err?.error?.message ?? `HTTP Status ${res.status}`
    throw new Error(`Meta WhatsApp API error: ${errMsg}`)
  }

  const data = await res.json()
  console.log(`[Meta WhatsApp] Message sent to ${cleanTo}. Message ID: ${data.messages?.[0]?.id ?? "unknown"}`)
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
🔖 *Reference:* ${d.bookingId}

Custom Booking ID: ${d.paystackReference}
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
💳 *Hubtel Ref:* ${d.paystackReference}
🆔 *Booking ID:* ${d.bookingId}

${d.notes ? `📝 *Client notes:* ${d.notes}` : ""}
`.trim()
}

function customerCancellationMessage(d: BookingNotificationData): string {
  return `
⚠️ *Booking Cancelled — S&G Entertainment*

Hi ${d.customerName}, your booking has been cancelled.

📅 *Date:* ${d.sessionDate}
⏰ *Time:* ${d.startTime} – ${d.endTime}
🔖 *Reference:* ${d.bookingId}

Your refund of *${formatGHS(d.amountGHS)}* will be processed within 3–5 business days.

For questions, call us at ${process.env.NEXT_PUBLIC_STUDIO_PHONE}.

S&G Entertainment Team
`.trim()
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function sendBookingConfirmationNotifications(
  data: BookingNotificationData
): Promise<{ customerSent: boolean; ownerSent: boolean }> {
  let customerSent = false
  let ownerSent = false

  try {
    await sendWhatsApp(data.customerPhone, customerConfirmationMessage(data))
    customerSent = true
  } catch (err) {
    console.error("[Meta WhatsApp] Failed to notify customer:", err)
  }

  try {
    await sendWhatsApp(OWNER_NUMBER, ownerNewBookingMessage(data))
    ownerSent = true
  } catch (err) {
    console.error("[Meta WhatsApp] Failed to notify owner:", err)
  }

  return { customerSent, ownerSent }
}

export async function sendCancellationNotifications(
  data: BookingNotificationData
): Promise<void> {
  try {
    await sendWhatsApp(data.customerPhone, customerCancellationMessage(data))
  } catch (err) {
    console.error("[Meta WhatsApp] Failed to send cancellation to customer:", err)
  }

  try {
    const ownerMsg = `❌ *Booking Cancelled*\nClient: ${data.customerName}\nDate: ${data.sessionDate} ${data.startTime}–${data.endTime}\nRef: ${data.bookingId}`
    await sendWhatsApp(OWNER_NUMBER, ownerMsg)
  } catch (err) {
    console.error("[Meta WhatsApp] Failed to send cancellation to owner:", err)
  }
}
