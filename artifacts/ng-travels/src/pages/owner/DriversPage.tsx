import React from "react";
import { Car, Phone, Mail, Award, CheckCircle2, AlertCircle, Clock, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriversPageProps {
  drivers: any[];
  onUpdateAvailability?: (driverId: number, availability: string) => void;
}

export const DriversPage: React.FC<DriversPageProps> = ({ drivers = [], onUpdateAvailability }) => {
  const driverList = Array.isArray(drivers) ? drivers : (Array.isArray((drivers as any)?.items) ? (drivers as any).items : []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-400" />
            Driver Partner Roster & Availability Board
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fleet operators, commercial license credentials, active duty statuses, and performance ratings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {driverList.map((drv: any) => (
          <div
            key={drv.id}
            className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold flex items-center justify-center text-sm">
                  {drv.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">{drv.name}</h3>
                  <span className="font-mono text-[11px] text-zinc-400">{drv.driverCode}</span>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                drv.availability === "available" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                drv.availability === "on_trip" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse" :
                drv.availability === "on_leave" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                "bg-zinc-800 text-zinc-400"
              }`}>
                {drv.availability?.replaceAll("_", " ")}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex justify-between">
                <span>Phone:</span>
                <span className="text-zinc-200 font-medium">{drv.mobile}</span>
              </div>
              <div className="flex justify-between">
                <span>Driving License:</span>
                <span className="font-mono text-zinc-300">{drv.licenseNumber || "DL-KA01-PENDING"}</span>
              </div>
              <div className="flex justify-between">
                <span>Rating:</span>
                <span className="text-amber-400 font-bold">★ {drv.rating || "4.8"} / 5.0</span>
              </div>
            </div>

            {drv.notes && <p className="text-[11px] text-zinc-400 italic">{drv.notes}</p>}

            {/* Quick Availability Action */}
            {onUpdateAvailability && (
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500 text-[10px] uppercase">Set Status:</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={drv.availability === "available" ? "default" : "outline"}
                    onClick={() => onUpdateAvailability(drv.id, "available")}
                    className={`h-6 text-[10px] px-2 ${
                      drv.availability === "available" ? "bg-emerald-600 text-white font-bold" : "border-zinc-800 text-zinc-400"
                    }`}
                  >
                    Available
                  </Button>
                  <Button
                    size="sm"
                    variant={drv.availability === "on_leave" ? "default" : "outline"}
                    onClick={() => onUpdateAvailability(drv.id, "on_leave")}
                    className={`h-6 text-[10px] px-2 ${
                      drv.availability === "on_leave" ? "bg-rose-600 text-white font-bold" : "border-zinc-800 text-zinc-400"
                    }`}
                  >
                    On Leave
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
