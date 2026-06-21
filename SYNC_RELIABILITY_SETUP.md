# Sync Reliability Layer - Setup Instructions

This document explains how to set up and test the sync reliability layer that ensures the admin dashboard never misses booking events.

## What Was Implemented

### 1. Database Schema Changes
- **sync_events table**: Logs every booking change (created, status changed)
- **booking_status_history table**: Updated with label field for status history
- **Database trigger**: Automatically logs events on booking insert/update

### 2. Realtime Subscription
- **lib/realtimeBookings.ts**: Utility for subscribing to live booking events
- **Catch-up mechanism**: Fetches missed events on reconnect
- **Admin dashboard integration**: Auto-refreshes on new bookings

## Setup Steps

### Step 1: Run the SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/002_sync_reliability_layer.sql`
5. Run the query

This will create:
- The `sync_events` table
- The `booking_status_history.label` column
- The trigger function `fn_log_booking_sync_event`
- The trigger `trg_booking_sync_event`
- The RLS policies
- The `increment_delivery_attempts` function

### Step 2: Enable Realtime Replication

The sync_events table needs to be added to the realtime publication:

1. In Supabase dashboard, go to Database → Replication
2. Click on the "supabase_realtime" publication
3. Add the `sync_events` table to the publication
4. Save the changes

Alternatively, run this in the SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sync_events;
```

### Step 3: Verify the Setup

Check that everything is working:

1. Create a test booking (via the public booking form)
2. Check the `sync_events` table in Supabase - you should see a new row with `event_type: 'booking_created'`
3. Open the admin dashboard at `/admin`
4. You should see the new booking appear automatically with a toast notification

## Testing the Sync Reliability Layer

### Test 1: Realtime Updates
1. Open the admin dashboard in one browser tab
2. Create a new booking in another tab
3. The admin dashboard should automatically refresh and show the new booking
4. A toast notification should appear: "New booking: [CODE]"

### Test 2: Status Changes
1. Open the admin dashboard
2. Change a booking status (e.g., from AWAITING_PAYMENT to CONFIRMED)
3. The dashboard should refresh automatically
4. A toast notification should appear: "Booking [CODE] status changed to CONFIRMED"

### Test 3: Catch-up Mechanism
1. Close the admin dashboard
2. Create 2-3 new bookings
3. Reopen the admin dashboard
4. All missed bookings should appear automatically
5. Check the `sync_events` table - all events should be marked as `delivered: true`

### Test 4: Offline/Reconnect Scenario
1. Open the admin dashboard
2. Disconnect your internet (or use Chrome DevTools → Network → Offline)
3. Create a new booking (in another tab with internet)
4. Reconnect your internet
5. The admin dashboard should catch up and show the missed booking

## How It Works

### Event Flow
1. **Booking Created/Updated**: Database trigger fires automatically
2. **Event Logged**: Row inserted into `sync_events` table
3. **Realtime Push**: Supabase Realtime pushes event to connected admin clients
4. **Admin Receives**: Dashboard catches event, refreshes stats, shows toast
5. **Acknowledgment**: Event marked as `delivered: true`

### Catch-up Flow
1. **Admin Loads**: Queries for `delivered: false` events
2. **Process Events**: Each missed event is processed
3. **Mark Delivered**: Events marked as delivered
4. **Subscribe**: Realtime subscription activated for future events

### Why This Is Reliable
- **Database Trigger**: Events are logged in the same transaction as the booking update - can't be skipped
- **Persistent Storage**: Events stored in database, survive server crashes
- **Catch-up Mechanism**: Even if realtime fails, missed events are recovered on reconnect
- **Delivery Tracking**: Events marked as delivered to prevent reprocessing

## Troubleshooting

### Events not appearing in admin dashboard
- Check Supabase realtime is enabled for `sync_events` table
- Check browser console for errors
- Verify the trigger is firing by checking `sync_events` table directly

### Events not being logged
- Check the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trg_booking_sync_event'`
- Check the function exists: `SELECT * FROM pg_proc WHERE proname = 'fn_log_booking_sync_event'`
- Check RLS policies allow inserts to `sync_events`

### Realtime not working
- Verify realtime is enabled in Supabase project settings
- Check the `sync_events` table is in the `supabase_realtime` publication
- Check browser network tab for websocket connection

## Optional: Retry Logic for External Actions

The system includes support for retry logic (e.g., for WhatsApp notifications that fail):

```typescript
import { incrementDeliveryAttempts, getEventsNeedingAttention } from "@/lib/realtimeBookings"

// Increment attempt count
await incrementDeliveryAttempts(eventId)

// Get events that need attention (5+ failed attempts)
const needsAttention = await getEventsNeedingAttention(5)
```

This allows you to:
- Track failed external actions
- Implement retry logic with attempt limits
- Surface problematic events for manual review
