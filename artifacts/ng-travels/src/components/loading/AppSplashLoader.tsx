import React, { useState, useEffect } from "react";
import { NGTravelsLoader } from "./NGTravelsLoader";
import { WifiOff, RefreshCw, ShieldCheck, Car } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AppSplashLoaderProps {
  mode?: "owner" | "driver" | "general";
  title?: string;
  onRetry?: () => void;
  timeoutMs?: number;
}

export const AppSplashLoader: React.FC<AppSplashLoaderProps> = ({
  mode = "general",
  title,
  onRetry,
  timeoutMs = 9000,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const ownerMessages = [
    "Checking your secure session...",
    "Connecting fleet operations database...",
    "Synchronizing live trip rosters...",
    "Loading travel financial ledgers...",
    "Almost ready...",
  ];

  const driverMessages = [
    "Verifying driver duty credentials...",
    "Loading assigned journeys for today...",
    "Connecting vehicle GPS telemetry...",
    "Preparing driver cockpit HUD...",
    "Almost ready...",
  ];

  const generalMessages = [
    "Authenticating secure session...",
    "Planning your journey...",
    "Synchronizing fleet operations...",
    "Connecting real-time dispatch...",
    "Almost ready...",
  ];

  const messages =
    mode === "driver"
      ? driverMessages
      : mode === "owner"
      ? ownerMessages
      : generalMessages;

  // Rotate messages smoothly every 2.2s
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Online / Offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsTimedOut(false);
      if (onRetry) onRetry();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onRetry]);

  // Timeout guard (prevents infinite hanging)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!navigator.onLine) {
        setIsOffline(true);
      } else {
        setIsTimedOut(true);
      }
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6 z-10">
        {/* NG Travels Logo with smooth glow reveal */}
        <div className="relative group">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500/30 to-amber-600/30 rounded-3xl blur-md animate-pulse" />
          <img
            src="/logo.png"
            alt="NG Travels"
            className="relative w-24 h-24 rounded-2xl object-contain bg-black p-1.5 border border-amber-500/40 shadow-2xl shadow-amber-500/20"
          />
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-100 tracking-tight flex items-center justify-center gap-1.5">
            <span>NG TRAVELS</span>
            {mode === "driver" ? (
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/40 font-mono">
                PILOT
              </span>
            ) : mode === "owner" ? (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 font-mono">
                OWNER
              </span>
            ) : null}
          </h1>
          <p className="text-xs text-amber-400 font-semibold tracking-wide">
            Travel with Comfort & Safety
          </p>
          <p className="text-[10px] text-zinc-500 font-medium">
            Your Journey, Our Responsibility
          </p>
        </div>

        {/* Offline Screen State */}
        {isOffline || isTimedOut ? (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-3 w-full shadow-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                {isOffline ? "You're currently offline" : "Taking longer than usual"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {isOffline
                  ? "Please check your internet connection. We will automatically resume when network returns."
                  : "We're having trouble reaching the server. Check your connection or retry."}
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setIsTimedOut(false);
                if (onRetry) onRetry();
                else window.location.reload();
              }}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs py-4 shadow-lg shadow-amber-400/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
            </Button>
          </div>
        ) : (
          /* Normal Loading Route Animation */
          <div className="w-full space-y-4 pt-2">
            <NGTravelsLoader size="md" variant="default" text="" />

            {/* Rotating smooth transition text */}
            <div className="h-6 flex items-center justify-center">
              <p className="text-xs font-bold text-zinc-300 tracking-wide transition-all duration-300 animate-in fade-in">
                {title || messages[messageIndex]}
              </p>
            </div>

            {/* Subtext stages indicator */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                PostgreSQL Single Source of Truth
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer System Status */}
      <div className="absolute bottom-6 text-[10px] text-zinc-600 font-mono text-center">
        NG Travels Fleet Operations Engine v2.0
      </div>
    </div>
  );
};
