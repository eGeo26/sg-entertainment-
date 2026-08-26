-- 016_add_extension_columns.sql
-- Adds three new columns to the bookings table for tracking session extensions/top-ups.
--
-- Design decisions:
--   - extension_hours: represents the whole hours added to the booking
--   - extension_amount: represents the added price in pesewas (100 pesewas = GHS 1.00)
--   - extended_at: timestamp when the extension was processed/paid
--   - Columns are NULL by default so existing/un-extended bookings are unaffected.
--   - Completely additive migration — no restructuring of existing columns or tables.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS extension_hours   INTEGER,
  ADD COLUMN IF NOT EXISTS extension_amount  INTEGER,
  ADD COLUMN IF NOT EXISTS extended_at       TIMESTAMPTZ;

-- Indices for performance querying and analytics
CREATE INDEX IF NOT EXISTS idx_bookings_extension_hours ON public.bookings(extension_hours) WHERE extension_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_extended_at ON public.bookings(extended_at) WHERE extended_at IS NOT NULL;
