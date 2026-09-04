import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, CheckCircle2, IndianRupee } from "lucide-react";
import { formatINR } from "@/lib/fareEngine";
import { TripActionLoader, ButtonLoader } from "@/components/loading";

export interface PaymentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  onPaymentRecorded: (newPayment: any) => void;
}

export const PaymentRecordModal: React.FC<PaymentRecordModalProps> = ({
  isOpen,
  onClose,
  trip,
  onPaymentRecorded,
}) => {
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentType, setPaymentType] = useState("partial");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  if (!trip) return null;

  const totalFare = Number(trip.totalFare || 0);
  const totalPaid = Number(trip.paidAmount || 0);
  const remaining = Math.max(0, totalFare - totalPaid);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          paymentMode,
          paymentType,
          reference: reference || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record payment");
      }

      const newPayment = await res.json();
      onPaymentRecorded(newPayment);
      onClose();
    } catch {
      alert("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <TripActionLoader action="payment" />}

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-zinc-950 text-zinc-100 border-zinc-800 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              Record Passenger / Client Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Booking: <strong className="text-amber-400 font-mono">{trip.bookingId}</strong></span>
                <span className="text-zinc-400">Customer: <strong className="text-zinc-200">{trip.customerName || "Customer"}</strong></span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800/80 font-mono text-[11px]">
                <span>Total Fare: <strong className="text-zinc-200">{formatINR(totalFare)}</strong></span>
                <span>Paid So Far: <strong className="text-emerald-400">{formatINR(totalPaid)}</strong></span>
                <span>Due Balance: <strong className="text-amber-400">{formatINR(remaining)}</strong></span>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-semibold block mb-1">Payment Amount (₹) *</label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <Input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`e.g. ${remaining > 0 ? remaining : 2500}`}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-base font-mono font-bold text-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Payment Method</label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI (GPay / PhonePe)</SelectItem>
                    <SelectItem value="card">Debit / Credit Card</SelectItem>
                    <SelectItem value="bank_transfer">NEFT / RTGS</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">Payment Category</label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                    <SelectItem value="advance">Advance Deposit</SelectItem>
                    <SelectItem value="partial">Partial Milestone</SelectItem>
                    <SelectItem value="final">Final Settlement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-300 font-semibold block mb-1">Transaction Ref / Cheque No.</label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. UPI/260902/849102"
                className="bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>

            <Button
              type="button"
              disabled={loading || !amount || Number(amount) <= 0}
              onClick={handleSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 text-xs cursor-pointer"
            >
              {loading ? (
                <ButtonLoader label="Recording Payment..." />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Payment Receipt
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
