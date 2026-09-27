-- ============================================================================
-- Add flat "total package rate" as an alternative to per-km pricing on trips
-- ============================================================================
-- Admin/owner can now toggle a trip's fare between the existing per-km
-- distance calculation and a flat package total entered at booking time.
-- pricing_mode drives which one is authoritative for base_fare:
--   'per_km'  -> base_fare = billable_km * rate_per_km (existing behaviour)
--   'package' -> base_fare = package_total (flat, distance/day-minimum ignored)
-- ============================================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'per_km',
  ADD COLUMN IF NOT EXISTS package_total NUMERIC(12,2);
