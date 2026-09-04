import React, { useState } from "react";
import { FileQuestion, Plus, Search, Phone, Mail, MapPin, Calendar, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/fareEngine";

interface EnquiriesPageProps {
  enquiries: any[];
  onOpenCreateEnquiry?: () => void;
  onConvertToTrip?: (enquiry: any) => void;
}

export const EnquiriesPage: React.FC<EnquiriesPageProps> = ({
  enquiries = [],
  onOpenCreateEnquiry,
  onConvertToTrip,
}) => {
  const [search, setSearch] = useState("");

  const enquiryList = Array.isArray(enquiries) ? enquiries : (Array.isArray((enquiries as any)?.items) ? (enquiries as any).items : []);

  const filtered = enquiryList.filter((e: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.customerName?.toLowerCase().includes(q) ||
      e.customerMobile?.includes(q) ||
      e.enquiryCode?.toLowerCase().includes(q) ||
      e.pickup?.toLowerCase().includes(q) ||
      e.destination?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-amber-400" />
            Customer Enquiries & Quotations Pipeline
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Track prospective client quotes, travel requirements, and convert enquiries directly into confirmed bookings.
          </p>
        </div>
        {onOpenCreateEnquiry && (
          <Button
            size="sm"
            onClick={onOpenCreateEnquiry}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-400/20"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Enquiry
          </Button>
        )}
      </div>

      <div className="relative bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-500 absolute left-7 top-6.5" />
        <Input
          placeholder="Search enquiries by client name, mobile, destination or quote ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border-zinc-800 pl-10 text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((enq: any) => (
          <div
            key={enq.id}
            className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[11px] text-amber-400 font-bold">{enq.enquiryCode}</span>
                <h3 className="font-bold text-base text-zinc-100 mt-0.5">{enq.customerName}</h3>
                <span className="text-xs text-zinc-400">{enq.customerMobile}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                enq.status === "converted" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                enq.status === "quoted" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                enq.status === "lost" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                "bg-sky-500/20 text-sky-300 border border-sky-500/30"
              }`}>
                {enq.status}
              </span>
            </div>

            <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80 space-y-1.5 text-xs">
              <div className="text-zinc-300 font-medium">
                Route: {enq.pickup} ➔ {enq.destination}
              </div>
              <div className="text-zinc-500">
                Date: {enq.startDate} • {enq.passengerCount} Pax • {(enq.tripType || "").replaceAll("_", " ")}
              </div>
              {enq.notes && <div className="text-zinc-400 italic pt-1 text-[11px]">Note: {enq.notes}</div>}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] block">Quoted Fare</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {enq.quotedFare ? formatINR(enq.quotedFare) : "Pending Quote"}
                </span>
              </div>

              {enq.status !== "converted" && onConvertToTrip && (
                <Button
                  size="sm"
                  onClick={() => onConvertToTrip(enq)}
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs"
                >
                  Convert to Booking <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
