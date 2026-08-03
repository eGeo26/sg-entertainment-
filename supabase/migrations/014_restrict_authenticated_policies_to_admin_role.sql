-- Restrict privileged table policies to users explicitly assigned app_metadata.role = 'admin'.
-- Service-role API clients continue to bypass RLS as designed.

DROP POLICY IF EXISTS admin_all_bookings ON public.bookings;
CREATE POLICY admin_all_bookings ON public.bookings
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_history ON public.booking_status_history;
CREATE POLICY admin_all_history ON public.booking_status_history
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_blocked_slots ON public.blocked_slots;
CREATE POLICY admin_all_blocked_slots ON public.blocked_slots
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_reviews ON public.reviews;
CREATE POLICY admin_all_reviews ON public.reviews
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_settings ON public.settings;
CREATE POLICY admin_all_settings ON public.settings
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_webhook_events ON public.webhook_events;
CREATE POLICY admin_all_webhook_events ON public.webhook_events
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS admin_all_sync_events ON public.sync_events;
CREATE POLICY admin_all_sync_events ON public.sync_events
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
