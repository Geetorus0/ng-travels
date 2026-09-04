import React, { useState, useEffect } from "react";
import { syncEngine, type SyncState } from "@/lib/syncEngine";
import { Radio, Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConnectionIndicatorProps {
  className?: string;
  variant?: "badge" | "bar" | "minimal";
  onClick?: () => void;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  className,
  variant = "badge",
  onClick,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(() => syncEngine.getState());
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(syncState.status);

  useEffect(() => {
    let timer: any = null;
    const unsubscribe = syncEngine.subscribe((state) => {
      // If transitioned from offline/connecting to connected, show brief confirmation
      if (previousStatus !== "connected" && state.status === "connected") {
        setShowRestoredNotice(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setShowRestoredNotice(false), 3500);
      }
      setPreviousStatus(state.status);
      setSyncState(state);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [previousStatus]);

  const wrapClickable = (content: React.ReactNode) => {
    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-full"
        >
          {content}
        </button>
      );
    }
    return content;
  };

  if (showRestoredNotice) {
    return wrapClickable(
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200",
        className
      )}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>You're back online.</span>
      </div>
    );
  }

  if (syncState.status === "offline") {
    return wrapClickable(
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-in fade-in duration-200",
        className
      )}>
        <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
        <span>Connection lost. Reconnecting...</span>
      </div>
    );
  }

  if (syncState.status === "connecting") {
    return wrapClickable(
      <div className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-in fade-in duration-200",
        className
      )}>
        <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
        <span>Syncing operations...</span>
      </div>
    );
  }

  // Connected state
  if (variant === "minimal") {
    return wrapClickable(
      <div className={cn("inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono", className)} title="Connected to Real-time Stream">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 font-bold">Live</span>
      </div>
    );
  }

  return wrapClickable(
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm",
      className
    )} title={`Connected to NG Travels Backend (${syncState.serverUrl || "Live"})`}>
      <Wifi className="w-3 h-3 text-emerald-400" />
      <span className="hidden sm:inline font-bold">Live</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </div>
  );
};
