-- Migration: Migrate is_packed/is_delivered to status_reviewed/status_confirmed
-- These columns were delivery-themed names repurposed for studio workflow
-- status_reviewed replaces is_packed ("Reviewed" stage)
-- status_confirmed replaces is_delivered ("Granted" stage)

-- Migrate existing data from is_packed to status_reviewed
UPDATE bookings
SET status_reviewed = is_packed,
    status_reviewed_at = CASE 
        WHEN is_packed = true THEN COALESCE(status_reviewed_at, updated_at, created_at)
        ELSE NULL
    END
WHERE is_packed IS NOT NULL;

-- Migrate existing data from is_delivered to status_confirmed
UPDATE bookings
SET status_confirmed = is_delivered,
    status_confirmed_at = CASE 
        WHEN is_delivered = true THEN COALESCE(status_confirmed_at, updated_at, created_at)
        ELSE NULL
    END
WHERE is_delivered IS NOT NULL;

-- Drop the old columns
ALTER TABLE bookings DROP COLUMN IF EXISTS is_packed;
ALTER TABLE bookings DROP COLUMN IF EXISTS is_delivered;
