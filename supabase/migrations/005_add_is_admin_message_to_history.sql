-- Migration: Add is_admin_message flag to booking_status_history
-- This allows distinguishing custom messages written by admin from automatic system-generated ones

ALTER TABLE booking_status_history
  ADD COLUMN IF NOT EXISTS is_admin_message boolean DEFAULT false NOT NULL;

-- Create an index for faster queries searching for admin messages
CREATE INDEX IF NOT EXISTS idx_history_is_admin_message ON booking_status_history(is_admin_message);
