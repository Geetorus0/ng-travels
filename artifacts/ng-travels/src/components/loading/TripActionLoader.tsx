import React from "react";
import { NGTravelsLoader } from "./NGTravelsLoader";
import { cn } from "@/lib/utils";

export type TripActionType = "start" | "complete" | "create" | "assign" | "payment" | "expense";

export interface TripActionLoaderProps {
  action: TripActionType;
  title?: string;
  subtext?: string;
  className?: string;
}

const actionDefaults: Record<TripActionType, { title: string; subtext: string }> = {
  start: {
    title: "Starting your journey...",
    subtext: "Recording starting odometer and activating live GPS telemetry...",
  },
  complete: {
    title: "Completing trip...",
    subtext: "Auditing final meter reading, updating vehicle availability & ledgers...",
  },
  create: {
    title: "Dispatching fleet booking...",
    subtext: "Authorizing route, highway tolls, driver bata and commercial fares...",
  },
  assign: {
    title: "Assigning fleet resources...",
    subtext: "Verifying driver commercial badge and vehicle regulatory certificates...",
  },
  payment: {
    title: "Recording transaction...",
    subtext: "Updating customer balance and generating official receipt voucher...",
  },
  expense: {
    title: "Submitting expense claim...",
    subtext: "Logging fuel, toll or parking claim to operations approval queue...",
  },
};

export const TripActionLoader: React.FC<TripActionLoaderProps> = ({
  action,
  title,
  subtext,
  className,
}) => {
  const defaults = actionDefaults[action] || actionDefaults.start;

  return (
    <div className={cn("p-6 flex flex-col items-center justify-center text-center space-y-4", className)}>
      <NGTravelsLoader size="md" variant="default" text="" />

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-zinc-100 tracking-wide">
          {title || defaults.title}
        </h4>
        <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
          {subtext || defaults.subtext}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400/90 pt-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>Atomic Database Transaction in Progress</span>
      </div>
    </div>
  );
};
