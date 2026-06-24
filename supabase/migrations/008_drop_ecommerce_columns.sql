-- Migration: Drop e-commerce/delivery template columns
-- These columns were carried over from an e-commerce template and do not apply to studio bookings

-- Drop the columns
ALTER TABLE bookings DROP COLUMN IF EXISTS is_dispatched;
ALTER TABLE bookings DROP COLUMN IF EXISTS estimated_delivery_time;
