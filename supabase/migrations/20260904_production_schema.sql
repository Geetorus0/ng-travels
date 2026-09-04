-- ============================================================================
-- NG TRAVELS — PRODUCTION SUPABASE RELATIONAL POSTGRESQL SCHEMA
-- Target Supabase Project: ddysnnfnzlhiidxkuvmh.supabase.co
-- Features: Strict UUID PKs, Foreign Keys, RLS, Trigger Automation, Realtime WAL
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (Linked 1:1 with auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER', 'DRIVER', 'ACCOUNTANT')),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. CUSTOMERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. DRIVERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT,
  license_expiry DATE,
  joining_date DATE,
  address TEXT,
  emergency_contact TEXT,
  profile_photo TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'on_trip', 'offline', 'on_leave')),
  current_vehicle_id UUID,
  rating NUMERIC(3,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. VEHICLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT UNIQUE NOT NULL,
  vehicle_name TEXT,
  vehicle_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,
  seat_capacity INTEGER NOT NULL DEFAULT 4,
  fuel_type TEXT,
  permit_type TEXT,
  permit_expiry DATE,
  insurance_expiry DATE,
  fitness_expiry DATE,
  pollution_expiry DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  odometer NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  current_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key back from drivers to vehicles
ALTER TABLE public.drivers 
  DROP CONSTRAINT IF EXISTS fk_driver_current_vehicle,
  ADD CONSTRAINT fk_driver_current_vehicle FOREIGN KEY (current_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 5. BOOKINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
  
  -- Pickup Location
  pickup_location TEXT NOT NULL,
  pickup_address TEXT,
  pickup_latitude NUMERIC(10,7),
  pickup_longitude NUMERIC(10,7),
  pickup_place_id TEXT,
  
  -- Destination Location
  destination_location TEXT NOT NULL,
  destination_address TEXT,
  destination_latitude NUMERIC(10,7),
  destination_longitude NUMERIC(10,7),
  destination_place_id TEXT,
  
  -- Timing & Classification
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  return_date DATE,
  return_time TIME,
  trip_type TEXT NOT NULL DEFAULT 'ROUND_TRIP',
  vehicle_type TEXT NOT NULL,
  
  -- Assignments
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  
  -- Real Driving Distances & Durations (Independent Outbound + Return)
  outbound_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  return_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  outbound_duration_seconds INTEGER NOT NULL DEFAULT 0,
  return_duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Authoritative Commercial Fare Breakdown
  base_fare NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  distance_fare NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  driver_bata NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  permit_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  toll_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  parking_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  waiting_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  extra_km_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10,2) NOT NULL,
  advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  
  -- Status
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'advance_paid', 'paid', 'refunded')),
  booking_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (booking_status IN ('pending', 'confirmed', 'assigned', 'started', 'completed', 'cancelled')),
  
  -- Route Snapshot (GeoJSON/polyline/points for maps)
  route_snapshot JSONB,
  special_instructions TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. TRIPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  trip_status TEXT NOT NULL DEFAULT 'assigned' CHECK (trip_status IN ('assigned', 'started', 'in_progress', 'completed', 'cancelled')),
  
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  start_odometer NUMERIC(10,2),
  end_odometer NUMERIC(10,2),
  actual_distance_km NUMERIC(10,2),
  
  start_latitude NUMERIC(10,7),
  start_longitude NUMERIC(10,7),
  end_latitude NUMERIC(10,7),
  end_longitude NUMERIC(10,7),
  
  driver_bata NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  actual_toll NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  actual_permit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  fuel_expense NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  parking_expense NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  other_expense NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  
  trip_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card')),
  transaction_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. EXPENSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('fuel', 'toll', 'permit', 'parking', 'maintenance', 'food_bata', 'other')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  reference_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 10. APP SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert Default Company Settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('company_info', '{"companyName":"NG Travels","tagline":"Premium Fleet & Outstation Logistics","phone":"+91 98450 11223","email":"operations@ngtravels.in","address":"Bangalore, Karnataka, India","currency":"INR","gstin":"29ABCDE1234F1Z5"}', 'Core company profile and billing headers'),
  ('fare_rules', '{"ratePerKm":{"Sedan":18,"SUV":24,"Innova":28,"Tempo Traveller":35,"Luxury":45},"driverBataPerDay":500,"minimumKmPerDay":250,"nightBata":300,"taxPercent":5}', 'Authoritative rate engine coefficients')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_number ON public.bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_date ON public.bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON public.bookings(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON public.bookings(assigned_vehicle_id);

CREATE INDEX IF NOT EXISTS idx_trips_booking ON public.trips(booking_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(trip_status);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_expenses_trip ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_driver ON public.expenses(driver_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'OWNER')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch authenticated user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Users can view all active profiles, update their own
CREATE POLICY "Profiles are viewable by authenticated users" 
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Operational Tables (Customers, Vehicles, Settings):
-- Owners/Admins/Managers have full management; Drivers can read
CREATE POLICY "Owners and Staff manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'));

CREATE POLICY "Drivers view customers for trips"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners and Staff manage vehicles"
  ON public.vehicles FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'));

CREATE POLICY "Drivers view vehicles"
  ON public.vehicles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners and Staff manage drivers"
  ON public.drivers FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'));

CREATE POLICY "Drivers view their driver profile"
  ON public.drivers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'));

-- Bookings & Trips Policies
CREATE POLICY "Staff manage all bookings"
  ON public.bookings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER', 'ACCOUNTANT'));

CREATE POLICY "Drivers view their assigned bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (assigned_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Staff manage all trips"
  ON public.trips FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'DISPATCHER'));

CREATE POLICY "Drivers view and update their assigned trips"
  ON public.trips FOR ALL TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
  WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Payments & Expenses Policies
CREATE POLICY "Staff manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'));

CREATE POLICY "Staff manage all expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'));

CREATE POLICY "Drivers create and view their expenses"
  ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers select their expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Notifications: Users only see their own notifications
CREATE POLICY "Users access their own notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- App Settings: Readable by all authenticated users, editable by Owners
CREATE POLICY "Settings are readable by authenticated users"
  ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners update settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER'))
  WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'OWNER'));

-- ----------------------------------------------------------------------------
-- REALTIME PUBLICATION FOR WAL BROADCASTS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.bookings, 
      public.trips, 
      public.drivers, 
      public.vehicles, 
      public.notifications, 
      public.payments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Table might already be in publication or publication created automatically
  NULL;
END $$;
