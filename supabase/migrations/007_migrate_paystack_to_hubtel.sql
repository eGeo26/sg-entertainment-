-- Migration: Migrate from Paystack to Hubtel payment columns
-- This migration adds Hubtel columns and drops Paystack columns

-- Add Hubtel columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hubtel_reference TEXT UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hubtel_status TEXT;

-- Migrate existing data from Paystack columns to Hubtel columns
UPDATE bookings
SET hubtel_reference = paystack_reference,
    hubtel_status = paystack_status
WHERE paystack_reference IS NOT NULL;

-- Drop Paystack columns
ALTER TABLE bookings DROP COLUMN IF EXISTS paystack_reference;
ALTER TABLE bookings DROP COLUMN IF EXISTS paystack_status;

-- Drop Paystack index
DROP INDEX IF EXISTS idx_bookings_paystack_reference;

-- Create Hubtel index
CREATE INDEX IF NOT EXISTS idx_bookings_hubtel_reference ON bookings(hubtel_reference);
