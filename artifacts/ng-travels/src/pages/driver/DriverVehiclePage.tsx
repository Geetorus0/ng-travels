import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Car, ShieldCheck, AlertTriangle, CheckCircle2, Wrench,
  Fuel, Gauge, Phone, FileText, Calendar, Clock, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NGTravelsLoader } from "@/components/loading";

export const DriverVehiclePage: React.FC = () => {
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["/api/driver/vehicle"],
    queryFn: async () => {
      const res = await fetch("/api/driver/vehicle");
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <NGTravelsLoader
          size="md"
          text="Verifying commercial fleet unit..."
          subtext="Checking insurance, fitness, permit and regulatory records"
        />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-3">
        <Car className="w-10 h-10 text-zinc-600 mx-auto" />
        <h2 className="text-base font-bold text-zinc-200">No Vehicle Assigned</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          You currently do not have a dedicated commercial vehicle assigned. Please contact the NG Travels operations desk.
        </p>
        <a href="tel:+919842712345" className="inline-block mt-2">
          <Button className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs py-4 px-4 cursor-pointer">
            <Phone className="w-3.5 h-3.5 mr-1.5" /> Call Operations Desk
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vehicle Identity Card */}
      <div className="bg-gradient-to-r from-zinc-900 to-amber-950/30 p-5 rounded-2xl border border-amber-500/30 shadow-xl space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
              Assigned Commercial Unit
            </span>
            <h1 className="text-xl font-black text-zinc-100 mt-1 font-mono tracking-wide">
              {vehicle.vehicleNumber}
            </h1>
            <p className="text-xs text-zinc-300 mt-0.5">
              {vehicle.brand} {vehicle.model} • {vehicle.capacity} Seater • {vehicle.fuelType}
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            vehicle.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
            "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          }`}>
            {vehicle.status}
          </span>
        </div>

        {/* Current Odometer */}
        <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-amber-400" /> Current Odometer:
          </span>
          <span className="text-base font-black text-amber-300">
            {Number(vehicle.currentOdometerKm || 0).toLocaleString()} KM
          </span>
        </div>
      </div>

      {/* Compliance Documents */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Regulatory Compliance & Certificates
          </h2>
          <span className="text-[10px] text-zinc-500 font-mono">All-India Valid</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Insurance Policy</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{vehicle.insurancePolicy || "Comprehensive Commercial"}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Expires: {vehicle.insuranceExpiry || "N/A"}</div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
              vehicle.insuranceStatus === "expired" ? "bg-rose-500/20 text-rose-400" :
              vehicle.insuranceStatus === "expiring_soon" ? "bg-amber-500/20 text-amber-300" :
              "bg-emerald-500/20 text-emerald-400"
            }`}>
              {vehicle.insuranceStatus === "valid" ? "Active" : vehicle.insuranceStatus?.replace("_", " ")}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Tourist Permit</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{vehicle.permitNumber || "All India Tourist Permit"}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Expires: {vehicle.permitExpiry || "N/A"}</div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
              vehicle.permitStatus === "expired" ? "bg-rose-500/20 text-rose-400" :
              vehicle.permitStatus === "expiring_soon" ? "bg-amber-500/20 text-amber-300" :
              "bg-emerald-500/20 text-emerald-400"
            }`}>
              {vehicle.permitStatus === "valid" ? "Active" : vehicle.permitStatus?.replace("_", " ")}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Fitness Certificate</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{vehicle.fitnessCertNumber || "RTO Fitness OK"}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Expires: {vehicle.fitnessExpiry || "N/A"}</div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
              vehicle.fitnessStatus === "expired" ? "bg-rose-500/20 text-rose-400" :
              vehicle.fitnessStatus === "expiring_soon" ? "bg-amber-500/20 text-amber-300" :
              "bg-emerald-500/20 text-emerald-400"
            }`}>
              {vehicle.fitnessStatus === "valid" ? "Active" : vehicle.fitnessStatus?.replace("_", " ")}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase font-bold">Pollution (PUC)</div>
              <div className="font-semibold text-zinc-200 mt-0.5">{vehicle.pollutionCertNumber || "PUC Valid"}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Expires: {vehicle.pollutionExpiry || "N/A"}</div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
              vehicle.pollutionStatus === "expired" ? "bg-rose-500/20 text-rose-400" :
              vehicle.pollutionStatus === "expiring_soon" ? "bg-amber-500/20 text-amber-300" :
              "bg-emerald-500/20 text-emerald-400"
            }`}>
              {vehicle.pollutionStatus === "valid" ? "Active" : vehicle.pollutionStatus?.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Assistance */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-zinc-200">24/7 Breakdown & Fleet Support</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Call NG Travels control room for towing or repairs</div>
        </div>
        <a href="tel:+919842712345">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 px-4 cursor-pointer">
            <Phone className="w-4 h-4 mr-1.5" /> Call Help
          </Button>
        </a>
      </div>
    </div>
  );
};
