import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR, formatKM } from "@/lib/fareEngine";
import { Printer, Download, Share2, MapPin, Calendar, Clock, User, Phone, CheckCircle2, X } from "lucide-react";

export interface CustomerCopyProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  companyInfo?: {
    company: string;
    mobile: string;
    email: string;
    terms?: string;
  };
}

export const CustomerCopyModal: React.FC<CustomerCopyProps> = ({
  isOpen,
  onClose,
  trip,
  companyInfo = {
    company: "NG Travels Operations",
    mobile: "+91 98450 21867",
    email: "operations@ngtravels.in",
    terms: "1. Toll & parking charges at actuals.\n2. Billing starts and ends garage to garage.",
  },
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!trip) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const pickup = trip.pickup?.name || "Pickup";
    const dest = trip.destination?.name || "Destination";
    const date = new Date(trip.startDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const message = encodeURIComponent(
      `*NG Travels Booking Confirmation*\n` +
      `Booking ID: ${trip.bookingId}\n` +
      `Customer: ${trip.customerName}\n` +
      `Route: ${pickup} ➔ ${dest}\n` +
      `Date & Time: ${date} at ${trip.startTime}\n` +
      `Billing KM: ${trip.billingKm} km @ ₹${trip.ratePerKm}/km\n` +
      `Total Estimated Fare: ₹${trip.customerTotal}\n` +
      `Advance Paid: ₹${trip.totalPaid}\n` +
      `Balance Due: ₹${trip.remainingBalance}\n\n` +
      `Thank you for travelling with ${companyInfo.company}!\nHelpdesk: ${companyInfo.mobile}`
    );
    window.open(`https://wa.me/${(trip.customerMobile || "").replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const formattedDate = new Date(trip.startDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-zinc-950 text-zinc-100 border-zinc-800 p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="NG Travels" className="w-8 h-8 rounded-lg object-contain bg-black border border-amber-500/30 p-0.5" />
            <div>
              <span className="text-amber-400 font-bold text-base tracking-wider block">NG TRAVELS</span>
              <span className="text-[10px] text-zinc-400 block -mt-1">Travel with Comfort & Safety</span>
            </div>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-medium px-2 py-0.5 rounded border border-amber-500/30 ml-1">
              CUSTOMER COPY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="border-zinc-700 hover:bg-zinc-800 text-xs">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
            </Button>
            <Button size="sm" onClick={handleWhatsApp} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div ref={printRef} className="p-6 overflow-y-auto space-y-6 text-sm bg-zinc-950">
          {/* Company & Booking Info Header */}
          <div className="flex justify-between items-start pb-4 border-b border-zinc-800 gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="NG Travels" className="w-14 h-14 rounded-xl object-contain bg-black border border-amber-500/30 p-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-zinc-100">{companyInfo.company}</h2>
                <p className="text-xs text-amber-400/90 font-medium mt-0.5">Travel with Comfort & Safety</p>
                <p className="text-xs text-zinc-400 mt-0.5">Phone: {companyInfo.mobile} | Email: {companyInfo.email}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400 uppercase tracking-wider">Booking Reference</div>
              <div className="text-lg font-mono font-bold text-amber-400">{trip.bookingId}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{formattedDate} • {trip.startTime}</div>
            </div>
          </div>

          {/* Customer & Route Details */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-900/60 p-4 rounded-lg border border-zinc-800">
            <div>
              <div className="text-xs text-zinc-400 uppercase font-semibold mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Passenger Details
              </div>
              <div className="font-semibold text-zinc-200">{trip.customerName}</div>
              <div className="text-zinc-400 text-xs mt-0.5">{trip.customerMobile}</div>
              <div className="text-zinc-400 text-xs mt-1">Passengers: {trip.passengerCount || 1} Person(s)</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 uppercase font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Trip Type & Schedule
              </div>
              <div className="font-semibold text-zinc-200 capitalize">{(trip.tripType || "").replaceAll("_", " ")}</div>
              <div className="text-zinc-400 text-xs mt-0.5">Pickup Time: {trip.startTime}</div>
              {trip.returnDate && (
                <div className="text-zinc-400 text-xs mt-0.5">Return: {new Date(trip.returnDate).toLocaleDateString("en-IN")} {trip.returnTime || ""}</div>
              )}
            </div>
          </div>

          {/* Route Itinerary */}
          <div className="bg-zinc-900/60 p-4 rounded-lg border border-zinc-800 space-y-3">
            <div className="text-xs text-zinc-400 uppercase font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Route & Itinerary
            </div>
            <div className="space-y-2 pl-2 border-l-2 border-amber-500/40 ml-1.5">
              <div>
                <div className="text-xs text-emerald-400 font-semibold">PICKUP LOCATION</div>
                <div className="text-zinc-200 font-medium">{trip.pickup?.name}</div>
                <div className="text-xs text-zinc-400">{trip.pickup?.address}</div>
              </div>
              {Array.isArray(trip.stops) && trip.stops.length > 0 && (
                <div className="pt-1">
                  <div className="text-xs text-amber-400 font-semibold">STOPS EN ROUTE</div>
                  {trip.stops.map((stop: any, idx: number) => (
                    <div key={idx} className="text-xs text-zinc-300 mt-0.5">
                      • {stop.name} {stop.address ? `(${stop.address})` : ""}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-1">
                <div className="text-xs text-rose-400 font-semibold">DESTINATION</div>
                <div className="text-zinc-200 font-medium">{trip.destination?.name}</div>
                <div className="text-xs text-zinc-400">{trip.destination?.address}</div>
              </div>
            </div>
          </div>

          {/* Fare Breakdown (Clean Customer View) */}
          <div>
            <div className="text-xs text-zinc-400 uppercase font-semibold mb-2">Fare Breakdown & Billing</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="text-left py-2">Item Description</th>
                  <th className="text-right py-2">Units / Rate</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                <tr>
                  <td className="py-2.5 text-zinc-200 font-medium">Base Vehicle Fare</td>
                  <td className="text-right text-zinc-400">{trip.billingKm} km × ₹{trip.ratePerKm}/km</td>
                  <td className="text-right font-medium text-zinc-200">{formatINR(trip.baseFare)}</td>
                </tr>
                {Number(trip.toll || 0) > 0 && (
                  <tr>
                    <td className="py-2 text-zinc-300">Highway Toll Charges</td>
                    <td className="text-right text-zinc-400">At actuals</td>
                    <td className="text-right text-zinc-200">{formatINR(trip.toll)}</td>
                  </tr>
                )}
                {Number(trip.parking || 0) > 0 && (
                  <tr>
                    <td className="py-2 text-zinc-300">Parking & Entry Fees</td>
                    <td className="text-right text-zinc-400">At actuals</td>
                    <td className="text-right text-zinc-200">{formatINR(trip.parking)}</td>
                  </tr>
                )}
                {Number(trip.permitCharge || 0) > 0 && (
                  <tr>
                    <td className="py-2 text-zinc-300">State Permit / Entry Charges</td>
                    <td className="text-right text-zinc-400">Approved Permit</td>
                    <td className="text-right text-zinc-200">{formatINR(trip.permitCharge)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-800">
                  <td colSpan={2} className="py-2.5 font-bold text-zinc-100 text-sm">Customer Total Estimated Fare</td>
                  <td className="text-right font-bold text-amber-400 text-sm">{formatINR(trip.customerTotal)}</td>
                </tr>
                <tr className="border-b border-zinc-800/60">
                  <td colSpan={2} className="py-2 text-emerald-400 font-medium">Advance / Paid Amount</td>
                  <td className="text-right font-medium text-emerald-400">-{formatINR(trip.totalPaid)}</td>
                </tr>
                <tr className="bg-amber-950/20 font-bold">
                  <td colSpan={2} className="py-2.5 text-amber-300 text-sm pl-2">Balance Due at Trip Completion</td>
                  <td className="text-right font-bold text-amber-300 text-sm pr-2">{formatINR(trip.remainingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terms and Signoff */}
          <div className="pt-2 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-1">
            <div className="font-semibold text-zinc-300">Terms & Conditions:</div>
            <p className="whitespace-pre-line text-zinc-400">{companyInfo.terms}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
