-- ============================================================================
-- Add driver commission (percentage or flat amount) tracking to trips
-- ============================================================================
-- Admin/owner can record how much commission a driver earns on a trip,
-- either as a percentage of the customer total fare or a flat rupee amount.
-- driver_commission_type drives how driver_commission_amount is derived:
--   'percentage' -> amount = customer_total * driver_commission_value / 100
--   'flat'       -> amount = driver_commission_value (entered directly)
-- driver_commission_amount is the resolved payout figure, stored so reports
-- don't need to re-derive it and so it stays fixed once a trip is completed.
-- ============================================================================

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS driver_commission_type TEXT NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS driver_commission_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
