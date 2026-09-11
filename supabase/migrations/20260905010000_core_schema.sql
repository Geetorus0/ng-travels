-- ============================================================================
-- NG TRAVELS — CORE PRODUCTION SCHEMA (Supabase / PostgreSQL)
-- Source of truth: lib/db/src/schema/ng-travels.ts (Drizzle ORM)
-- Supersedes the mismatched draft previously at 20260904_production_schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Drop legacy/mismatched objects from the superseded draft schema
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;

-- ----------------------------------------------------------------------------
-- 1. DRIVERS
-- ----------------------------------------------------------------------------
CREATE TABLE public.drivers (
  id SERIAL PRIMARY KEY,
  driver_code TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  license_number TEXT,
  license_expiry DATE,
  emergency_contact TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  availability TEXT NOT NULL DEFAULT 'available',
  rating NUMERIC(3,1) DEFAULT 4.8,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX drivers_code_idx ON public.drivers(driver_code);
CREATE INDEX drivers_mobile_idx ON public.drivers(mobile);
CREATE INDEX drivers_availability_idx ON public.drivers(availability);

-- ----------------------------------------------------------------------------
-- 2. USERS (linked to Supabase Auth identities via auth_user_id)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner', -- owner | admin | driver | manager
  driver_id INTEGER REFERENCES public.drivers(id),
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_idx ON public.users(email);
CREATE INDEX users_phone_idx ON public.users(phone);
CREATE INDEX users_driver_id_idx ON public.users(driver_id);

-- ----------------------------------------------------------------------------
-- 3. VEHICLES
-- ----------------------------------------------------------------------------
CREATE TABLE public.vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL, -- Sedan | SUV | Innova | Tempo Traveller | Hatchback
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  capacity INTEGER NOT NULL DEFAULT 4,
  fuel_type TEXT DEFAULT 'Diesel',
  rc_number TEXT,
  insurance_policy TEXT,
  insurance_expiry DATE,
  permit_number TEXT,
  permit_expiry DATE,
  fitness_cert_number TEXT,
  fitness_expiry DATE,
  pollution_cert_number TEXT,
  pollution_expiry DATE,
  assigned_driver_id INTEGER REFERENCES public.drivers(id),
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive | maintenance
  maintenance_status TEXT DEFAULT 'good', -- good | service_due | under_maintenance
  last_service_date DATE,
  next_service_date DATE,
  current_odometer_km NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vehicles_number_idx ON public.vehicles(vehicle_number);
CREATE INDEX vehicles_status_idx ON public.vehicles(status);
CREATE INDEX vehicles_driver_idx ON public.vehicles(assigned_driver_id);

-- ----------------------------------------------------------------------------
-- 4. CUSTOMERS
-- ----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id SERIAL PRIMARY KEY,
  customer_code TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  whatsapp TEXT,
  alternate_number TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_code_idx ON public.customers(customer_code);
CREATE INDEX customers_search_idx ON public.customers(name, mobile, whatsapp);

-- ----------------------------------------------------------------------------
-- 5. ENQUIRIES
-- ----------------------------------------------------------------------------
CREATE TABLE public.enquiries (
  id SERIAL PRIMARY KEY,
  enquiry_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_email TEXT,
  pickup TEXT NOT NULL,
  destination TEXT NOT NULL,
  trip_type TEXT NOT NULL DEFAULT 'outstation_round_trip',
  start_date DATE NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 1,
  estimated_budget NUMERIC(12,2),
  quoted_fare NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | quoted | converted | lost
  notes TEXT,
  converted_trip_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX enquiries_code_idx ON public.enquiries(enquiry_code);
CREATE INDEX enquiries_status_idx ON public.enquiries(status);
CREATE INDEX enquiries_mobile_idx ON public.enquiries(customer_mobile);

-- ----------------------------------------------------------------------------
-- 6. TRIPS (single unified booking + execution entity)
-- ----------------------------------------------------------------------------
CREATE TABLE public.trips (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES public.customers(id),
  driver_id INTEGER REFERENCES public.drivers(id),
  driver_name TEXT,
  driver_mobile TEXT,
  vehicle_id INTEGER REFERENCES public.vehicles(id),
  vehicle_number TEXT,
  idempotency_key TEXT,
  trip_type TEXT NOT NULL,
  pickup JSONB NOT NULL,
  destination JSONB NOT NULL,
  stops JSONB NOT NULL DEFAULT '[]',
  start_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  return_date DATE,
  return_time TEXT,
  passenger_count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  -- Status progression: upcoming | ready | started | reached_pickup | customer_picked_up | in_progress | reached_destination | completed | cancelled
  map_distance_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  outbound_map_km NUMERIC(12,2),
  return_map_km NUMERIC(12,2),
  total_map_km NUMERIC(12,2),
  route_duration_minutes INTEGER,
  outbound_duration_minutes INTEGER,
  return_duration_minutes INTEGER,
  route_summary TEXT,
  api_estimated_toll NUMERIC(12,2),
  estimated_toll NUMERIC(12,2),
  final_toll NUMERIC(12,2) NOT NULL DEFAULT 0,
  outbound_toll_estimate NUMERIC(12,2),
  return_toll_estimate NUMERIC(12,2),
  route_options JSONB DEFAULT '[]',
  selected_route_summary TEXT,
  route_snapshot JSONB,
  billing_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  rate_per_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_fare NUMERIC(12,2) NOT NULL DEFAULT 0,
  driver_bata NUMERIC(12,2) NOT NULL DEFAULT 0,
  toll NUMERIC(12,2) NOT NULL DEFAULT 0,
  parking NUMERIC(12,2) NOT NULL DEFAULT 0,
  permit_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  waiting_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  night_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  billable_days INTEGER NOT NULL DEFAULT 1,
  minimum_km NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_day_policy TEXT NOT NULL DEFAULT 'CALENDAR_DAYS',
  customer_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  starting_km NUMERIC(12,2),
  start_km_time TIMESTAMPTZ,
  start_km_location TEXT,
  start_km_photo TEXT,
  ending_km NUMERIC(12,2),
  end_km_time TIMESTAMPTZ,
  end_km_location TEXT,
  end_km_photo TEXT,
  actual_km NUMERIC(12,2),
  expense_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX trips_booking_id_idx ON public.trips(booking_id);
CREATE INDEX trips_customer_id_idx ON public.trips(customer_id);
CREATE INDEX trips_driver_id_idx ON public.trips(driver_id);
CREATE INDEX trips_schedule_idx ON public.trips(start_date, start_time);
CREATE INDEX trips_status_idx ON public.trips(status);

-- ----------------------------------------------------------------------------
-- 7. PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.payments (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES public.trips(id),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT NOT NULL, -- UPI | Cash | Card | Bank Transfer | Cheque
  payment_type TEXT NOT NULL DEFAULT 'advance', -- advance | partial | final
  payment_date DATE NOT NULL,
  reference TEXT,
  notes TEXT,
  recorded_by TEXT DEFAULT 'Operations Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_trip_id_idx ON public.payments(trip_id);

-- ----------------------------------------------------------------------------
-- 8. REFUNDS
-- ----------------------------------------------------------------------------
CREATE TABLE public.refunds (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES public.trips(id),
  payment_id INTEGER REFERENCES public.payments(id),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'UPI',
  reference TEXT,
  refund_date DATE NOT NULL,
  recorded_by TEXT DEFAULT 'Operations Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refunds_trip_id_idx ON public.refunds(trip_id);

-- ----------------------------------------------------------------------------
-- 9. TRIP EXPENSES
-- ----------------------------------------------------------------------------
CREATE TABLE public.trip_expenses (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES public.trips(id),
  driver_id INTEGER REFERENCES public.drivers(id),
  category TEXT NOT NULL, -- Fuel | Toll | Parking | Food | Accommodation | Permit | Maintenance | Other
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  location TEXT,
  recorded_by TEXT DEFAULT 'Driver',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trip_expenses_trip_id_idx ON public.trip_expenses(trip_id);
CREATE INDEX trip_expenses_status_idx ON public.trip_expenses(status);

-- ----------------------------------------------------------------------------
-- 10. TRIP STATUS HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE public.trip_status_history (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES public.trips(id),
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  location TEXT,
  odometer_km NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trip_status_history_trip_id_idx ON public.trip_status_history(trip_id);

-- ----------------------------------------------------------------------------
-- 11. DRIVER LOCATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.driver_locations (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES public.drivers(id),
  trip_id INTEGER REFERENCES public.trips(id),
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  accuracy NUMERIC(8,2),
  speed NUMERIC(8,2),
  heading NUMERIC(8,2),
  battery_level NUMERIC(5,2),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX driver_locations_driver_idx ON public.driver_locations(driver_id, timestamp);
CREATE INDEX driver_locations_trip_idx ON public.driver_locations(trip_id);

-- ----------------------------------------------------------------------------
-- 12. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  audience TEXT NOT NULL DEFAULT 'owner', -- owner | driver
  driver_id INTEGER REFERENCES public.drivers(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  trip_id INTEGER REFERENCES public.trips(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_audience_idx ON public.notifications(audience, is_read);
CREATE INDEX notifications_driver_id_idx ON public.notifications(driver_id);

-- ----------------------------------------------------------------------------
-- 13. AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at);

-- ----------------------------------------------------------------------------
-- 14. APP SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.app_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX app_settings_key_idx ON public.app_settings(key);

INSERT INTO public.app_settings (key, value) VALUES
  ('company_info', '{"companyName":"NG Travels","tagline":"Premium Fleet & Outstation Logistics","phone":"+91 98450 11223","email":"operations@ngtravels.in","address":"Bangalore, Karnataka, India","currency":"INR","gstin":"29ABCDE1234F1Z5"}'),
  ('fare_rules', '{"ratePerKm":{"Sedan":18,"SUV":24,"Innova":28,"Tempo Traveller":35,"Luxury":45},"driverBataPerDay":500,"minimumKmPerDay":250,"nightBata":300,"taxPercent":5}')
ON CONFLICT (key) DO NOTHING;
