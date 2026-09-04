import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { syncEngine } from "@/lib/syncEngine";
import { supabase } from "@/lib/supabase/client";

export type ConnectionStatus = "connected" | "connecting" | "offline" | "standalone";

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>(() => syncEngine.getState().status);

  useEffect(() => {
    // 1. Subscribe to SyncEngine state changes
    const unsubscribeSync = syncEngine.subscribe((state) => {
      setStatus(state.status);
    });

    // 2. Connect Supabase Realtime PostgreSQL Change Stream (ddysnnfnzlhiidxkuvmh)
    let supabaseChannel: any = null;
    try {
      supabaseChannel = supabase
        .channel("ng_travels_realtime_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["trips"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
          queryClient.invalidateQueries({ queryKey: ["/api/driver/today"] });
          queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["trips"] });
          queryClient.invalidateQueries({ queryKey: ["driver-today"] });
          queryClient.invalidateQueries({ queryKey: ["driver-current"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
          queryClient.invalidateQueries({ queryKey: ["drivers"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "vehicles" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
          queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["payments"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        })
        .subscribe((subStatus) => {
          if (subStatus === "SUBSCRIBED") {
            setStatus("connected");
          }
        });
    } catch (e) {
      console.warn("[Realtime] Supabase Realtime client initialization notice:", e);
    }

    // 3. Listen to local operational broadcast events
    const handleRealtimeEvent = (event: CustomEvent<any>) => {
      try {
        const { type, payload } = event.detail || {};

        // Invalidate React Query caches for instant dynamic UI updates
        queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/driver/today"] });
        queryClient.invalidateQueries({ queryKey: ["/api/driver/current-trip"] });
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/drivers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });

        // Alert toasts for operational milestones
        if (type === "TRIP_STARTED") {
          toast({
            title: "🚀 Journey Started",
            description: `Trip ${payload?.bookingId || ""} started (Odometer: ${payload?.startingKm || ""} KM)`,
          });
        } else if (type === "TRIP_COMPLETED") {
          toast({
            title: "✓ Trip Completed",
            description: `Trip ${payload?.bookingId || ""} completed (${payload?.actualKm || ""} Actual KM clocked)`,
          });
        } else if (type === "PAYMENT_ADDED") {
          toast({
            title: "💰 Payment Recorded",
            description: `₹${payload?.amount || 0} recorded for trip #${payload?.tripId || ""}`,
          });
        } else if (type === "EXPENSE_SUBMITTED") {
          toast({
            title: "📋 New Expense Submitted",
            description: `₹${payload?.amount || 0} (${payload?.category || ""}) submitted for approval`,
          });
        } else if (type === "TRIP_CANCELLED") {
          toast({
            title: "⚠️ Trip Cancelled",
            description: `Trip ${payload?.bookingId || ""} was cancelled`,
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("[useRealtimeSync] Parse error:", err);
      }
    };

    window.addEventListener("ng_realtime_sync", handleRealtimeEvent as EventListener);

    return () => {
      unsubscribeSync();
      if (supabaseChannel) {
        try {
          supabase.removeChannel(supabaseChannel);
        } catch {}
      }
      window.removeEventListener("ng_realtime_sync", handleRealtimeEvent as EventListener);
    };
  }, [queryClient]);

  return { status };
}
