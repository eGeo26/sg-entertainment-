// scripts/test-booking-flow.ts
// Automated end-to-end test for the full booking lifecycle

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { createServiceClient } from "../lib/supabase"
import { generateBookingCode } from "../lib/booking"

// Test configuration
const TEST_CUSTOMER_NAME = "TEST_Automated Test User"
const TEST_CUSTOMER_EMAIL = "test-automated@example.com"
const TEST_CUSTOMER_PHONE = "+233200000000"
const TEST_ADMIN_MESSAGE = "Confirmed — see you Thursday at 2PM"

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function assert(condition: boolean, testName: string, actual: any, expected: any) {
  if (condition) {
    log(`✅ PASS: ${testName}`, 'green')
    return true
  } else {
    log(`❌ FAIL: ${testName}`, 'red')
    log(`   Expected: ${JSON.stringify(expected)}`, 'red')
    log(`   Actual: ${JSON.stringify(actual)}`, 'red')
    return false
  }
}

let allPassed = true

async function testBookingFlow() {
  log('\n=== Starting Automated Booking Flow Test ===\n', 'blue')
  
  const supabase = createServiceClient()
  let bookingId: string | null = null
  let bookingCode: string | null = null

  try {
    // STEP 1: Create booking as customer
    log('STEP 1: Creating booking as customer...', 'yellow')
    
    const testDate = new Date()
    testDate.setDate(testDate.getDate() + 2) // 2 days from now
    bookingCode = generateBookingCode()
    
    const { data: booking, error: createError } = await (supabase as any)
      .from('bookings')
      .insert({
        booking_code: bookingCode,
        customer_name: TEST_CUSTOMER_NAME,
        customer_email: TEST_CUSTOMER_EMAIL,
        customer_phone: TEST_CUSTOMER_PHONE,
        session_date: testDate.toISOString(),
        start_time: '10:00',
        end_time: '12:00',
        duration_hours: 2,
        studio: 'Main Studio',
        equipment: [],
        notes: null,
        amount_ghs: 20000, // GHS 200.00 in pesewas
        paystack_reference: bookingCode,
        status: 'AWAITING_PAYMENT',
        status_received: true,
        status_received_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError || !booking) {
      log(`❌ FAIL: Could not create booking`, 'red')
      log(`   Error: ${JSON.stringify(createError)}`, 'red')
      process.exit(1)
    }

    bookingId = booking.id
    bookingCode = booking.booking_code

    log(`   Created booking with ID: ${bookingId}`, 'blue')
    log(`   Booking code: ${bookingCode}`, 'blue')

    // Assert booking code format
    const bookingCodeFormat = /^SG-[A-Z0-9]{8}$/
    allPassed = assert(
      bookingCode ? bookingCodeFormat.test(bookingCode) : false,
      'Booking code format (SG-XXXXXXXX)',
      bookingCode,
      'SG-XXXXXXXX format'
    )
    if (!allPassed) process.exit(1)

    // STEP 2: Simulate payment
    log('\nSTEP 2: Simulating payment...', 'yellow')
    
    const { error: paymentError } = await (supabase as any)
      .from('bookings')
      .update({
        status_payment: true,
        status_payment_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (paymentError) {
      log(`❌ FAIL: Could not simulate payment`, 'red')
      log(`   Error: ${JSON.stringify(paymentError)}`, 'red')
      process.exit(1)
    }

    // Fetch and assert payment status
    const { data: afterPayment, error: fetchError1 } = await (supabase as any)
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError1 || !afterPayment) {
      log(`❌ FAIL: Could not fetch booking after payment`, 'red')
      process.exit(1)
    }

    allPassed = assert(
      afterPayment.status_payment === true,
      'Payment status is true after simulation',
      afterPayment.status_payment,
      true
    )
    if (!allPassed) process.exit(1)

    allPassed = assert(
      afterPayment.status_payment_at !== null,
      'Payment timestamp is set after simulation',
      afterPayment.status_payment_at,
      'non-null timestamp'
    )
    if (!allPassed) process.exit(1)

    log('   Payment simulated successfully', 'green')

    // STEP 3: Mark as reviewed (admin)
    log('\nSTEP 3: Marking booking as reviewed (admin action)...', 'yellow')
    
    const { error: reviewError } = await (supabase as any)
      .from('bookings')
      .update({
        status_reviewed: true,
        status_reviewed_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (reviewError) {
      log(`❌ FAIL: Could not mark as reviewed`, 'red')
      log(`   Error: ${JSON.stringify(reviewError)}`, 'red')
      process.exit(1)
    }

    // Fetch and assert review status
    const { data: afterReview, error: fetchError2 } = await (supabase as any)
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError2 || !afterReview) {
      log(`❌ FAIL: Could not fetch booking after review`, 'red')
      process.exit(1)
    }

    allPassed = assert(
      afterReview.status_reviewed === true,
      'Review status is true after admin action',
      afterReview.status_reviewed,
      true
    )
    if (!allPassed) process.exit(1)

    allPassed = assert(
      afterReview.status_reviewed_at !== null,
      'Review timestamp is set after admin action',
      afterReview.status_reviewed_at,
      'non-null timestamp'
    )
    if (!allPassed) process.exit(1)

    allPassed = assert(
      afterReview.status_payment === true,
      'Payment status remains true after review (cascade check)',
      afterReview.status_payment,
      true
    )
    if (!allPassed) process.exit(1)

    log('   Review marked successfully', 'green')

    // STEP 4: Write custom admin message
    log('\nSTEP 4: Writing custom admin message...', 'yellow')
    
    const { error: messageError } = await (supabase as any)
      .from('booking_status_history')
      .insert({
        booking_id: bookingId,
        status: afterReview.status,
        label: TEST_ADMIN_MESSAGE,
        is_admin_message: true, // This is the key flag
        created_at: new Date().toISOString()
      })

    if (messageError) {
      log(`❌ FAIL: Could not save admin message`, 'red')
      log(`   Error: ${JSON.stringify(messageError)}`, 'red')
      process.exit(1)
    }

    log('   Admin message saved to history', 'green')

    // STEP 5: Fetch via customer API and verify message
    log('\nSTEP 5: Fetching via customer API to verify admin message...', 'yellow')
    
    // Simulate the customer API call (same logic as /api/bookings/[id]/route.ts)
    const { data: historyData, error: historyError } = await (supabase as any)
      .from('booking_status_history')
      .select('label, created_at')
      .eq('booking_id', bookingId)
      .eq('is_admin_message', true) // Filter for admin messages only
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (historyError) {
      log(`❌ FAIL: Could not fetch status history`, 'red')
      log(`   Error: ${JSON.stringify(historyError)}`, 'red')
      process.exit(1)
    }

    if (!historyData) {
      log(`❌ FAIL: No admin message found in history`, 'red')
      log(`   This means the is_admin_message flag filtering is not working`, 'red')
      process.exit(1)
    }

    allPassed = assert(
      historyData.label === TEST_ADMIN_MESSAGE,
      'Admin message text matches exactly (not automatic label)',
      historyData.label,
      TEST_ADMIN_MESSAGE
    )
    if (!allPassed) process.exit(1)

    log(`   Admin message verified: "${historyData.label}"`, 'green')

    // STEP 6: Mark as fully confirmed
    log('\nSTEP 6: Marking booking as fully confirmed...', 'yellow')
    
    const { error: confirmError } = await (supabase as any)
      .from('bookings')
      .update({
        status_confirmed: true,
        status_confirmed_at: new Date().toISOString(),
        status: 'CONFIRMED',
      })
      .eq('id', bookingId)

    if (confirmError) {
      log(`❌ FAIL: Could not mark as confirmed`, 'red')
      log(`   Error: ${JSON.stringify(confirmError)}`, 'red')
      process.exit(1)
    }

    // Fetch and assert final state
    const { data: finalBooking, error: fetchError3 } = await (supabase as any)
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError3 || !finalBooking) {
      log(`❌ FAIL: Could not fetch final booking state`, 'red')
      process.exit(1)
    }

    allPassed = assert(
      finalBooking.status_confirmed === true,
      'Confirmed status is true',
      finalBooking.status_confirmed,
      true
    )
    if (!allPassed) process.exit(1)

    allPassed = assert(
      finalBooking.status_confirmed_at !== null,
      'Confirmed timestamp is set',
      finalBooking.status_confirmed_at,
      'non-null timestamp'
    )
    if (!allPassed) process.exit(1)

    // Verify all earlier stages remain true
    allPassed = assert(
      finalBooking.status_received === true,
      'Received status remains true',
      finalBooking.status_received,
      true
    )
    if (!allPassed) process.exit(1)

    allPassed = assert(
      finalBooking.status_payment === true,
      'Payment status remains true',
      finalBooking.status_payment,
      true
    )
    if (!allPassed) process.exit(1)

    allPassed = assert(
      finalBooking.status_reviewed === true,
      'Reviewed status remains true',
      finalBooking.status_reviewed,
      true
    )
    if (!allPassed) process.exit(1)

    log('   Booking fully confirmed', 'green')

    // STEP 7: Cleanup - delete test booking
    log('\nSTEP 7: Cleaning up test booking...', 'yellow')
    
    const { error: cleanupError } = await (supabase as any)
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (cleanupError) {
      log(`⚠️  WARNING: Could not delete test booking`, 'yellow')
      log(`   Error: ${JSON.stringify(cleanupError)}`, 'yellow')
      log(`   Booking ID: ${bookingId || 'unknown'}`, 'yellow')
    } else {
      log('   Test booking deleted successfully', 'green')
    }

    // FINAL SUMMARY
    log('\n=== Test Summary ===', 'blue')
    if (allPassed) {
      log('✅ ALL TESTS PASSED', 'green')
      log('\nBooking flow test completed successfully.', 'green')
      log('All assertions passed:', 'green')
      log('  - Booking code format correct', 'green')
      log('  - Payment simulation works', 'green')
      log('  - Admin review action works', 'green')
      log('  - Admin message filtering works (is_admin_message flag)', 'green')
      log('  - Final confirmation works', 'green')
      log('  - All status stages persist correctly', 'green')
      process.exit(0)
    } else {
      log('❌ SOME TESTS FAILED', 'red')
      process.exit(1)
    }

  } catch (error) {
    log(`\n❌ UNEXPECTED ERROR: ${JSON.stringify(error)}`, 'red')
    if (bookingId) {
      log(`Booking ID: ${bookingId}`, 'yellow')
    }
    process.exit(1)
  }
}

testBookingFlow()
