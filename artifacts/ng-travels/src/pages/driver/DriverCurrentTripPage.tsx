import React, { useState, useEffect, useRef } from "react";
import {
  Navigation, Phone, MapPin, Gauge, CheckCircle2, Clock, Map,
  ExternalLink, Fuel, AlertCircle, Radio, Compass, Satellite
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { RealtimeFleetMap } from "@/components/maps/RealtimeFleetMap";
import { ButtonLoader } from "@/components/loading";

interface DriverCurrentTripPageProps {
  trip: any;
  onOpenStartKmModal: (trip: any) => void;
  onOpenEndKmModal: (trip: any) => void;
  onOpenExpenseModal: (tripId: number) => void;
  onUpdateMilestone: (tripId: number, status: string, note?: string) => Promise<void>;
}

export const DriverCurrentTripPage: React.FC<DriverCurrentTripPageProps> = ({
  trip,
  onOpenStartKmModal,
  onOpenEndKmModal,
  onOpenExpenseModal,
  onUpdateMilestone,
}) => {
  const [updating, setUpdating] = useState(false);
  const [gpsTelemetry, setGpsTelemetry] = useState<{
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    accuracy: number;
    lastSynced: Date;
  } | null>(null);

  const status = trip?.status || "upcoming";
  const isTracking = ["started", "reached_pickup", "customer_picked_up", "in_progress"].includes(status);

  // Live GPS Tracking Service
  useEffect(() => {
    if (!trip || !isTracking) return;

    let watchId: number | null = null;
    const pLat = trip.pickup?.latitude || 11.3410;
    const pLng = trip.pickup?.longitude || 77.7172;
    const dLat = trip.destination?.latitude || 11.0168;
    const dLng = trip.destination?.longitude || 76.9558;

    const pushLocation = async (lat: number, lng: number, speed: number, heading: number, accuracy: number) => {
      setGpsTelemetry({
        lat,
        lng,
        speed: Math.round(speed),
        heading: Math.round(heading),
        accuracy: Math.round(accuracy),
        lastSynced: new Date(),
      });

      try {
        await fetch(`/api/driver/trips/${trip.id}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            speed: Math.round(speed),
            heading: Math.round(heading),
            accuracy: Math.round(accuracy),
          }),
        });
      } catch (err) {
        console.error("GPS telemetry sync error:", err);
      }
    };

    // Genuine Device Geolocation API tracking
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const speedKmH = pos.coords.speed !== null && pos.coords.speed !== undefined
            ? Math.max(0, Math.round(pos.coords.speed * 3.6))
            : 0;
          pushLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            speedKmH,
            pos.coords.heading || 0,
            pos.coords.accuracy || 10
          );
        },
        (err) => {
          console.warn("[DriverHUD] Geolocation watch notice:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [trip?.id, isTracking]);

  if (!trip) {
    return (
      <div className="bg-zinc-900/60 p-8 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-xs space-y-2">
        <Navigation className="w-8 h-8 text-zinc-600 mx-auto" />
        <p>No active trip currently in progress.</p>
      </div>
    );
  }

  const pickupLat = trip.pickup?.latitude || 11.3410;
  const pickupLng = trip.pickup?.longitude || 77.7172;
  const destLat = trip.destination?.latitude || 11.0168;
  const destLng = trip.destination?.longitude || 76.9558;

  const navigateToPickupUrl = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}&destination_place_id=${trip.pickup?.placeId || ""}`;
  const navigateToDestUrl = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&destination_place_id=${trip.destination?.placeId || ""}`;

  const handleMilestone = async (status: string, note: string) => {
    setUpdating(true);
    try {
      await onUpdateMilestone(trip.id, status, note);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HUD Active Header */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl space-y-3 shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-mono text-[10px] text-amber-400 font-bold">{trip.bookingId}</span>
            <h1 className="text-base font-extrabold text-zinc-100 mt-0.5">
              {trip.pickup?.name || trip.pickup?.address || "Pickup"} ➔ {trip.destination?.name || trip.destination?.address || "Destination"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase animate-pulse">
              {status.replaceAll("_", " ")}
            </span>
            {isTracking && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> GPS Live Sync
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Route Map for Driver */}
        <div className="pt-1">
          <RealtimeFleetMap
            pickup={trip.pickup || { name: "Pickup" }}
            destination={trip.destination || { name: "Destination" }}
            stops={trip.stops || []}
            activeTrip={trip}
            billingKm={Number(trip.billingKm || 0)}
            estimatedToll={Number(trip.finalToll || trip.estimatedToll || 0)}
            height="360px"
          />
        </div>

        {/* Passenger Info & Call */}
        <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
          <div>
            <div className="text-zinc-400 text-[11px]">Passenger:</div>
            <div className="font-bold text-zinc-100 text-sm">{trip.customerName}</div>
            <div className="text-zinc-400 font-mono text-[11px]">{trip.customerMobile}</div>
          </div>
          <a href={`tel:${trip.customerMobile}`} className="block">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 cursor-pointer">
              <Phone className="w-4 h-4 mr-1.5" /> Call Passenger
            </Button>
          </a>
        </div>
      </div>

      {/* Navigation Buttons (Google Maps Deep Links) */}
      <div className="grid grid-cols-2 gap-2">
        <a href={navigateToPickupUrl} target="_blank" rel="noreferrer" className="block">
          <Button variant="outline" className="w-full border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 font-bold text-xs py-5 cursor-pointer">
            <ExternalLink className="w-4 h-4 mr-1 text-emerald-400" /> Nav to Pickup
          </Button>
        </a>
        <a href={navigateToDestUrl} target="_blank" rel="noreferrer" className="block">
          <Button variant="outline" className="w-full border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 font-bold text-xs py-5 cursor-pointer">
            <ExternalLink className="w-4 h-4 mr-1 text-amber-400" /> Nav to Dest
          </Button>
        </a>
      </div>

      {/* Journey Milestone Stepper Buttons */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-3">
        <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span>Journey Progression</span>
          {isTracking && (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Telemetry
            </span>
          )}
        </div>

        <div className="space-y-2">
          {/* Stage 1: Accept Trip */}
          {(status === "assigned" || status === "upcoming") && (
            <Button
              disabled={updating}
              onClick={() => handleMilestone("accepted", "Driver accepted trip assignment")}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black py-6 text-sm cursor-pointer shadow-lg shadow-emerald-500/20 uppercase tracking-wide"
            >
              {updating ? <ButtonLoader label="Accepting Trip..." /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> 1. Accept Trip Assignment</>}
            </Button>
          )}

          {/* Stage 2: Driver Arrived at Pickup */}
          {status === "accepted" && (
            <Button
              disabled={updating}
              onClick={() => handleMilestone("driver_arrived", "Driver arrived at pickup point")}
              className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black py-6 text-sm cursor-pointer shadow-lg shadow-sky-500/20 uppercase tracking-wide"
            >
              {updating ? <ButtonLoader label="Confirming Pickup Arrival..." /> : <><MapPin className="w-5 h-5 mr-2" /> 2. Arrived at Pickup Location</>}
            </Button>
          )}

          {/* Stage 3: Start Trip & Starting KM */}
          {status === "driver_arrived" && (
            <Button
              onClick={() => onOpenStartKmModal(trip)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm cursor-pointer shadow-lg shadow-amber-400/20 uppercase tracking-wide"
            >
              <Gauge className="w-5 h-5 mr-2" /> 3. Start Trip (Enter Starting KM)
            </Button>
          )}

          {/* Stage 4: Trip in Progress */}
          {status === "started" && (
            <Button
              disabled={updating}
              onClick={() => handleMilestone("in_progress", "Passenger boarded, journey in progress")}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-6 text-sm cursor-pointer shadow-lg shadow-amber-400/20 uppercase tracking-wide"
            >
              {updating ? <ButtonLoader label="Starting Transit..." /> : <><Navigation className="w-5 h-5 mr-2" /> 4. Passenger Boarded (In Progress)</>}
            </Button>
          )}

          {/* Stage 5: Reached Destination */}
          {status === "in_progress" && (
            <Button
              disabled={updating}
              onClick={() => handleMilestone("reached_destination", "Arrived at final destination")}
              className="w-full bg-sky-500 hover:bg-sky-400 text-zinc-950 font-black py-6 text-sm cursor-pointer shadow-lg shadow-sky-500/20 uppercase tracking-wide"
            >
              {updating ? <ButtonLoader label="Confirming Destination Arrival..." /> : <><MapPin className="w-5 h-5 mr-2" /> 5. Reached Destination</>}
            </Button>
          )}

          {/* Stage 6: Complete Trip & Ending KM */}
          {status === "reached_destination" && (
            <Button
              onClick={() => onOpenEndKmModal(trip)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 text-sm cursor-pointer shadow-lg shadow-emerald-600/20 uppercase tracking-wide"
            >
              <Gauge className="w-5 h-5 mr-2" /> 6. Complete Trip (Enter Ending KM)
            </Button>
          )}

          {status === "completed" && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-xl text-center text-emerald-400 font-bold text-xs">
              ✓ Trip Completed & Meter Verified
            </div>
          )}
        </div>
      </div>

      {/* Odometer KM Summary */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 text-xs grid grid-cols-3 gap-2 text-center">
        <div>
          <span className="text-zinc-500 text-[10px] block">Start KM</span>
          <span className="font-mono font-bold text-zinc-200">{trip.startingKm ? `${trip.startingKm} km` : "-"}</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">End KM</span>
          <span className="font-mono font-bold text-zinc-200">{trip.endingKm ? `${trip.endingKm} km` : "-"}</span>
        </div>
        <div>
          <span className="text-zinc-500 text-[10px] block">Actual KM</span>
          <span className="font-mono font-bold text-emerald-400">{trip.actualKm ? `${trip.actualKm} km` : "In run"}</span>
        </div>
      </div>
    </div>
  );
};
