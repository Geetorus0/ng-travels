import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, XCircle } from "lucide-react";
import { formatINR } from "@/lib/fareEngine";
import { ButtonLoader } from "@/components/loading";

export interface CancelTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  onTripCancelled: (cancelledTrip: any) => void;
}

export const CancelTripModal: React.FC<CancelTripModalProps> = ({
  isOpen,
  onClose,
  trip,
  onTripCancelled,
}) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!trip) return null;

  const hasAdvance = Number(trip.totalPaid || 0) > 0;

  const handleConfirmCancel = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      onTripCancelled(data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 text-zinc-100 border-zinc-800 p-5 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
            <XCircle className="w-5 h-5" /> Cancel Trip Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 space-y-1">
            <div className="text-zinc-400">Booking ID: <span className="font-mono text-amber-400 font-bold">{trip.bookingId}</span></div>
            <div className="text-zinc-200 font-semibold">{trip.pickup?.name} ➔ {trip.destination?.name}</div>
            <div className="text-zinc-400">Customer: {trip.customerName} ({trip.customerMobile})</div>
          </div>

          {hasAdvance && (
            <div className="bg-amber-950/30 border border-amber-500/40 p-3 rounded-lg text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" /> Advance Paid: {formatINR(trip.totalPaid)}
              </div>
              <p className="text-[11px] text-zinc-400">
                An advance payment was recorded. Trip cancellation will flag this for refund processing in the Refunds ledger.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-300 font-semibold uppercase block mb-1">Cancellation Reason (Mandatory)</label>
            <Textarea
              placeholder="e.g. Customer cancelled due to personal emergency / Vehicle breakdown..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-zinc-700 text-xs">
              Keep Booking
            </Button>
            <Button
              type="button"
              disabled={loading || !reason.trim()}
              onClick={handleConfirmCancel}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
            >
              {loading ? (
                <ButtonLoader label="Cancelling Trip..." />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1" /> Confirm Cancellation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
