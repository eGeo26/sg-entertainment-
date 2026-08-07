-- 015_closed_dates.sql
-- Adds the closed_dates table for manual studio closure management.
--
-- Design decisions:
--   - date is UNIQUE: closing a date twice is a no-op / error (admin UI handles gracefully)
--   - note is free text: works for holidays, refurbishment, anything -- reason-agnostic
--   - No automatic holiday detection -- studio is open 24/7/365 by default
--   - created_by stores the admin user email for audit trail
--   - Existing confirmed bookings on a closed date are NOT auto-cancelled

CREATE TABLE IF NOT EXISTS public.closed_dates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE        NOT NULL UNIQUE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_closed_dates_date ON public.closed_dates(date);

ALTER TABLE public.closed_dates ENABLE ROW LEVEL SECURITY;

-- Admin: full CRUD (requires auth.jwt() role = 'admin', matching existing admin policies)
DROP POLICY IF EXISTS admin_all_closed_dates ON public.closed_dates;
CREATE POLICY admin_all_closed_dates ON public.closed_dates
  FOR ALL
  TO authenticated
  USING  (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Public: read-only (anon key, used by calendar and banner)
DROP POLICY IF EXISTS public_read_closed_dates ON public.closed_dates;
CREATE POLICY public_read_closed_dates ON public.closed_dates
  FOR SELECT
  TO anon
  USING (true);
