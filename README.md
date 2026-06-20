# S&G Entertainment — Studio Booking System

Professional recording studio booking system for **S&G Entertainment, Taifa, Accra, Ghana**.

Built with **Next.js 14**, **Anolla** (booking engine), **Paystack** (GHS payments + MoMo), and **Twilio WhatsApp** notifications.

---

## How It Works

```
Customer selects date/time
       ↓
Availability checked via Anolla API
       ↓
Pending booking created in Anolla + DB
       ↓
Redirect to Paystack (MoMo / Card / Bank)
       ↓
Paystack webhook → verify payment
       ↓
Confirm booking in Anolla
       ↓
WhatsApp sent to customer + studio owner
       ↓
Success page shown
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| Database | PostgreSQL via Prisma ORM |
| Booking Engine | Anolla REST API + Widget embed fallback |
| Payments | Paystack (GHS · MoMo · Cards · USSD) |
| Notifications | Twilio WhatsApp Business API |
| Deployment | Vercel (frontend) + Railway (DB) |

---

## Prerequisites

- Node.js 18+
- PostgreSQL database (Railway, Supabase, or Render)
- [Anolla provider account](https://anolla.com) — get API key + widget ID from dashboard
- [Paystack account](https://paystack.com) — Ghana business account
- [Twilio account](https://twilio.com) — WhatsApp-enabled number

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/sg-entertainment-booking
cd sg-entertainment-booking
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local` — see the comments in `.env.example` for guidance.

### 3. Set up the database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to your PostgreSQL database
```

### 4. Run in development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Getting Your API Keys

### Anolla

1. Sign up at [anolla.com](https://anolla.com) and create a **provider account**
2. Go to **Settings → Integrations → API** to get your API key
3. In your provider dashboard, create a **resource** for "Main Studio" and note the resource ID
4. Go to **Embed Widget** to get your widget ID (used as fallback)
5. Set up a webhook at: `https://your-domain.com/api/anolla/webhook`

### Paystack

1. Sign up at [paystack.com](https://paystack.com) — use a Ghana business account for GHS + MoMo
2. Go to **Settings → API Keys & Webhooks**
3. Copy your **public key** (`pk_test_...`) and **secret key** (`sk_test_...`)
4. Add webhook URL: `https://your-domain.com/api/paystack/webhook`
5. Note the webhook secret hash shown in the dashboard

### Twilio WhatsApp

1. Sign up at [twilio.com](https://twilio.com)
2. Go to **Messaging → Try it out → Send a WhatsApp message** to test with the sandbox
3. For production: apply for a **WhatsApp Business** sender in the Twilio console
4. The sandbox sender number is `whatsapp:+14155238886`
5. Copy your **Account SID** and **Auth Token** from the console dashboard

---

## Webhook Setup

### Paystack Webhook

**URL:** `POST https://your-domain.com/api/paystack/webhook`

Events handled:
- `charge.success` → Confirms booking in Anolla + sends WhatsApp notifications
- `charge.failed` → Marks booking as failed + releases Anolla slot
- `refund.processed` → Cancels booking + notifies customer

**Important:** The webhook uses HMAC-SHA512 signature verification. Never skip this check.

### Testing webhooks locally

Use [ngrok](https://ngrok.com) or the Paystack CLI:

```bash
# Install ngrok
npx ngrok http 3000

# Set the ngrok URL as your Paystack webhook URL in the dashboard
# e.g. https://abc123.ngrok.io/api/paystack/webhook
```

---

## Deployment

### Vercel (recommended for Next.js)

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

### Railway (PostgreSQL)

1. Create a new Railway project
2. Add a PostgreSQL service
3. Copy the `DATABASE_URL` into your Vercel env vars
4. Run `npm run db:migrate` against your production DB

### Full deployment checklist

- [ ] Set `NODE_ENV=production`
- [ ] Switch Paystack keys to live mode (`pk_live_...`, `sk_live_...`)
- [ ] Approve WhatsApp sender in Twilio (production number)
- [ ] Set correct `NEXT_PUBLIC_APP_URL` (your Vercel domain)
- [ ] Add Paystack webhook URL in dashboard
- [ ] Add Anolla webhook URL in dashboard
- [ ] Test a full booking flow end-to-end with live keys

---

## API Reference

### `POST /api/bookings/create`

Create a pending booking and initialize Paystack payment.

**Request body:**
```json
{
  "customerName": "Kofi Mensah",
  "customerEmail": "kofi@example.com",
  "customerPhone": "0244123456",
  "sessionDate": "2024-08-15",
  "startTime": "10:00",
  "durationHours": 4,
  "studio": "Main Studio",
  "equipment": ["condenser_mic", "mixing_engineer"],
  "notes": "Afrobeats EP recording, 2 artists"
}
```

**Response:**
```json
{
  "bookingId": "uuid",
  "paystackReference": "SG-ABC12345-1723456789",
  "authorizationUrl": "https://checkout.paystack.com/...",
  "accessCode": "...",
  "amount": 110000,
  "currency": "GHS"
}
```

### `GET /api/anolla/availability?date=YYYY-MM-DD&duration=120`

Get available time slots for a date.

### `GET /api/bookings/:id`

Get booking details by ID.

### `POST /api/paystack/webhook`

Paystack webhook receiver (signature-verified).

---

## Project Structure

```
sg-entertainment-booking/
├── app/
│   ├── page.tsx                    # Homepage
│   ├── booking/page.tsx            # Booking flow page
│   ├── success/page.tsx            # Post-payment success page
│   └── api/
│       ├── bookings/
│       │   ├── create/route.ts     # Create booking + init Paystack
│       │   └── [id]/route.ts       # Get booking details
│       ├── paystack/
│       │   └── webhook/route.ts    # ← Core: payment → confirmation flow
│       └── anolla/
│           └── availability/route.ts
├── components/
│   ├── BookingFlow.tsx             # Multi-step booking wizard
│   ├── StepIndicator.tsx
│   ├── StepDateTime.tsx            # Calendar + time slot picker
│   ├── StepCustomer.tsx            # Contact details form
│   ├── StepEquipment.tsx           # Equipment selection
│   ├── StepReview.tsx              # Final review before payment
│   └── SuccessContent.tsx          # Post-payment confirmation
├── lib/
│   ├── anolla.ts                   # Anolla REST API client
│   ├── paystack.ts                 # Paystack API + webhook verification
│   ├── whatsapp.ts                 # Twilio WhatsApp notifications
│   ├── booking.ts                  # Pricing, date utilities, validation
│   └── prisma.ts                   # Prisma client singleton
├── types/
│   └── index.ts                    # TypeScript types + constants
├── prisma/
│   └── schema.prisma               # Database schema
├── .env.example                    # All required environment variables
└── README.md
```

---

## Payment Flow Detail

```
1. Customer clicks "Pay GHS X →"
2. POST /api/bookings/create
   ├── Create Booking record (status: AWAITING_PAYMENT)
   ├── Create PENDING booking in Anolla (holds slot)
   └── Initialize Paystack transaction
3. Customer redirected to Paystack checkout
   ├── Can pay via: MTN MoMo, Vodafone Cash, AirtelTigo, Visa, Mastercard, USSD
4. Paystack fires webhook: POST /api/paystack/webhook
   ├── Verify HMAC-SHA512 signature
   ├── Check idempotency (prevent duplicate processing)
   ├── Re-verify transaction via Paystack API
   ├── Update Booking status → CONFIRMED
   ├── Confirm booking in Anolla (status: confirmed)
   └── Send WhatsApp to customer + studio owner
5. Customer redirected to /success?booking_id=...&reference=...
   └── Polls /api/bookings/:id until status = CONFIRMED
```

---

## Customization

### Pricing

Edit `NEXT_PUBLIC_HOURLY_RATE` in `.env.local` and the `EQUIPMENT_OPTIONS` array in `types/index.ts`.

### Studio hours / time slots

Edit `TIME_SLOTS` and `STUDIO_HOURS` in `types/index.ts`.

### WhatsApp message templates

Edit the message functions in `lib/whatsapp.ts`.

### Anolla widget fallback

If the Anolla REST API is unavailable, embed the widget using:
```tsx
import { getWidgetEmbedUrl } from "@/lib/anolla"
<iframe src={getWidgetEmbedUrl()} width="100%" height="600" />
```

---

## Support

For Anolla API questions: [anolla.com/docs](https://anolla.com/docs)  
For Paystack Ghana: [paystack.com/gh](https://paystack.com/gh)  
For Twilio WhatsApp: [twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
