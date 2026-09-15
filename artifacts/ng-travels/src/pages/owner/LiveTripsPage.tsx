import React, { useState } from "react";
import { Link } from "wouter";
import {
  Radio, Navigation, Clock, User, Phone, MapPin, Gauge, Fuel,
  ArrowUpRight, Car, ShieldCheck, CheckCircle2, RefreshCw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { RealtimeFleetMap } from "@/components/maps/RealtimeFleetMap";
import { NGTravelsLoader } from "@/components/loading";

interface LiveTripsPageProps {
  trips: any[];
  isLoading?: boolean;
}

export const LiveTripsPage: React.FC<LiveTripsPageProps> = ({ trips = [], isLoading = false }) => {
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
          <h1 className="text-xl font-black text-foreground flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            Live Fleet Operations & Real-Time GPS Radar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time live telemetry, vehicle coordinates, journey milestones, and speed tracking across active runs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-card border border-border px-3 py-1.5 rounded-xl text-foreground font-mono font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {activeRuns.length} Journey(s) Live
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Active Fleet List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Ongoing Journeys ({activeRuns.length})</span>
            <span className="text-[10px] text-muted-foreground font-mono">Tap to focus map</span>
          </div>

          {isLoading && tripList.length === 0 ? (
            <div className="bg-card/60 p-8 flex justify-center rounded-2xl border border-border">
              <NGTravelsLoader size="sm" text="Loading live fleet..." />
            </div>
          ) : activeRuns.length === 0 ? (
            <div className="bg-card/60 p-8 rounded-2xl border border-border text-center space-y-2">
              <Car className="w-8 h-8 text-muted-foreground mx-auto" />
              <div className="text-xs font-bold text-muted-foreground">No active vehicles on road</div>
              <p className="text-[11px] text-muted-foreground">Dispatched trips will automatically appear here once started.</p>
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
                        : "bg-card/80 border-border hover:border-border hover:bg-card"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-700 dark:text-amber-400">{trip.bookingId}</span>
                        <div className="text-xs font-bold text-foreground mt-0.5">
                          {getRouteText(trip)}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 uppercase animate-pulse">
                        {trip.status?.replaceAll("_", " ")}
                      </span>
                    </div>

                    {/* Driver & Passenger */}
                    <div className="grid grid-cols-2 gap-2 bg-background/80 p-2.5 rounded-xl border border-border/80 text-[11px]">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">Driver</span>
                        <div className="font-semibold text-foreground truncate">{trip.driverName || "Assigned"}</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">Passenger</span>
                        <div className="font-semibold text-foreground truncate">{trip.customerName || "Corporate Passenger"}</div>
                      </div>
                    </div>

                    {/* Odometer & Fare */}
                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <span className="text-muted-foreground text-[11px]">{trip.billingKm} KM Billing</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(trip.customerTotal)}</span>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Link href={`/trips/${trip.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-amber-700 dark:text-amber-400 hover:bg-amber-950/30 p-2">
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
            <div className="h-[580px] bg-card/60 rounded-2xl border border-border flex items-center justify-center text-muted-foreground text-xs">
              Select a trip to load live GPS radar tracking.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
