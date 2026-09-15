import React, { useState } from "react";
import { CircleDollarSign, Search, Receipt, ArrowUpRight, CheckCircle2, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/fareEngine";
import { NGTravelsLoader } from "@/components/loading";

interface PaymentsPageProps {
  payments: any[];
  trips: any[];
  isLoading?: boolean;
  onOpenReceipt?: (payment: any, trip: any) => void;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({
  payments = [],
  trips = [],
  isLoading = false,
  onOpenReceipt,
}) => {
  const [search, setSearch] = useState("");

  const paymentList = Array.isArray(payments) ? payments : (Array.isArray((payments as any)?.items) ? (payments as any).items : []);
  const tripList = Array.isArray(trips) ? trips : (Array.isArray((trips as any)?.items) ? (trips as any).items : []);

  const totalCollected = paymentList.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const filtered = paymentList.filter((p: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const trip = tripList.find((t: any) => t.id === p.tripId);
    return (
      p.method?.toLowerCase().includes(q) ||
      p.paymentType?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      trip?.bookingId?.toLowerCase().includes(q) ||
      trip?.customerName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            Financial Payment Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Complete transaction record of advance payments, partial milestones, and final fare settlements.
          </p>
        </div>
        <div className="bg-card border border-border px-4 py-2 rounded-xl text-right">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Revenue Collected</span>
          <span className="text-xl font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatINR(totalCollected)}</span>
        </div>
      </div>

      <div className="relative bg-card/60 p-4 rounded-xl border border-border">
        <Search className="w-4 h-4 text-muted-foreground absolute left-7 top-6.5" />
        <Input
          placeholder="Search by Payment Method, Reference, Booking ID or Customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card border-border pl-10 text-xs"
        />
      </div>

      <div className="bg-card/80 border border-border rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Receipt #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Method & Type</th>
                <th className="py-3.5 px-4">TXN Reference</th>
                <th className="py-3.5 px-4 text-right">Amount Paid</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading && paymentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12">
                    <div className="flex justify-center">
                      <NGTravelsLoader size="sm" text="Loading payments..." />
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => {
                  const trip = tripList.find((t: any) => t.id === p.tripId);
                  const dateStr = new Date(p.paymentDate || p.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  const pType = String(p.paymentType || "advance").toLowerCase();
                  const pTypeBadge =
                    pType === "full"
                      ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30"
                      : pType === "balance"
                      ? "bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-500/30"
                      : pType === "advance"
                      ? "bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/30"
                      : "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/30";

                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        REC-{p.id}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">{dateStr}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {trip?.bookingId || `Trip #${p.tripId}`}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {trip?.customerName || "Customer"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-foreground font-medium">{p.method}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${pTypeBadge}`}>
                            {pType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                        {p.reference || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400 text-sm whitespace-nowrap">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {onOpenReceipt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenReceipt(p, trip)}
                            className="h-7 text-xs border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 hover:dark:bg-amber-500/10 hover:border-amber-300 hover:dark:border-amber-500/50 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 mr-1" /> Slip
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
