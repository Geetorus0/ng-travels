import React, { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Navigation, MapPin, User, Phone, Calendar, Clock, CircleDollarSign,
  Receipt, Fuel, Gauge, ShieldCheck, CheckCircle2, XCircle, Share2, Printer, Plus,
  FileText, ArrowUpRight, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { RealtimeFleetMap } from "@/components/maps/RealtimeFleetMap";

interface TripDetailPageProps {
  trip: any;
  payments?: any[];
  expenses?: any[];
  onOpenCustomerCopy: (trip: any) => void;
  onOpenPaymentModal: (trip: any) => void;
  onOpenCancelModal: (trip: any) => void;
  onApproveExpense?: (expenseId: number) => void;
  onRejectExpense?: (expenseId: number) => void;
  onStatusChange?: (newStatus: string) => void;
}

export const TripDetailPage: React.FC<TripDetailPageProps> = ({
  trip,
  payments = [],
  expenses = [],
  onOpenCustomerCopy,
  onOpenPaymentModal,
  onOpenCancelModal,
  onApproveExpense,
  onRejectExpense,
  onStatusChange,
}) => {
  if (!trip) {
    return (
      <div className="p-8 text-center bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-3">
        <Navigation className="w-10 h-10 text-zinc-600 mx-auto" />
        <h2 className="text-base font-bold text-zinc-200">Trip Not Found</h2>
        <p className="text-xs text-zinc-400">The requested trip could not be found or has been removed.</p>
        <Link href="/trips">
          <Button size="sm" className="bg-amber-400 text-zinc-950 font-bold text-xs mt-2">
            Back to Trips
          </Button>
        </Link>
      </div>
    );
  }

  const startDateStr = new Date(trip.startDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/trips">
            <Button size="sm" variant="outline" className="border-zinc-800 h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-amber-400">{trip.bookingId}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                trip.status === "completed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                trip.status === "in_progress" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse" :
                trip.status === "cancelled" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                "bg-zinc-800 text-zinc-300"
              }`}>
                {trip.status?.replaceAll("_", " ")}
              </span>
              {trip.isLocked && (
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                  LOCKED
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {startDateStr} at {trip.startTime} • {(trip.tripType || "").replaceAll("_", " ").toUpperCase()}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenCustomerCopy(trip)}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-950/30 text-xs font-semibold"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Customer Copy
          </Button>
          {Number(trip.remainingBalance) > 0 && (
            <Button
              size="sm"
              onClick={() => onOpenPaymentModal(trip)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Receipt className="w-3.5 h-3.5 mr-1.5" /> Record Payment
            </Button>
          )}
          {trip.status !== "cancelled" && trip.status !== "completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenCancelModal(trip)}
              className="border-rose-500/40 text-rose-400 hover:bg-rose-950/30 text-xs font-semibold"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Trip
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Financial Card + Route Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route & Passenger Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Itinerary & Milestones */}
          <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" /> Route & Itinerary
            </h2>

            <div className="space-y-3 pl-2 border-l-2 border-amber-500/40 ml-2">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Pickup Location</span>
                <div className="text-sm font-semibold text-zinc-100">{trip.pickup?.name || trip.pickup?.address || "Pickup Location"}</div>
                {trip.pickup?.address && trip.pickup?.name && <div className="text-xs text-zinc-400">{trip.pickup?.address}</div>}
              </div>

              {Array.isArray(trip.stops) && trip.stops.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Waypoints & Stops</span>
                  {trip.stops.map((s: any, idx: number) => (
                    <div key={idx} className="text-xs text-zinc-300 mt-0.5">
                      • {s.name || s.address} {s.address && s.name ? `(${s.address})` : ""}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <span className="text-[10px] font-bold text-rose-400 uppercase">Destination Location</span>
                <div className="text-sm font-semibold text-zinc-100">{trip.destination?.name || trip.destination?.address || "Destination"}</div>
                {trip.destination?.address && trip.destination?.name && <div className="text-xs text-zinc-400">{trip.destination?.address}</div>}
              </div>
            </div>

            {/* Interactive Live Route Map */}
            <div className="pt-2">
              <RealtimeFleetMap
                pickup={trip.pickup || { name: "Pickup" }}
                destination={trip.destination || { name: "Destination" }}
                stops={trip.stops || []}
                activeTrip={trip}
                billingKm={Number(trip.billingKm || 0)}
                estimatedToll={Number(trip.finalToll || trip.estimatedToll || 0)}
                height="380px"
              />
            </div>

            {trip.selectedRouteSummary && (
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Selected Route: <strong>{trip.selectedRouteSummary}</strong></span>
              </div>
            )}
          </div>

          {/* Driver & Odometer Operations */}
          <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-amber-400" /> Driver & Odometer KM Tracking
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] block">Assigned Driver</span>
                <span className="font-bold text-zinc-200">{trip.driverName || "Unassigned"}</span>
                <span className="text-zinc-400 block text-[11px]">{trip.driverMobile || "No phone"}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Starting KM</span>
                <span className="font-mono font-bold text-zinc-100 text-sm">
                  {trip.startingKm ? `${trip.startingKm} km` : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Ending KM</span>
                <span className="font-mono font-bold text-zinc-100 text-sm">
                  {trip.endingKm ? `${trip.endingKm} km` : "Pending"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Actual KM Clocked</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {trip.actualKm ? `${trip.actualKm} km` : "In Progress"}
                </span>
              </div>
            </div>
          </div>

          {/* Payments Ledger for this Trip */}
          <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" /> Payment Ledger ({payments.length})
              </h2>
              {Number(trip.remainingBalance) > 0 && (
                <Button size="sm" onClick={() => onOpenPaymentModal(trip)} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Plus className="w-3 h-3 mr-1" /> Add Payment
                </Button>
              )}
            </div>

            {payments.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">No payment entries recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-emerald-400 font-mono text-sm">{formatINR(p.amount)}</span>
                      <span className="text-zinc-400 ml-2">via {p.method} ({p.paymentType})</span>
                      {p.reference && <div className="text-[11px] text-zinc-500 font-mono mt-0.5">Ref: {p.reference}</div>}
                    </div>
                    <div className="text-right text-zinc-400 text-[11px]">
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Expenses for this Trip */}
          <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-3">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Fuel className="w-4 h-4 text-rose-400" /> Operational Expenses ({expenses.length})
            </h2>

            {expenses.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3 text-center">No expenses submitted for this trip.</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div key={exp.id} className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-400 font-mono">{formatINR(exp.amount)}</span>
                        <span className="font-semibold text-zinc-200">• {exp.category}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded capitalize ${
                          exp.status === "approved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          exp.status === "rejected" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                        }`}>
                          {exp.status}
                        </span>
                      </div>
                      {exp.notes && <p className="text-[11px] text-zinc-400">{exp.notes}</p>}
                    </div>

                    {exp.status === "pending" && onApproveExpense && onRejectExpense && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => onApproveExpense(exp.id)}
                          className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRejectExpense(exp.id)}
                          className="h-7 px-2 text-[11px] text-rose-400 hover:bg-rose-950/30"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Financial Breakdown Sidebar */}
        <div className="space-y-6">
          {/* Central Financial Summary Card */}
          <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-xl">
            <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Central Fare & Financial Summary
            </h2>

            <div className="space-y-2 text-xs divide-y divide-zinc-800/60">
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Google Map Distance</span>
                <span className="font-mono text-zinc-300">{trip.mapDistanceKm} km</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Billing Distance</span>
                <span className="font-mono font-bold text-zinc-200">{trip.billingKm} km</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Rate Per KM</span>
                <span className="font-mono text-zinc-300">₹{trip.ratePerKm}/km</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-300 font-medium">Base Vehicle Fare</span>
                <span className="font-mono font-medium text-zinc-200">{formatINR(trip.baseFare)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Customer Toll</span>
                <span className="font-mono text-zinc-300">{formatINR(trip.toll)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">Customer Parking</span>
                <span className="font-mono text-zinc-300">{formatINR(trip.parking)}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-400">State Permit Charges</span>
                <span className="font-mono text-zinc-300">{formatINR(trip.permitCharge)}</span>
              </div>

              {/* Customer Total */}
              <div className="flex justify-between pt-3 pb-1 border-t-2 border-zinc-800">
                <span className="font-bold text-zinc-100 text-sm">Customer Total</span>
                <span className="font-mono font-bold text-amber-400 text-lg">{formatINR(trip.customerTotal)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-400">
                <span>Advance / Total Paid</span>
                <span className="font-mono font-semibold">-{formatINR(trip.totalPaid)}</span>
              </div>
              <div className="flex justify-between py-2 bg-amber-950/30 p-2.5 rounded-lg border border-amber-500/20 text-sm font-bold text-amber-300">
                <span>Outstanding Balance</span>
                <span className="font-mono">{formatINR(trip.remainingBalance)}</span>
              </div>
            </div>

            {/* Profit Calculation (Owner only) */}
            <div className="pt-3 border-t border-zinc-800 text-xs space-y-1.5 bg-zinc-950/60 p-3 rounded-lg">
              <div className="flex justify-between text-zinc-400 text-[11px]">
                <span>Approved Company Expenses:</span>
                <span className="font-mono text-rose-400">{formatINR(trip.expenseTotal || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-400">
                <span>Trip Operating Profit:</span>
                <span className="font-mono">
                  {formatINR(Number(trip.customerTotal) - Number(trip.expenseTotal || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Passenger Information */}
          <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-3 text-xs">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Passenger Contact</h3>
            <div className="font-semibold text-sm text-zinc-100">{trip.customerName}</div>
            <div className="text-zinc-400">{trip.customerMobile}</div>
            <div className="pt-2">
              <a
                href={`https://wa.me/${(trip.customerMobile || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                  <Phone className="w-3.5 h-3.5 mr-1.5" /> WhatsApp Passenger
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
