-- ============================================================================
-- NG TRAVELS — REALTIME PUBLICATION
-- Broadcasts row changes to the frontend's direct Supabase Realtime
-- subscription (see artifacts/ng-travels/src/hooks/useRealtimeSync.ts).
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE
      public.trips,
      public.drivers,
      public.vehicles,
      public.payments,
      public.trip_expenses,
      public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Tables may already be in the publication.
  NULL;
END $$;
