import React from "react";
import { Link } from "wouter";
import { Calendar, Navigation, MapPin, User, Clock, ArrowRight, Gauge, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverTodayPageProps {
  todayTrips: any[];
  onOpenStartKmModal: (trip: any) => void;
  onOpenEndKmModal: (trip: any) => void;
}

export const DriverTodayPage: React.FC<DriverTodayPageProps> = ({
  todayTrips = [],
  onOpenStartKmModal,
  onOpenEndKmModal,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          Today's Assigned Schedule
        </h1>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          Step-by-step trips authorized for your shift today.
        </p>
      </div>

      <div className="space-y-3">
        {todayTrips.length === 0 ? (
          <div className="bg-zinc-900/60 p-8 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-xs">
            No trips assigned for today yet.
          </div>
        ) : (
          todayTrips.map((trip) => (
            <div
              key={trip.id}
              className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-[10px] font-bold text-amber-400">{trip.bookingId}</span>
                  <h3 className="font-bold text-sm text-zinc-100 mt-0.5">
                    {trip.pickup?.name || trip.pickup?.address || "Pickup"} ➔ {trip.destination?.name || trip.destination?.address || "Destination"}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  trip.status === "completed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  trip.status === "in_progress" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse" :
                  trip.status === "started" ? "bg-sky-500/20 text-sky-300 border border-sky-500/30" :
                  "bg-zinc-800 text-zinc-400"
                }`}>
                  {trip.status?.replaceAll("_", " ")}
                </span>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                <div className="text-zinc-300">Passenger: <strong>{trip.customerName || "Corporate Passenger"}</strong> ({trip.customerMobile || "-"})</div>
                <div className="text-zinc-400 text-[11px]">Departure Time: {trip.startTime} • {trip.billingKm} km</div>
                {trip.startingKm && (
                  <div className="text-zinc-400 text-[11px] pt-1 border-t border-zinc-800 flex justify-between">
                    <span>Odometer:</span>
                    <span className="font-mono text-zinc-200">{trip.startingKm} km {trip.endingKm ? `➔ ${trip.endingKm} km` : ""}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Link href="/driver/current-trip">
                  <Button size="sm" variant="outline" className="border-zinc-700 text-xs h-9">
                    <Navigation className="w-3.5 h-3.5 mr-1" /> Open Run
                  </Button>
                </Link>

                {trip.status === "upcoming" ? (
                  <Button
                    size="sm"
                    onClick={() => onOpenStartKmModal(trip)}
                    className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-9"
                  >
                    <Gauge className="w-3.5 h-3.5 mr-1" /> Start (KM)
                  </Button>
                ) : trip.status !== "completed" ? (
                  <Button
                    size="sm"
                    onClick={() => onOpenEndKmModal(trip)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete (KM)
                  </Button>
                ) : (
                  <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Finished
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
