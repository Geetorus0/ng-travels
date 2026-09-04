import React from "react";
import { cn } from "@/lib/utils";

export interface NGTravelsLoaderProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  subtext?: string;
  className?: string;
  variant?: "default" | "minimal" | "compact";
}

export const NGTravelsLoader: React.FC<NGTravelsLoaderProps> = ({
  size = "md",
  text = "Planning your journey...",
  subtext,
  className,
  variant = "default",
}) => {
  const isCompact = variant === "compact";
  const isMinimal = variant === "minimal";

  const containerWidth = size === "sm" ? "w-52" : size === "lg" ? "w-80" : "w-64";
  const vehicleScale = size === "sm" ? "scale-75" : size === "lg" ? "scale-110" : "scale-90";

  return (
    <div className={cn("flex flex-col items-center justify-center text-center select-none", className)}>
      {/* Route Animation Track */}
      <div className={cn("relative h-12 flex items-center justify-between", containerWidth)}>
        {/* Origin Node */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50 animate-ng-pulse-ring" />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-zinc-950" />
        </div>

        {/* Route Connecting Line */}
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-[2px] overflow-hidden">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <line
              x1="0"
              y1="1"
              x2="100%"
              y2="1"
              stroke="rgba(245, 158, 11, 0.25)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <line
              x1="0"
              y1="1"
              x2="100%"
              y2="1"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="8 8"
              className="animate-ng-route"
            />
          </svg>
        </div>

        {/* Moving Travel Vehicle */}
        <div className="absolute inset-x-2 top-0 bottom-0 pointer-events-none overflow-hidden">
          <div className="w-full h-full relative">
            <div className="absolute top-1/2 -translate-y-1/2 animate-ng-vehicle left-0">
              <div className={cn("animate-ng-bounce transition-transform", vehicleScale)}>
                {/* Modern Commercial Travel Van SVG */}
                <svg
                  width="44"
                  height="26"
                  viewBox="0 0 44 26"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_4px_10px_rgba(245,158,11,0.4)]"
                >
                  {/* Headlight beam */}
                  <polygon points="38,12 44,8 44,18" fill="url(#beamGrad)" opacity="0.6" />
                  
                  {/* Main Van Body */}
                  <path
                    d="M4 17V8C4 6.89543 4.89543 6 6 6H28L34 11H39C40.1046 11 41 11.8954 41 13V17C41 18.1046 40.1046 19 39 19H35C35 17.3431 33.6569 16 32 16C30.3431 16 29 17.3431 29 19H17C17 17.3431 15.6569 16 14 16C12.3431 16 11 17.3431 11 19H6C4.89543 19 4 18.1046 4 17Z"
                    fill="#f59e0b"
                  />
                  {/* Roof Rack & NG Logo accent */}
                  <rect x="10" y="4" width="16" height="2" rx="1" fill="#fbbf24" />
                  
                  {/* Windows */}
                  <rect x="7" y="8" width="5" height="5" rx="1" fill="#09090b" />
                  <rect x="14" y="8" width="5" height="5" rx="1" fill="#09090b" />
                  <rect x="21" y="8" width="5" height="5" rx="1" fill="#09090b" />
                  {/* Front windshield */}
                  <path d="M28 8H31.5L34.5 13H28V8Z" fill="#18181b" />

                  {/* Rear Wheel */}
                  <circle cx="14" cy="19" r="3.5" fill="#09090b" stroke="#fbbf24" strokeWidth="1.2" />
                  <circle cx="14" cy="19" r="1.2" fill="#f59e0b" />

                  {/* Front Wheel */}
                  <circle cx="32" cy="19" r="3.5" fill="#09090b" stroke="#fbbf24" strokeWidth="1.2" />
                  <circle cx="32" cy="19" r="1.2" fill="#f59e0b" />

                  <defs>
                    <linearGradient id="beamGrad" x1="38" y1="13" x2="44" y2="13" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#fbbf24" stopOpacity="0.8" />
                      <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Destination Pin */}
        <div className="relative z-10 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)] animate-pulse"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
          </svg>
        </div>
      </div>

      {/* Branded Status Text */}
      {!isMinimal && (
        <div className="mt-2 space-y-0.5">
          <p
            className={cn(
              "font-bold text-zinc-200 tracking-wide",
              size === "sm" ? "text-[11px]" : size === "lg" ? "text-sm" : "text-xs"
            )}
          >
            {text}
          </p>
          {subtext && (
            <p className="text-[10px] font-mono text-zinc-400">
              {subtext}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
