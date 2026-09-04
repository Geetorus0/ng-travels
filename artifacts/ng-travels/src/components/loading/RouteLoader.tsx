import React from "react";
import { cn } from "@/lib/utils";

export interface RouteLoaderProps {
  className?: string;
  message?: string;
}

export const RouteLoader: React.FC<RouteLoaderProps> = ({
  className,
  message = "Loading route...",
}) => {
  return (
    <div className={cn("w-full py-8 flex flex-col items-center justify-center space-y-3", className)}>
      <div className="relative w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
        <div className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 w-1/3 rounded-full animate-ng-vehicle" />
      </div>
      {message && (
        <span className="text-[11px] font-mono text-zinc-400 tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {message}
        </span>
      )}
    </div>
  );
};
