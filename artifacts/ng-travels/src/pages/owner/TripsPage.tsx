import React, { useState } from "react";
import { Link } from "wouter";
import {
  Navigation, Search, Filter, Plus, Eye, Receipt, FileText, XCircle,
  CheckCircle2, ArrowUpRight, Calendar, User, Phone, MapPin, Gauge,
  Clock, IndianRupee, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/fareEngine";

interface TripsPageProps {
  trips: any[];
  onOpenCreateTrip: () => void;
  onOpenCustomerCopy: (trip: any) => void;
  onOpenPaymentModal: (trip: any) => void;
  onOpenCancelModal: (trip: any) => void;
}

export const TripsPage: React.FC<TripsPageProps> = ({
  trips = [],
  onOpenCreateTrip,
  onOpenCustomerCopy,
  onOpenPaymentModal,
  onOpenCancelModal,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const tripList = Array.isArray(trips) ? trips : (Array.isArray((trips as any)?.items) ? (trips as any).items : []);

  const getRouteText = (trip: any) => {
    const p = trip.pickup?.name || trip.pickup?.address || (typeof trip.pickup === "string" ? trip.pickup : "Pickup");
    const d = trip.destination?.name || trip.destination?.address || (typeof trip.destination === "string" ? trip.destination : "Destination");
    return `${p} ➔ ${d}`;
  };

  const filteredTrips = tripList.filter((trip: any) => {
    if (statusFilter !== "all" && trip.status !== statusFilter) return false;
    if (search.trim() !== "") {
      const q = search.toLowerCase();
      const pText = (trip.pickup?.name || trip.pickup?.address || "").toLowerCase();
      const dText = (trip.destination?.name || trip.destination?.address || "").toLowerCase();
      return (
        trip.bookingId?.toLowerCase().includes(q) ||
        trip.customerName?.toLowerCase().includes(q) ||
        trip.customerMobile?.includes(q) ||
        trip.driverName?.toLowerCase().includes(q) ||
        pText.includes(q) ||
        dText.includes(q)
      );
    }
    return true;
  });

  const renderStatusBadge = (status: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed") {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</span>;
    }
    if (s === "in_progress") {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">In Progress</span>;
    }
    if (s === "started" || s === "reached_pickup" || s === "customer_picked_up") {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">{s.replaceAll("_", " ")}</span>;
    }
    if (s === "cancelled") {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">Cancelled</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400">{s.replaceAll("_", " ")}</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-zinc-100 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-400" />
            Trip Operations Management
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Dispatch fleet bookings, inspect fare breakdowns, record multi-payments, and monitor driver runs.
          </p>
        </div>
        <Button
          size="sm"
          onClick={onOpenCreateTrip}
          className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-9 shadow-lg shadow-amber-400/20 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> New Trip Booking
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 bg-zinc-900/60 p-3 sm:p-4 rounded-xl border border-zinc-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <Input
            placeholder="Search Booking ID, Customer, Driver, Place..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-900 border-zinc-800 pl-9 text-xs h-9 w-full"
          />
        </div>
        <div className="w-full sm:w-52">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-9">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
              <SelectItem value="all">All Statuses ({trips.length})</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="started">Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* MOBILE TRIP CARDS (< lg screens) */}
      <div className="block lg:hidden space-y-3">
        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/60 rounded-xl border border-zinc-800 text-zinc-500 text-xs">
            No trips match your criteria.
          </div>
        ) : (
          filteredTrips.map((trip: any) => {
            const startDateStr = new Date(trip.startDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            });
            const hasBalance = Number(trip.remainingBalance || 0) > 0;
            return (
              <div key={trip.id} className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3 shadow-md">
                {/* Header Row: Booking ID + Status + Schedule */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/trips/${trip.id}`} className="font-mono font-black text-amber-400 text-sm hover:underline">
                      {trip.bookingId}
                    </Link>
                    {renderStatusBadge(trip.status)}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {startDateStr} • {trip.startTime}
                  </div>
                </div>

                {/* Route */}
                <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/80 space-y-1">
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{getRouteText(trip)}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 pl-5 flex items-center gap-2">
                    <span>{trip.billingKm} km</span>
                    <span>•</span>
                    <span>₹{trip.ratePerKm}/km</span>
                    <span>•</span>
                    <span className="capitalize">{trip.tripType || "Single"}</span>
                  </div>
                </div>

                {/* Customer & Driver Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Customer</span>
                    <div className="font-semibold text-zinc-200 truncate">{trip.customerName}</div>
                    <div className="text-[10px] text-zinc-400">{trip.customerMobile}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Driver</span>
                    <div className="font-semibold text-zinc-200 truncate">{trip.driverName || "Unassigned"}</div>
                    <div className="text-[10px] text-zinc-400">{trip.driverMobile || "-"}</div>
                  </div>
                </div>

                {/* Financial Breakdown Bar */}
                <div className="flex items-center justify-between bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase">Total</span>
                    <span className="font-bold text-zinc-100">{formatINR(trip.customerTotal)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-emerald-500 block uppercase">Paid</span>
                    <span className="font-bold text-emerald-400">{formatINR(trip.totalPaid)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-amber-400 block uppercase">Balance</span>
                    <span className={`font-bold ${hasBalance ? "text-amber-300" : "text-zinc-500"}`}>
                      {formatINR(trip.remainingBalance)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Link href={`/trips/${trip.id}`} className="w-full">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8 border-zinc-700 hover:border-zinc-600">
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenCustomerCopy(trip)}
                    className="w-full text-xs h-8 border-amber-500/40 text-amber-300 hover:bg-amber-950/30"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Voucher
                  </Button>

                  {hasBalance ? (
                    <Button
                      size="sm"
                      onClick={() => onOpenPaymentModal(trip)}
                      className="w-full text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold"
                    >
                      <Receipt className="w-3.5 h-3.5 mr-1" /> Pay
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      className="w-full text-xs h-8 text-emerald-400 opacity-80"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Cleared
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP DATA TABLE (lg+ screens) */}
      <div className="hidden lg:block bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Booking ID</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Route & KM</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4 text-right">Total Fare</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-500">
                    No trips match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip: any) => {
                  const startDateStr = new Date(trip.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <tr key={trip.id} className="hover:bg-zinc-800/40 transition-all">
                      {/* Booking ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        <Link href={`/trips/${trip.id}`} className="hover:underline">
                          {trip.bookingId}
                        </Link>
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4 text-zinc-300">
                        <div>{startDateStr}</div>
                        <div className="text-[11px] text-zinc-500">{trip.startTime}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-200">{trip.customerName}</div>
                        <div className="text-[11px] text-zinc-500">{trip.customerMobile}</div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-medium text-zinc-200 truncate">
                          {getRouteText(trip)}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {trip.billingKm} km • ₹{trip.ratePerKm}/km
                        </div>
                      </td>

                      {/* Driver */}
                      <td className="py-3.5 px-4 text-zinc-300">
                        <div className="font-medium">{trip.driverName || "Unassigned"}</div>
                        <div className="text-[11px] text-zinc-500">{trip.driverMobile || "-"}</div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                        {formatINR(trip.customerTotal)}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-emerald-400">
                        {formatINR(trip.totalPaid)}
                      </td>

                      {/* Balance */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={Number(trip.remainingBalance) > 0 ? "text-amber-300" : "text-zinc-500"}>
                          {formatINR(trip.remainingBalance)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(trip.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/trips/${trip.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 cursor-pointer">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenCustomerCopy(trip)}
                            className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-950/30 cursor-pointer"
                            title="Customer Booking Copy"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                          {Number(trip.remainingBalance) > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenPaymentModal(trip)}
                              className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-950/30 cursor-pointer"
                              title="Record Payment"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {trip.status !== "cancelled" && trip.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenCancelModal(trip)}
                              className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-950/30 cursor-pointer"
                              title="Cancel Trip"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
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
