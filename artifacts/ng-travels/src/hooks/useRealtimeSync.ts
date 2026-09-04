import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { syncEngine } from "@/lib/syncEngine";

export type ConnectionStatus = "connected" | "connecting" | "offline" | "standalone";

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectionStatus>(() => syncEngine.getState().status);

  useEffect(() => {
    // 1. Subscribe to SyncEngine state changes
    const unsubscribeSync = syncEngine.subscribe((state) => {
      setStatus(state.status);
    });

    // 2. Listen to custom realtime events broadcasted by syncEngine or offlineStore
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
      window.removeEventListener("ng_realtime_sync", handleRealtimeEvent as EventListener);
    };
  }, [queryClient, toast]);

  return { status };
}
