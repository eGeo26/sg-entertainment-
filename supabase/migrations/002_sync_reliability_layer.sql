-- Sync Reliability Layer Migration
-- This migration adds a sync_events table and triggers to ensure reliable event delivery
-- to the admin dashboard via Supabase Realtime

-- 1. Update booking_status_history table to include label field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_status_history' AND column_name = 'label'
  ) THEN
    ALTER TABLE booking_status_history ADD COLUMN label TEXT;
  END IF;
END $$;

-- 2. Create sync_events table - every meaningful change gets a row here
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

-- Create index for efficient querying of undelivered events
CREATE INDEX IF NOT EXISTS idx_sync_events_undelivered ON sync_events (delivered, created_at) WHERE delivered = false;

-- 3. Trigger function - auto-fires on every booking insert/update, no app code required
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

-- 4. Create trigger to fire the function on booking changes
DROP TRIGGER IF EXISTS trg_booking_sync_event ON bookings;
CREATE TRIGGER trg_booking_sync_event
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION fn_log_booking_sync_event();

-- 5. Enable RLS for sync_events
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for sync_events
CREATE POLICY admin_all_sync_events ON sync_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Function to increment delivery attempts (for retry logic)
CREATE OR REPLACE FUNCTION increment_delivery_attempts(event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sync_events
  SET delivery_attempts = delivery_attempts + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Grant necessary permissions for realtime
-- Note: You may need to run this in the Supabase dashboard SQL editor
-- to properly configure realtime replication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE sync_events;
