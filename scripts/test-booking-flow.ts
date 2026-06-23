// scripts/test-booking-flow.ts
// Automated end-to-end test for the full booking lifecycle.
// Includes customer-side HTTP verification after each admin action to confirm
// the live read path (GET /api/bookings/:code) reflects database changes.

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { createServiceClient } from "../lib/supabase"
import { createServerClient } from "@supabase/ssr"

// ── Config ─────────────────────────────────────────────────────────────────────
const TEST_CUSTOMER_NAME  = "TEST_Automated Test User"
const TEST_CUSTOMER_EMAIL = "test-automated@example.com"
const TEST_CUSTOMER_PHONE = "+233200000000"
const TEST_ADMIN_MESSAGE  = "Confirmed — see you Thursday at 2PM"

// The base URL the customer-facing API is served from.
// Must match where `next dev` (or `next start`) is running.
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

// How long to wait (ms) after a write before polling the customer API.
// Should comfortably exceed the tracking-page poll interval (3 s).
const CUSTOMER_READ_DELAY_MS = 4_000

// ── Color helpers ──────────────────────────────────────────────────────────────
const colors = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function assert(condition: boolean, testName: string, actual: any, expected: any): boolean {
  if (condition) {
    log(`  ✅ PASS: ${testName}`, 'green')
    return true
  } else {
    log(`  ❌ FAIL: ${testName}`, 'red')
    log(`     Expected : ${JSON.stringify(expected)}`, 'red')
    log(`     Actual   : ${JSON.stringify(actual)}`, 'red')
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "SG-"
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function formatElapsed(startedAt: number): string {
  return `${((Date.now() - startedAt) / 1000).toFixed(2)}s`
}

// ── Customer-facing HTTP fetch ─────────────────────────────────────────────────
// Mirrors exactly what the tracking / success page calls.
// Returns the parsed JSON body plus the HTTP status code.
async function fetchCustomerBooking(bookingCode: string): Promise<{
  status: number
  body: any
  raw: string
}> {
  const url = `${APP_BASE_URL}/api/bookings/${bookingCode}`
  log(`     → GET ${url}`, 'cyan')

  const res = await fetch(url, { cache: 'no-store' })
  const raw = await res.text()
  let body: any = null
  try { body = JSON.parse(raw) } catch (_) { /* leave body null */ }

  return { status: res.status, body, raw }
}

async function createAdminApiSession(supabase: ReturnType<typeof createServiceClient>): Promise<{
  cookieHeader: string
  userId: string
  email: string
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for admin API tests")
  }

  const email = `test-admin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
  const password = `Test-${crypto.randomUUID()}!aA1`

  const { data: createdUser, error: createUserError } = await (supabase as any).auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createUserError || !createdUser?.user?.id) {
    throw new Error(`Could not create temporary admin auth user: ${JSON.stringify(createUserError)}`)
  }

  const cookieJar: { name: string; value: string }[] = []
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const index = cookieJar.findIndex((cookie) => cookie.name === name)
          if (options?.maxAge === 0 || value === "") {
            if (index >= 0) cookieJar.splice(index, 1)
            return
          }
          if (index >= 0) cookieJar[index] = { name, value }
          else cookieJar.push({ name, value })
        })
      },
    },
  })

  const { error: signInError } = await authClient.auth.signInWithPassword({ email, password })
  if (signInError) {
    await (supabase as any).auth.admin.deleteUser(createdUser.user.id)
    throw new Error(`Could not sign in temporary admin auth user: ${signInError.message}`)
  }

  const cookieHeader = cookieJar.map(({ name, value }) => `${name}=${value}`).join("; ")
  if (!cookieHeader) {
    await (supabase as any).auth.admin.deleteUser(createdUser.user.id)
    throw new Error("Temporary admin auth sign-in did not produce SSR cookies")
  }

  return { cookieHeader, userId: createdUser.user.id, email }
}

async function fetchAdminApi(
  cookieHeader: string,
  pathName: string,
  init: RequestInit
): Promise<{ status: number; body: any; raw: string }> {
  const url = `${APP_BASE_URL}${pathName}`
  log(`     → ${init.method ?? "GET"} ${url}`, 'cyan')
  const res = await fetch(url, {
    ...init,
    headers: {
      Cookie: cookieHeader,
      ...(init.headers ?? {}),
    },
  })
  const raw = await res.text()
  let body: any = null
  try { body = JSON.parse(raw) } catch (_) { /* leave body null */ }
  return { status: res.status, body, raw }
}

// ── Main test ──────────────────────────────────────────────────────────────────
let allPassed = true

async function testBookingFlow() {
  log('\n=== Starting Automated Booking Flow Test ===\n', 'blue')
  log(`Customer API base: ${APP_BASE_URL}\n`, 'cyan')

  const supabase = createServiceClient()
  let bookingId:   string | null = null
  let bookingCode: string | null = null
  let tempAdminUserId: string | null = null

  try {
    log('STEP 0: Creating temporary admin API session...', 'yellow')
    const adminSession = await createAdminApiSession(supabase)
    tempAdminUserId = adminSession.userId
    log(`   Temporary admin auth user: ${adminSession.email}`, 'blue')

    // ── STEP 1: Create booking ────────────────────────────────────────────────
    log('STEP 1: Creating booking as customer...', 'yellow')

    const testDate = new Date()
    testDate.setDate(testDate.getDate() + 2)
    bookingCode = generateBookingCode()

    const { data: booking, error: createError } = await (supabase as any)
      .from('bookings')
      .insert({
        booking_code:         bookingCode,
        customer_name:        TEST_CUSTOMER_NAME,
        customer_email:       TEST_CUSTOMER_EMAIL,
        customer_phone:       TEST_CUSTOMER_PHONE,
        session_date:         testDate.toISOString(),
        start_time:           '10:00',
        end_time:             '12:00',
        duration_hours:       2,
        studio:               'Main Studio',
        equipment:            [],
        notes:                null,
        amount_ghs:           20000, // 200.00 GHS in pesewas
        paystack_reference:   bookingCode,
        status:               'AWAITING_PAYMENT',
        status_received:      true,
        status_received_at:   new Date().toISOString(),
      })
      .select()
      .single()

    if (createError || !booking) {
      log(`❌ FAIL: Could not create booking`, 'red')
      log(`   Error: ${JSON.stringify(createError)}`, 'red')
      process.exit(1)
    }

    bookingId   = booking.id
    bookingCode = booking.booking_code

    log(`   Created booking  ID: ${bookingId}`, 'blue')
    log(`   Booking code       : ${bookingCode}`, 'blue')

    const bookingCodeFormat = /^SG-[A-Z0-9]{8}$/
    const codeOk = assert(
      bookingCode ? bookingCodeFormat.test(bookingCode) : false,
      'Booking code format (SG-XXXXXXXX)',
      bookingCode,
      'SG-XXXXXXXX format'
    )
    if (!codeOk) { allPassed = false; process.exit(1) }

    // ── STEP 2: Simulate payment ──────────────────────────────────────────────
    log('\nSTEP 2: Simulating payment...', 'yellow')

    const { error: paymentError } = await (supabase as any)
      .from('bookings')
      .update({
        status_payment:    true,
        status_payment_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (paymentError) {
      log(`❌ FAIL: Could not simulate payment`, 'red')
      log(`   Error: ${JSON.stringify(paymentError)}`, 'red')
      process.exit(1)
    }

    const { data: afterPayment } = await (supabase as any)
      .from('bookings').select('*').eq('id', bookingId).single()

    if (!assert(afterPayment?.status_payment === true, 'DB: Payment status is true', afterPayment?.status_payment, true))
      { allPassed = false; process.exit(1) }
    if (!assert(afterPayment?.status_payment_at !== null, 'DB: Payment timestamp set', afterPayment?.status_payment_at, 'non-null'))
      { allPassed = false; process.exit(1) }

    log('   Payment simulated successfully', 'green')

    // ── STEP 3: Admin marks Reviewed ──────────────────────────────────────────
    log('\nSTEP 3: Admin API marks booking as Reviewed...', 'yellow')

    const reviewActionStart = Date.now()
    const reviewApiResp = await fetchAdminApi(
      adminSession.cookieHeader,
      `/api/admin/bookings/${bookingId}/review`,
      { method: "POST" }
    )

    if (reviewApiResp.status !== 200) {
      log(`❌ FAIL: Admin API could not mark as reviewed`, 'red')
      log(`   Expected HTTP 200, got ${reviewApiResp.status}`, 'red')
      log(`   Raw response: ${reviewApiResp.raw}`, 'red')
      allPassed = false
    } else {
      assert(reviewApiResp.body?.booking?.status_reviewed === true, "Admin API response: Reviewed is true", reviewApiResp.body, { booking: { status_reviewed: true } })
    }

    // DB-level assertions (sanity check the write itself)
    const { data: afterReviewDb } = await (supabase as any)
      .from('bookings').select('*').eq('id', bookingId).single()

    if (!assert(afterReviewDb?.status_reviewed === true, 'DB: status_reviewed is true after admin write', afterReviewDb?.status_reviewed, true))
      { allPassed = false }

    log(`   Waiting ${CUSTOMER_READ_DELAY_MS / 1000}s for customer poll cycle...`, 'cyan')
    await sleep(CUSTOMER_READ_DELAY_MS)

    // ── Customer-side check: Reviewed ─────────────────────────────────────────
    log('   Checking customer-facing API for Reviewed status...', 'cyan')
    const reviewedResp = await fetchCustomerBooking(bookingCode!)

    if (reviewedResp.status !== 200) {
      log(`  ❌ FAIL: Customer-side reflects Reviewed`, 'red')
      log(`     Expected HTTP 200, got ${reviewedResp.status}`, 'red')
      log(`     Raw response: ${reviewedResp.raw}`, 'red')
      allPassed = false
    } else {
      const customerReviewed = reviewedResp.body?.statusReviewed
      const ok = assert(
        customerReviewed === true,
        `Customer-side reflects Reviewed after ${formatElapsed(reviewActionStart)}`,
        { statusReviewed: customerReviewed, fullResponse: reviewedResp.body },
        { statusReviewed: true }
      )
      if (!ok) allPassed = false
    }

    // ── STEP 4: Admin writes custom message ───────────────────────────────────
    log('\nSTEP 4: Admin API writes custom customer message...', 'yellow')

    const messageActionStart = Date.now()
    const messageApiResp = await fetchAdminApi(
      adminSession.cookieHeader,
      `/api/admin/bookings/${bookingId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: afterReviewDb?.status,
          customerMessage: TEST_ADMIN_MESSAGE,
        }),
      }
    )

    if (messageApiResp.status !== 200) {
      log(`❌ FAIL: Admin API could not save customer message`, 'red')
      log(`   Expected HTTP 200, got ${messageApiResp.status}`, 'red')
      log(`   Raw response: ${messageApiResp.raw}`, 'red')
      allPassed = false
    }

    log(`   Waiting ${CUSTOMER_READ_DELAY_MS / 1000}s for customer poll cycle...`, 'cyan')
    await sleep(CUSTOMER_READ_DELAY_MS)

    // ── Customer-side check: Message ──────────────────────────────────────────
    log('   Checking customer-facing API for admin message...', 'cyan')
    const messageResp = await fetchCustomerBooking(bookingCode!)

    if (messageResp.status !== 200) {
      log(`  ❌ FAIL: Customer-side reflects message`, 'red')
      log(`     Expected HTTP 200, got ${messageResp.status}`, 'red')
      log(`     Raw response: ${messageResp.raw}`, 'red')
      allPassed = false
    } else {
      const customerMessage = messageResp.body?.latestMessage?.text
      const ok = assert(
        customerMessage === TEST_ADMIN_MESSAGE,
        `Customer-side reflects message after ${formatElapsed(messageActionStart)}`,
        { latestMessage: messageResp.body?.latestMessage, fullResponse: messageResp.body },
        { latestMessage: { text: TEST_ADMIN_MESSAGE } }
      )
      if (!ok) allPassed = false
    }

    // ── STEP 5: Admin marks Confirmed ─────────────────────────────────────────
    log('\nSTEP 5: Admin API marks booking as Confirmed...', 'yellow')

    const confirmActionStart = Date.now()
    const confirmApiResp = await fetchAdminApi(
      adminSession.cookieHeader,
      `/api/admin/bookings/${bookingId}/confirm`,
      { method: "POST" }
    )

    if (confirmApiResp.status !== 200) {
      log(`❌ FAIL: Admin API could not mark as confirmed`, 'red')
      log(`   Expected HTTP 200, got ${confirmApiResp.status}`, 'red')
      log(`   Raw response: ${confirmApiResp.raw}`, 'red')
      allPassed = false
    } else {
      assert(confirmApiResp.body?.booking?.status_confirmed === true, "Admin API response: Confirmed is true", confirmApiResp.body, { booking: { status_confirmed: true } })
    }

    // DB-level assertions
    const { data: afterConfirmDb } = await (supabase as any)
      .from('bookings').select('*').eq('id', bookingId).single()

    if (!assert(afterConfirmDb?.status_confirmed === true, 'DB: status_confirmed is true after admin write', afterConfirmDb?.status_confirmed, true))
      { allPassed = false }
    if (!assert(afterConfirmDb?.status === 'CONFIRMED', 'DB: status is CONFIRMED', afterConfirmDb?.status, 'CONFIRMED'))
      { allPassed = false }

    log(`   Waiting ${CUSTOMER_READ_DELAY_MS / 1000}s for customer poll cycle...`, 'cyan')
    await sleep(CUSTOMER_READ_DELAY_MS)

    // ── Customer-side check: Confirmed ────────────────────────────────────────
    log('   Checking customer-facing API for Confirmed status...', 'cyan')
    const confirmedResp = await fetchCustomerBooking(bookingCode!)

    if (confirmedResp.status !== 200) {
      log(`  ❌ FAIL: Customer-side reflects Confirmed`, 'red')
      log(`     Expected HTTP 200, got ${confirmedResp.status}`, 'red')
      log(`     Raw response: ${confirmedResp.raw}`, 'red')
      allPassed = false
    } else {
      const customerConfirmed = confirmedResp.body?.statusConfirmed
      const ok = assert(
        customerConfirmed === true,
        `Customer-side reflects Confirmed after ${formatElapsed(confirmActionStart)}`,
        { statusConfirmed: customerConfirmed, fullResponse: confirmedResp.body },
        { statusConfirmed: true }
      )
      if (!ok) allPassed = false
    }

    // ── STEP 6: Cascade integrity check (via customer API) ────────────────────
    log('\nSTEP 6: Customer API cascade integrity — all stages still true...', 'yellow')

    const { body: finalCustomer } = await fetchCustomerBooking(bookingCode!)

    if (!assert(finalCustomer?.statusReceived  === true,  'Customer API: statusReceived still true',  finalCustomer?.statusReceived,  true)) allPassed = false
    if (!assert(finalCustomer?.statusPayment   === true,  'Customer API: statusPayment still true',   finalCustomer?.statusPayment,   true)) allPassed = false
    if (!assert(finalCustomer?.statusReviewed  === true,  'Customer API: statusReviewed still true',  finalCustomer?.statusReviewed,  true)) allPassed = false
    if (!assert(finalCustomer?.statusConfirmed === true,  'Customer API: statusConfirmed still true', finalCustomer?.statusConfirmed, true)) allPassed = false
    if (!assert(finalCustomer?.latestMessage?.text === TEST_ADMIN_MESSAGE, 'Customer API: latestMessage still visible', finalCustomer?.latestMessage?.text, TEST_ADMIN_MESSAGE)) allPassed = false

    // ── STEP 7: Cleanup ───────────────────────────────────────────────────────
    log('\nSTEP 7: Cleaning up test booking...', 'yellow')

    const { error: cleanupError } = await (supabase as any)
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (cleanupError) {
      log(`⚠️  WARNING: Could not delete test booking`, 'yellow')
      log(`   Error: ${JSON.stringify(cleanupError)}`, 'yellow')
      log(`   Booking ID: ${bookingId}`, 'yellow')
    } else {
      log('   Test booking deleted successfully', 'green')
    }

    if (tempAdminUserId) {
      const { error: deleteUserError } = await (supabase as any).auth.admin.deleteUser(tempAdminUserId)
      if (deleteUserError) {
        log(`⚠️  WARNING: Could not delete temporary admin auth user`, 'yellow')
        log(`   Error: ${JSON.stringify(deleteUserError)}`, 'yellow')
      } else {
        log('   Temporary admin auth user deleted successfully', 'green')
      }
      tempAdminUserId = null
    }

    // ── Final Summary ─────────────────────────────────────────────────────────
    log('\n═══════════════════════════════════════════', 'blue')
    log('              TEST SUMMARY', 'blue')
    log('═══════════════════════════════════════════', 'blue')

    if (allPassed) {
      log('✅ ALL TESTS PASSED', 'green')
      log('', 'reset')
      log('  DB writes verified:', 'green')
      log('    ✅  Booking code format correct', 'green')
      log('    ✅  Payment simulation works', 'green')
      log('    ✅  Reviewed write works', 'green')
      log('    ✅  Admin message write works', 'green')
      log('    ✅  Confirmed write works', 'green')
      log('', 'reset')
      log('  Customer-side HTTP API verified:', 'green')
      log('    ✅  Customer-side reflects Reviewed', 'green')
      log('    ✅  Customer-side reflects message', 'green')
      log('    ✅  Customer-side reflects Confirmed', 'green')
      log('    ✅  All stages cascade correctly on customer API', 'green')
      process.exit(0)
    } else {
      log('❌ SOME TESTS FAILED', 'red')
      log('', 'reset')
      log('The test above shows the exact API response received vs expected.', 'red')
      log('If the DB asserts pass but customer-side asserts fail, the bug is in the', 'red')
      log('customer-facing read path (GET /api/bookings/:code) — data was written to', 'red')
      log('the database but the API is not returning it.', 'red')
      process.exit(1)
    }

  } catch (error: any) {
    log(`\n❌ UNEXPECTED ERROR: ${error?.message ?? JSON.stringify(error)}`, 'red')
    if (bookingId) log(`   Booking ID: ${bookingId}`, 'yellow')
    if (bookingCode) log(`   Booking code: ${bookingCode}`, 'yellow')

    // Attempt cleanup even on unexpected failure
    if (bookingId) {
      try {
        await (supabase as any).from('bookings').delete().eq('id', bookingId)
        log('   Test booking cleaned up after error.', 'yellow')
      } catch (_) {}
    }
    if (tempAdminUserId) {
      try {
        await (supabase as any).auth.admin.deleteUser(tempAdminUserId)
        log('   Temporary admin auth user cleaned up after error.', 'yellow')
      } catch (_) {}
    }
    process.exit(1)
  }
}

testBookingFlow()
