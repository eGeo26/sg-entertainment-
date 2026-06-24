-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Bookings Table
CREATE TABLE bookings (
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

CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Indexes for bookings
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX idx_bookings_session_date ON bookings(session_date);
CREATE INDEX idx_bookings_hubtel_reference ON bookings(hubtel_reference);

-- 2. Booking Status History Table
CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  status TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX idx_history_booking_id ON booking_status_history(booking_id);

-- 3. Blocked Slots Table
CREATE TABLE blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX idx_blocked_slots_date ON blocked_slots(date);

-- 4. Reviews Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  name TEXT NOT NULL,
  social_handle TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Settings Table
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 6. Webhook Events Table
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);

-- Enable Row Level Security (RLS)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

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
