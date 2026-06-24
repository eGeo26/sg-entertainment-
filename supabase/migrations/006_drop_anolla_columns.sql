-- Migration: Drop Anola-related columns from bookings table
-- Anola integration was never implemented, these columns are unused

-- Drop the columns
ALTER TABLE bookings DROP COLUMN IF EXISTS anolla_booking_id;
ALTER TABLE bookings DROP COLUMN IF EXISTS anolla_status;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_bookings_anolla_booking_id;
