-- Add direct boolean + timestamp columns for progress tracking
-- This replaces the booking_status_history dependency for the stepper

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS status_received boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS status_received_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status_payment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_reviewed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_confirmed_at timestamptz;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_status_received ON bookings(status_received);
CREATE INDEX IF NOT EXISTS idx_bookings_status_payment ON bookings(status_payment);
CREATE INDEX IF NOT EXISTS idx_bookings_status_reviewed ON bookings(status_reviewed);
CREATE INDEX IF NOT EXISTS idx_bookings_status_confirmed ON bookings(status_confirmed);
