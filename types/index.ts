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
}

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

export const STUDIO_HOURS = {
  open: "08:00",
  close: "22:00",
} as const

// Time slots: 00:00 to 23:00 in 1-hour steps (24 hours support)
export const TIME_SLOTS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
] as const
