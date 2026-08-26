-- supabase/migrations/017_add_extension_producer_columns.sql
-- Additive migration: tracks whether an extended booking has been forwarded to the producer portal.
-- All columns are nullable with safe defaults — no existing rows are affected.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS extension_sent_to_producer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS extension_sent_to_producer_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN bookings.extension_sent_to_producer IS 'True when an admin has explicitly sent this extended booking''s details to the producer portal';
COMMENT ON COLUMN bookings.extension_sent_to_producer_at IS 'Timestamp of when the booking extension was sent to the producer portal';
