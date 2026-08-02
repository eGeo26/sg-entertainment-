-- Add optional selected_package column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS selected_package text;
