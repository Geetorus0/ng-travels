-- ============================================================================
-- NG TRAVELS — ROW LEVEL SECURITY
-- Defense-in-depth for direct Supabase (PostgREST / Realtime) access from
-- the browser. The API server connects via a direct Postgres connection
-- (DATABASE_URL) and is not subject to these policies.
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Users: staff manage all; everyone can read their own row
CREATE POLICY "staff_manage_users" ON public.users FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "users_read_own" ON public.users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Drivers: staff manage; drivers can read their own driver record
CREATE POLICY "staff_manage_drivers" ON public.drivers FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_read_own" ON public.drivers FOR SELECT TO authenticated
  USING (id = public.current_driver_id());

-- Vehicles: staff manage; drivers read
CREATE POLICY "staff_manage_vehicles" ON public.vehicles FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_read_vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (public.current_app_role() = 'driver');

-- Customers & enquiries: staff only
CREATE POLICY "staff_manage_customers" ON public.customers FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));

CREATE POLICY "staff_manage_enquiries" ON public.enquiries FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));

-- Trips: staff full access; drivers scoped to their own assigned trips
CREATE POLICY "staff_manage_trips" ON public.trips FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_manage_own_trips" ON public.trips FOR ALL TO authenticated
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

-- Payments & refunds: staff only
CREATE POLICY "staff_manage_payments" ON public.payments FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "staff_manage_refunds" ON public.refunds FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));

-- Trip expenses: staff full access; drivers manage their own
CREATE POLICY "staff_manage_trip_expenses" ON public.trip_expenses FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_manage_own_expenses" ON public.trip_expenses FOR ALL TO authenticated
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

-- Trip status history: staff read all; drivers manage entries for their own trips
CREATE POLICY "staff_read_trip_status_history" ON public.trip_status_history FOR SELECT TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_manage_own_status_history" ON public.trip_status_history FOR ALL TO authenticated
  USING (trip_id IN (SELECT id FROM public.trips WHERE driver_id = public.current_driver_id()))
  WITH CHECK (trip_id IN (SELECT id FROM public.trips WHERE driver_id = public.current_driver_id()));

-- Driver locations: staff read all; drivers manage their own pings
CREATE POLICY "staff_read_driver_locations" ON public.driver_locations FOR SELECT TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_manage_own_locations" ON public.driver_locations FOR ALL TO authenticated
  USING (driver_id = public.current_driver_id())
  WITH CHECK (driver_id = public.current_driver_id());

-- Notifications: staff see owner-audience; drivers see their own
CREATE POLICY "staff_manage_owner_notifications" ON public.notifications FOR ALL TO authenticated
  USING (audience = 'owner' AND public.current_app_role() IN ('owner', 'admin', 'manager'))
  WITH CHECK (audience = 'owner' AND public.current_app_role() IN ('owner', 'admin', 'manager'));
CREATE POLICY "drivers_manage_own_notifications" ON public.notifications FOR ALL TO authenticated
  USING (audience = 'driver' AND driver_id = public.current_driver_id())
  WITH CHECK (audience = 'driver' AND driver_id = public.current_driver_id());

-- Audit logs: staff read-only
CREATE POLICY "staff_read_audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin', 'manager'));

-- App settings: readable by all authenticated; writable by owner/admin
CREATE POLICY "authenticated_read_settings" ON public.app_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "owners_manage_settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.current_app_role() IN ('owner', 'admin'))
  WITH CHECK (public.current_app_role() IN ('owner', 'admin'));
