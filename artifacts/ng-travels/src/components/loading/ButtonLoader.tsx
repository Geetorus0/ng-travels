import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonLoaderProps {
  label?: string;
  className?: string;
  vehicle?: boolean;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({
  label = "Processing...",
  className,
  vehicle = true,
}) => {
  return (
    <span className={cn("inline-flex items-center justify-center gap-2", className)}>
      {vehicle ? (
        <span className="relative flex items-center justify-center w-5 h-5">
          {/* Micro moving car / pulse indicator */}
          <svg
            className="w-4 h-4 text-zinc-950 animate-ng-bounce"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
            <circle cx="7.5" cy="14.5" r="1.5" />
            <circle cx="16.5" cy="14.5" r="1.5" />
          </svg>
        </span>
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-950/30 border-t-zinc-950 animate-spin" />
      )}
      <span className="font-bold">{label}</span>
    </span>
  );
};
