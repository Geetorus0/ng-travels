import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge, CheckCircle2, AlertCircle } from "lucide-react";
import { TripActionLoader, ButtonLoader } from "@/components/loading";

export interface DriverKmModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  mode: "start" | "end";
  onSuccess: (updatedTrip: any) => void;
}

export const DriverKmModal: React.FC<DriverKmModalProps> = ({
  isOpen,
  onClose,
  trip,
  mode,
  onSuccess,
}) => {
  const [kmValue, setKmValue] = useState<string>(() => {
    if (mode === "end" && trip?.startingKm) {
      return String(trip.startingKm);
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trip) return null;

  const startKm = Number(trip.startingKm || 0);
  const endKm = Number(kmValue || 0);
  const calculatedActual = mode === "end" && endKm >= startKm ? endKm - startKm : 0;

  const handleSubmit = async () => {
    setError(null);
    if (!kmValue || isNaN(Number(kmValue)) || Number(kmValue) <= 0) {
      setError("Please enter a valid positive odometer reading.");
      return;
    }

    if (mode === "end" && endKm < startKm) {
      setError(`Ending KM (${endKm}) cannot be less than Starting KM (${startKm}).`);
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "start"
        ? `/api/driver/trips/${trip.id}/start`
        : `/api/driver/trips/${trip.id}/complete`;

      const payload = mode === "start"
        ? { startingKm: Number(kmValue) }
        : { endingKm: Number(kmValue) };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to update odometer.");
        return;
      }

      const updatedTrip = await res.json();
      onSuccess(updatedTrip);
      onClose();
    } catch {
      setError("Network error while submitting odometer reading.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <TripActionLoader action={mode === "start" ? "start" : "complete"} />
      )}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm bg-zinc-950 text-zinc-100 border-zinc-800 p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              {mode === "start" ? "Enter Starting Odometer KM" : "Enter Ending Odometer KM"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 space-y-1">
              <div className="text-zinc-400">Booking: <span className="font-mono text-amber-400 font-bold">{trip.bookingId}</span></div>
              <div className="text-zinc-300 font-medium">{trip.pickup?.name} ➔ {trip.destination?.name}</div>
              {mode === "end" && (
                <div className="text-zinc-400 pt-1 border-t border-zinc-800 flex justify-between">
                  <span>Recorded Starting KM:</span>
                  <span className="font-mono font-bold text-zinc-200">{startKm} km</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-amber-400 font-semibold uppercase block mb-1.5">
                {mode === "start" ? "Starting Odometer Reading (KM)" : "Ending Odometer Reading (KM)"}
              </label>
              <Input
                type="number"
                value={kmValue}
                onChange={(e) => setKmValue(e.target.value)}
                placeholder="e.g. 82450"
                className="bg-zinc-900 border-amber-500/50 text-xl font-mono font-bold text-amber-400 text-center py-6"
              />
            </div>

            {mode === "end" && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 flex justify-between items-center text-xs">
                <span className="text-zinc-400">Calculated Actual KM:</span>
                <span className="text-lg font-mono font-bold text-emerald-400">
                  {calculatedActual} km
                </span>
              </div>
            )}

            {error && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold py-5 text-sm"
            >
              {loading ? (
                <ButtonLoader
                  label={mode === "start" ? "Starting your journey..." : "Completing trip..."}
                />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {mode === "start" ? "Confirm & Start Trip" : "Validate & Complete Trip"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
