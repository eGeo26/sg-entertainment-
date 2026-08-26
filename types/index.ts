// types/index.ts

export interface BookingFormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  sessionDate: string       // "YYYY-MM-DD"
  startTime: string         // "HH:mm"
  durationHours: number     // can be fractional e.g. 2.5
  studio: string
  equipment: string[]
  notes?: string
  selectedPackage?: string
}

export const REMOTE_PACKAGES = [
  { id: "payment_test_temporary",  name: "Payment Test — Temporary (GHS 2.00)", priceGHS: 2 },
  { id: "full_stem_mix_mastering", name: "Full Stem Mix & Mastering", priceGHS: 2000 },
  { id: "waves_mix_mastering",     name: "Waves Mix & Mastering",     priceGHS: 1000 },
  { id: "mp3_mix_mastering",       name: "MP3 Mix & Mastering",       priceGHS: 700 },
  { id: "full_production",         name: "Full Production",           priceGHS: 5000 },
] as const


export interface BookingSlot {
  date: string              // "YYYY-MM-DD"
  startTime: string         // "HH:mm"
  endTime: string           // "HH:mm"
  available: boolean
}

export interface AvailabilityResponse {
  date: string
  slots: BookingSlot[]
  bookedRanges: { start: string; end: string }[]
}

export interface CreateBookingRequest {
  formData: BookingFormData
  amountGHS: number         // total in GHS (not pesewas)
}

export interface CreateBookingResponse {
  bookingId: string
  paystackReference: string
  paystackAuthorizationUrl?: string
  accessCode?: string
  amount: number            // in pesewas
  currency: string
}

export interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface AnollaBookingPayload {
  resourceId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  startDateTime: string     // ISO 8601
  endDateTime: string       // ISO 8601
  notes?: string
  metadata?: Record<string, string>
}

export interface AnollaAvailabilitySlot {
  start: string             // ISO 8601
  end: string               // ISO 8601
  available: boolean
}

export interface WhatsAppMessage {
  to: string                // whatsapp:+233XXXXXXXXX
  body: string
}

export interface StudioConfig {
  name: string
  location: string
  phone: string
  email: string
  sessionRateGHS: number    // GHS 300 base for minimum session
  minMinutes: number        // 150 (2h 30m)
  maxHours: number
  bookingLeadHours: number
}

// Equipment options matching flyer services
export const EQUIPMENT_OPTIONS = [
  { id: "condenser_mic", label: "Condenser Microphone", priceGHS: 50 },
  { id: "dynamic_mic", label: "Dynamic Microphone", priceGHS: 30 },
  { id: "headphones", label: "Studio Headphones (per pair)", priceGHS: 20 },
  { id: "guitar_amp", label: "Guitar Amplifier", priceGHS: 80 },
  { id: "keyboard", label: "MIDI Keyboard", priceGHS: 60 },
  { id: "mixing_engineer", label: "In-house Mixing Engineer", priceGHS: 150 },
] as const

// Studio operates 24 hours. These constants are kept for reference only;
// the availability API enforces no hour gate — all 24 TIME_SLOTS are bookable.
export const STUDIO_HOURS = {
  open: "00:00",
  close: "24:00",
} as const

// Time slots: 00:00 to 23:00 in 1-hour steps (24 hours support)
export const TIME_SLOTS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
] as const
