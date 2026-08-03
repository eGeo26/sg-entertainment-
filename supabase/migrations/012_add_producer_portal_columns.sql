-- 012_add_producer_portal_columns.sql
-- Add producer portal tracking columns to bookings table

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pushed_to_producer BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS producer_marked_done BOOLEAN DEFAULT false;
