import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { openWhatsApp } from "@/lib/openExternal";
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
    const message =
      `*NG Travels Official Payment Receipt*\n` +
      `Receipt No: REC-${payment.id}\n` +
      `Booking ID: ${trip.bookingId}\n` +
      `Customer: ${trip.customerName}\n` +
      `Amount Paid: ₹${payment.amount}\n` +
      `Payment Method: ${payment.method} (${payment.paymentType || "Payment"})\n` +
      `Reference / TXN: ${payment.reference || "N/A"}\n` +
      `Remaining Trip Balance: ₹${trip.remainingBalance}\n\n` +
      `Received with thanks!\n${companyInfo.company}`;
    openWhatsApp(trip.customerMobile, message);
  };

  const paymentDateStr = new Date(payment.paymentDate || payment.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background text-foreground border-border p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between flex-wrap gap-2 pl-6 pr-12 py-4 border-b border-border bg-card/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="NG Travels" className="w-7 h-7 rounded-md object-contain bg-black border border-amber-300 dark:border-amber-500/30 p-0.5" />
            <span className="font-bold text-foreground">Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handlePrint} className="border-border hover:bg-muted text-xs">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
            <Button size="sm" onClick={handleWhatsApp} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm bg-background">
          <div className="text-center pb-4 border-b border-border">
            <img src="/logo.png" alt="NG Travels" className="w-16 h-16 rounded-xl object-contain bg-black border border-amber-300 dark:border-amber-500/30 p-1 mx-auto mb-2 shadow-lg" />
            <h3 className="font-bold text-lg text-foreground">{companyInfo.company}</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Travel with Comfort & Safety</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Payment Acknowledgment Slip</p>
            <div className="mt-3 text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {formatINR(payment.amount)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
              Paid via {payment.method} ({payment.paymentType || "Payment"})
            </div>
          </div>

          <div className="space-y-3 bg-card/60 p-4 rounded-lg border border-border text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt ID:</span>
              <span className="font-mono text-foreground">REC-{payment.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="text-foreground">{paymentDateStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Booking Ref:</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{trip.bookingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span className="text-foreground font-medium">{trip.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction Ref:</span>
              <span className="font-mono text-foreground">{payment.reference || "N/A"}</span>
            </div>
            {payment.notes && (
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Notes:</span>
                <span className="text-foreground italic">{payment.notes}</span>
              </div>
            )}
          </div>

          <div className="bg-amber-950/20 border border-amber-300 dark:border-amber-500/20 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex justify-between text-foreground">
              <span>Total Trip Fare:</span>
              <span className="font-medium">{formatINR(trip.customerTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
              <span>Cumulative Paid:</span>
              <span>{formatINR(trip.totalPaid)}</span>
            </div>
            <div className="flex justify-between text-amber-700 dark:text-amber-300 font-bold border-t border-amber-300 dark:border-amber-500/20 pt-1.5 text-sm">
              <span>Outstanding Balance:</span>
              <span>{formatINR(trip.remainingBalance)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
