import React from "react";
import { User, Phone, Mail, Award, ShieldCheck, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverProfilePageProps {
  driver?: any;
  onUpdateAvailability?: (availability: string) => void;
}

export const DriverProfilePage: React.FC<DriverProfilePageProps> = ({
  driver,
  onUpdateAvailability,
}) => {
  if (!driver) {
    return (
      <div className="bg-zinc-900/60 p-8 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-xs space-y-2">
        <User className="w-8 h-8 text-zinc-600 mx-auto" />
        <p>No driver profile details found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          Driver Partner Profile
        </h1>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          Commercial badge credentials, license validation, and duty status.
        </p>
      </div>

      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 text-center space-y-3 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-amber-400 text-zinc-950 font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20">
          {driver.name?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-zinc-100">{driver.name}</h2>
          <span className="font-mono text-xs text-amber-400 font-bold">{driver.driverCode}</span>
        </div>
        <div className="inline-flex items-center gap-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold">
          ★ {driver.rating || "4.9"} Star Pilot
        </div>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3 text-xs">
        <h3 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Credentials</h3>
        <div className="space-y-2 text-zinc-400">
          <div className="flex justify-between">
            <span>Contact Mobile:</span>
            <span className="text-zinc-200 font-medium">{driver.mobile}</span>
          </div>
          <div className="flex justify-between">
            <span>Commercial License:</span>
            <span className="font-mono text-zinc-200">{driver.licenseNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>License Expiry:</span>
            <span className="text-zinc-300">{driver.licenseExpiry}</span>
          </div>
          <div className="flex justify-between">
            <span>Emergency Contact:</span>
            <span className="text-zinc-300">{driver.emergencyContact}</span>
          </div>
        </div>
      </div>

      {onUpdateAvailability && (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
          <h3 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Duty Status Switcher</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={driver.availability === "available" ? "default" : "outline"}
              onClick={() => onUpdateAvailability("available")}
              className={driver.availability === "available" ? "bg-emerald-600 text-white font-bold" : "border-zinc-800 text-zinc-400"}
            >
              Available for Duty
            </Button>
            <Button
              size="sm"
              variant={driver.availability === "on_leave" ? "default" : "outline"}
              onClick={() => onUpdateAvailability("on_leave")}
              className={driver.availability === "on_leave" ? "bg-rose-600 text-white font-bold" : "border-zinc-800 text-zinc-400"}
            >
              Mark On Leave
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
