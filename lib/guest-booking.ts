const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BOOKING_CODE_PATTERN = /^[A-Za-z0-9_-]{1,100}$/

export type GuestContact = { email?: string | null; phone?: string | null }

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? ""
}

function normalizePhone(value?: string | null) {
  return value?.replace(/\D/g, "") ?? ""
}

export function getGuestContact(searchParams: URLSearchParams): GuestContact {
  return {
    email: searchParams.get("email"),
    phone: searchParams.get("phone"),
  }
}

export function guestContactMatches(
  booking: { customer_email?: string | null; customer_phone?: string | null },
  contact: GuestContact
) {
  const email = normalizeEmail(contact.email)
  const phone = normalizePhone(contact.phone)
  if (!email && !phone) return false

  return Boolean(
    (email && email === normalizeEmail(booking.customer_email)) ||
    (phone && phone === normalizePhone(booking.customer_phone))
  )
}

export async function findGuestBooking(
  supabase: any,
  identifier: string,
  select: string,
  contact: GuestContact
) {
  const value = identifier.trim()
  if (!UUID_PATTERN.test(value) && !BOOKING_CODE_PATTERN.test(value)) return null

  const column = UUID_PATTERN.test(value) ? "id" : "booking_code"
  const { data, error } = await supabase
    .from("bookings")
    .select(select)
    .eq(column, value)
    .maybeSingle()

  if (error || !data || !guestContactMatches(data, contact)) return null
  return data
}

export function isSafeBookingIdentifier(value: unknown): value is string {
  return typeof value === "string" && (UUID_PATTERN.test(value) || BOOKING_CODE_PATTERN.test(value))
}
