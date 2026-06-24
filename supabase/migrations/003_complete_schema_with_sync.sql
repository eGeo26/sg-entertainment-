-- Complete Schema with Sync Reliability Layer
-- This migration creates all base tables (if they don't exist) and adds the sync reliability layer
-- Safe to re-run - uses IF NOT EXISTS throughout

-- ============================================
-- BASE TABLES (from initial schema)
-- ============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  studio TEXT NOT NULL DEFAULT 'Main Studio',
  equipment TEXT[] DEFAULT '{}'::TEXT[],
  notes TEXT,
  
  amount_ghs INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  
  hubtel_reference TEXT UNIQUE,
  hubtel_status TEXT NOT NULL DEFAULT 'PENDING',
  
  status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
  
  customer_notified BOOLEAN NOT NULL DEFAULT FALSE,
  owner_notified BOOLEAN NOT NULL DEFAULT FALSE,
  
  processed_events TEXT[] DEFAULT '{}'::TEXT[],
  
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT
);

-- Create trigger for bookings (if it doesn't exist)
DROP TRIGGER IF EXISTS set_timestamp_bookings ON bookings;
CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_session_date ON bookings(session_date);
CREATE INDEX IF NOT EXISTS idx_bookings_hubtel_reference ON bookings(hubtel_reference);

-- 2. Booking Status History Table
CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  label TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_booking_id ON booking_status_history(booking_id);

-- 3. Blocked Slots Table
CREATE TABLE IF NOT EXISTS blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(date);

-- 4. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  name TEXT NOT NULL,
  social_handle TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 6. Webhook Events Table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- ============================================
-- SYNC RELIABILITY LAYER
-- ============================================

-- 7. Sync Events Table
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,        -- 'booking_created' | 'status_changed' | 'payment_confirmed' | 'payment_failed'
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code TEXT NOT NULL,      -- denormalized, so admin can show it even if join fails
  payload JSONB NOT NULL,          -- snapshot of relevant booking fields at the time of the event
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivery_attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sync_events_undelivered ON sync_events (delivered, created_at) WHERE delivered = false;

-- 8. Trigger function for booking sync events
CREATE OR REPLACE FUNCTION fn_log_booking_sync_event()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO sync_events (event_type, booking_id, booking_code, payload)
    VALUES ('booking_created', NEW.id, NEW.booking_code, to_jsonb(NEW));

    -- Only insert into booking_status_history if label column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'booking_status_history' AND column_name = 'label'
    ) THEN
      INSERT INTO booking_status_history (booking_id, status, label)
      VALUES (NEW.id, NEW.status, 'Booking received — awaiting payment');
    END IF;

  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO sync_events (event_type, booking_id, booking_code, payload)
    VALUES ('status_changed', NEW.id, NEW.booking_code, to_jsonb(NEW));

    -- Only insert into booking_status_history if label column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'booking_status_history' AND column_name = 'label'
    ) THEN
      INSERT INTO booking_status_history (booking_id, status, label)
      VALUES (
        NEW.id,
        NEW.status,
        CASE UPPER(NEW.status)
          WHEN 'CONFIRMED' THEN 'Payment confirmed'
          WHEN 'FAILED' THEN 'Payment failed'
          WHEN 'CANCELLED' THEN 'Booking cancelled'
          ELSE NEW.status
        END
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for booking sync events
DROP TRIGGER IF EXISTS trg_booking_sync_event ON bookings;
CREATE TRIGGER trg_booking_sync_event
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION fn_log_booking_sync_event();

-- 10. Function to increment delivery attempts (for retry logic)
CREATE OR REPLACE FUNCTION increment_delivery_attempts(event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sync_events
  SET delivery_attempts = delivery_attempts + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS admin_all_bookings ON bookings;
DROP POLICY IF EXISTS admin_all_history ON booking_status_history;
DROP POLICY IF EXISTS admin_all_blocked_slots ON blocked_slots;
DROP POLICY IF EXISTS public_read_blocked_slots ON blocked_slots;
DROP POLICY IF EXISTS admin_all_reviews ON reviews;
DROP POLICY IF EXISTS public_read_approved_reviews ON reviews;
DROP POLICY IF EXISTS public_insert_review ON reviews;
DROP POLICY IF EXISTS admin_all_settings ON settings;
DROP POLICY IF EXISTS public_read_settings ON settings;
DROP POLICY IF EXISTS admin_all_webhook_events ON webhook_events;
DROP POLICY IF EXISTS admin_all_sync_events ON sync_events;

-- Bookings RLS
CREATE POLICY admin_all_bookings ON bookings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Booking Status History RLS
CREATE POLICY admin_all_history ON booking_status_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Blocked Slots RLS
CREATE POLICY admin_all_blocked_slots ON blocked_slots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY public_read_blocked_slots ON blocked_slots
  FOR SELECT
  TO anon
  USING (true);

-- Reviews RLS
CREATE POLICY admin_all_reviews ON reviews
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY public_read_approved_reviews ON reviews
  FOR SELECT
  TO anon
  USING (approved = true);

CREATE POLICY public_insert_review ON reviews
  FOR INSERT
  TO anon
  WITH CHECK (approved = false);

-- Settings RLS
CREATE POLICY admin_all_settings ON settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY public_read_settings ON settings
  FOR SELECT
  TO anon
  USING (true);

-- Webhook Events RLS
CREATE POLICY admin_all_webhook_events ON webhook_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sync Events RLS
CREATE POLICY admin_all_sync_events ON sync_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- REALTIME SETUP
-- ============================================

-- Note: You may need to run this in the Supabase dashboard SQL editor
-- to properly configure realtime replication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE sync_events;
