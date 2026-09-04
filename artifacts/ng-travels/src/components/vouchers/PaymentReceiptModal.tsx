import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { Printer, Share2, CheckCircle, Receipt } from "lucide-react";

export interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  trip: any;
  companyInfo?: {
    company: string;
    mobile: string;
    email: string;
  };
}

export const PaymentReceiptModal: React.FC<PaymentReceiptProps> = ({
  isOpen,
  onClose,
  payment,
  trip,
  companyInfo = {
    company: "NG Travels Operations",
    mobile: "+91 98450 21867",
    email: "operations@ngtravels.in",
  },
}) => {
  if (!payment || !trip) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `*NG Travels Official Payment Receipt*\n` +
      `Receipt No: REC-${payment.id}\n` +
      `Booking ID: ${trip.bookingId}\n` +
      `Customer: ${trip.customerName}\n` +
      `Amount Paid: ₹${payment.amount}\n` +
      `Payment Method: ${payment.method} (${payment.paymentType || "Payment"})\n` +
      `Reference / TXN: ${payment.reference || "N/A"}\n` +
      `Remaining Trip Balance: ₹${trip.remainingBalance}\n\n` +
      `Received with thanks!\n${companyInfo.company}`
    );
    window.open(`https://wa.me/${(trip.customerMobile || "").replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const paymentDateStr = new Date(payment.paymentDate || payment.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-zinc-950 text-zinc-100 border-zinc-800 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="NG Travels" className="w-7 h-7 rounded-md object-contain bg-black border border-amber-500/30 p-0.5" />
            <span className="font-bold text-zinc-100">Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="border-zinc-700 hover:bg-zinc-800 text-xs">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
            <Button size="sm" onClick={handleWhatsApp} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 text-sm bg-zinc-950">
          <div className="text-center pb-4 border-b border-zinc-800">
            <img src="/logo.png" alt="NG Travels" className="w-16 h-16 rounded-xl object-contain bg-black border border-amber-500/30 p-1 mx-auto mb-2 shadow-lg" />
            <h3 className="font-bold text-lg text-zinc-100">{companyInfo.company}</h3>
            <p className="text-xs text-amber-400 font-medium">Travel with Comfort & Safety</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Payment Acknowledgment Slip</p>
            <div className="mt-3 text-2xl font-bold font-mono text-emerald-400">
              {formatINR(payment.amount)}
            </div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide mt-0.5">
              Paid via {payment.method} ({payment.paymentType || "Payment"})
            </div>
          </div>

          <div className="space-y-3 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Receipt ID:</span>
              <span className="font-mono text-zinc-200">REC-{payment.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Date:</span>
              <span className="text-zinc-200">{paymentDateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Booking Ref:</span>
              <span className="font-mono font-bold text-amber-400">{trip.bookingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Customer:</span>
              <span className="text-zinc-200 font-medium">{trip.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Transaction Ref:</span>
              <span className="font-mono text-zinc-300">{payment.reference || "N/A"}</span>
            </div>
            {payment.notes && (
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Notes:</span>
                <span className="text-zinc-300 italic">{payment.notes}</span>
              </div>
            )}
          </div>

          <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>Total Trip Fare:</span>
              <span className="font-medium">{formatINR(trip.customerTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>Cumulative Paid:</span>
              <span>{formatINR(trip.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-amber-300 font-bold border-t border-amber-500/20 pt-1.5 text-sm">
              <span>Outstanding Balance:</span>
              <span>{formatINR(trip.remainingBalance)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
