import React from "react";
import { Link, useLocation } from "wouter";
import {
  Home, Calendar, Navigation, Receipt, User, Bell, LogOut, ShieldCheck, ArrowRightLeft,
  Sparkles, CheckCircle2, Car, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncStatusModal } from "@/components/common/SyncStatusModal";

interface DriverLayoutProps {
  children: React.ReactNode;
  driver?: any;
  onSignOut?: () => void;
  onSwitchRole?: (role: "admin" | "driver") => void;
}

export const DriverLayout: React.FC<DriverLayoutProps> = ({
  children,
  driver = { name: "Suresh K", availability: "on_trip" },
  onSignOut,
  onSwitchRole,
}) => {
  const [location] = useLocation();
  const isDriverApk = (window as any).NG_APP_ROLE === "driver";

  const navItems = [
    { label: "Cockpit", href: "/driver", icon: Home },
    { label: "Active Run", href: "/driver/current-trip", icon: Navigation, isPrimary: true },
    { label: "Vehicle", href: "/driver/vehicle", icon: Car },
    { label: "History", href: "/driver/history", icon: Clock },
    { label: "Expenses", href: "/driver/expenses", icon: Receipt },
    { label: "Profile", href: "/driver/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased max-w-md mx-auto shadow-2xl border-x border-zinc-800">
      {/* Driver Top Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/90 sticky top-0 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="NG Travels"
            className="w-8 h-8 rounded-lg object-contain bg-zinc-950 p-0.5 border border-amber-500/40 shadow-sm flex-shrink-0"
          />
          <div>
            <div className="font-bold text-xs text-zinc-100 flex items-center gap-1.5">
              {driver.name}
              <span className={`w-2 h-2 rounded-full ${
                driver.availability === "on_trip" ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`} />
            </div>
            <div className="text-[10px] text-zinc-400 uppercase font-mono">
              {driver.availability === "on_trip" ? "ON ACTIVE TRIP" : "AVAILABLE FOR DUTY"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <SyncStatusModal />

          {/* Switch to Admin (hidden in Driver APK) */}
          {!isDriverApk && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSwitchRole?.("admin")}
              className="text-amber-400 hover:text-amber-300 text-[10px] h-7 px-2 font-semibold cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Admin
            </Button>
          )}

          {onSignOut && (
            <Button size="sm" variant="ghost" onClick={onSignOut} className="text-zinc-400 hover:text-rose-400 h-7 w-7 p-0">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Screen Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto bg-zinc-950">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-zinc-900/95 backdrop-blur border-t border-zinc-800/80 px-2 flex items-center justify-around z-50">
        {navItems.map((item, idx) => {
          const isActive = location === item.href || (item.href === "/driver" && location === "/driver/dashboard");
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                item.isPrimary
                  ? "relative -top-3"
                  : ""
              }`}
            >
              {item.isPrimary ? (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isActive
                    ? "bg-amber-400 text-zinc-950 shadow-amber-400/30 ring-4 ring-zinc-950"
                    : "bg-amber-500/20 border border-amber-500/40 text-amber-300 ring-4 ring-zinc-950"
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${isActive ? "text-amber-400" : "text-zinc-400"}`} />
              )}
              <span className={`text-[10px] mt-1 ${
                isActive ? "text-amber-400 font-bold" : "text-zinc-400"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
