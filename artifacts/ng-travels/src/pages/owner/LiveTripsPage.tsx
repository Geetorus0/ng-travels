import React, { useState } from "react";
import { Link } from "wouter";
import {
  Radio, Navigation, Clock, User, Phone, MapPin, Gauge, Fuel,
  ArrowUpRight, Car, ShieldCheck, CheckCircle2, RefreshCw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { RealtimeFleetMap } from "@/components/maps/RealtimeFleetMap";

interface LiveTripsPageProps {
  trips: any[];
}

export const LiveTripsPage: React.FC<LiveTripsPageProps> = ({ trips = [] }) => {
  const tripList = Array.isArray(trips) ? trips : (Array.isArray((trips as any)?.items) ? (trips as any).items : []);

  const activeRuns = tripList.filter((t: any) =>
    ["started", "reached_pickup", "customer_picked_up", "in_progress"].includes(t.status)
  );

  const [selectedTripId, setSelectedTripId] = useState<number | null>(
    activeRuns[0]?.id || (tripList[0]?.id ?? null)
  );

  const selectedTrip = tripList.find((t: any) => t.id === selectedTripId) || tripList[0] || null;

  const getRouteText = (trip: any) => {
    const p = trip.pickup?.name || trip.pickup?.address || (typeof trip.pickup === "string" ? trip.pickup : "Pickup");
    const d = trip.destination?.name || trip.destination?.address || (typeof trip.destination === "string" ? trip.destination : "Destination");
    return `${p} ➔ ${d}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-zinc-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            Live Fleet Operations & Real-Time GPS Radar
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time live telemetry, vehicle coordinates, journey milestones, and speed tracking across active runs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-300 font-mono font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {activeRuns.length} Journey(s) Live
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Active Fleet List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Ongoing Journeys ({activeRuns.length})</span>
            <span className="text-[10px] text-zinc-500 font-mono">Tap to focus map</span>
          </div>

          {activeRuns.length === 0 ? (
            <div className="bg-zinc-900/60 p-8 rounded-2xl border border-zinc-800 text-center space-y-2">
              <Car className="w-8 h-8 text-zinc-600 mx-auto" />
              <div className="text-xs font-bold text-zinc-400">No active vehicles on road</div>
              <p className="text-[11px] text-zinc-500">Dispatched trips will automatically appear here once started.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {activeRuns.map((trip: any) => {
                const isSelected = selectedTrip?.id === trip.id;
                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 shadow-md ${
                      isSelected
                        ? "bg-amber-950/20 border-amber-400 ring-1 ring-amber-400/50"
                        : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-400">{trip.bookingId}</span>
                        <div className="text-xs font-bold text-zinc-100 mt-0.5">
                          {getRouteText(trip)}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase animate-pulse">
                        {trip.status?.replaceAll("_", " ")}
                      </span>
                    </div>

                    {/* Driver & Passenger */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 text-[11px]">
                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase block">Driver</span>
                        <div className="font-semibold text-zinc-200 truncate">{trip.driverName || "Assigned"}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase block">Passenger</span>
                        <div className="font-semibold text-zinc-200 truncate">{trip.customerName || "Corporate Passenger"}</div>
                      </div>
                    </div>

                    {/* Odometer & Fare */}
                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <span className="text-zinc-400 text-[11px]">{trip.billingKm} KM Billing</span>
                      <span className="font-bold text-emerald-400">{formatINR(trip.customerTotal)}</span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Link href={`/trips/${trip.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-amber-400 hover:bg-amber-950/30 p-2">
                          View Trip Sheet <Eye className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Live Radar Map */}
        <div className="lg:col-span-7 space-y-4">
          {selectedTrip ? (
            <RealtimeFleetMap
              pickup={selectedTrip.pickup || { name: "Erode" }}
              destination={selectedTrip.destination || { name: "Coimbatore" }}
              stops={selectedTrip.stops || []}
              activeTrip={selectedTrip}
              billingKm={selectedTrip.billingKm || 0}
              estimatedToll={selectedTrip.finalToll || selectedTrip.estimatedToll || 0}
              height="580px"
            />
          ) : (
            <div className="h-[580px] bg-zinc-900/60 rounded-2xl border border-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
              Select a trip to load live GPS radar tracking.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
