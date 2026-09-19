import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Navigation, CalendarDays, MapPin, Users,
  Car, CircleDollarSign, Receipt, BarChart3, Bell, LogOut, Search,
  Smartphone, ArrowLeft, Plus, MessageSquareQuote, ShieldAlert,
  Settings, Menu, X, ChevronRight, HelpCircle, Sun, Moon, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncStatusModal } from "@/components/common/SyncStatusModal";
import type { Theme } from "@/hooks/useTheme";

interface OwnerLayoutProps {
  children: React.ReactNode;
  user?: any;
  onSignOut?: () => void;
  onSwitchRole?: (role: "admin" | "driver") => void;
  onOpenCreateTrip?: () => void;
  unreadNotificationCount?: number;
  theme?: Theme;
  onToggleTheme?: () => void;
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  user,
  onSignOut,
  onSwitchRole,
  onOpenCreateTrip,
  unreadNotificationCount = 0,
  theme = "dark",
  onToggleTheme,
}) => {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navLinks = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Live Trips", href: "/live-trips", icon: Radio },
    { label: "Trips", href: "/trips", icon: Navigation },
    { label: "Vehicles", href: "/vehicles", icon: Car },
    { label: "Drivers", href: "/drivers", icon: Users },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Payments", href: "/payments", icon: CircleDollarSign },
    { label: "Expenses", href: "/expenses", icon: Receipt },
    { label: "Reports", href: "/reports", icon: BarChart3 },
    { label: "Enquiries", href: "/enquiries", icon: MessageSquareQuote },
    { label: "Calendar", href: "/calendar", icon: CalendarDays },
    { label: "Route Planner", href: "/route-planner", icon: MapPin },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setMobileSearchOpen(false);
      setLocation(`/trips?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isSubPage = location !== "/dashboard" && location !== "/";

  const getPageTitle = () => {
    if (location.startsWith("/trips/")) return "Trip Details";
    if (location === "/trips") return "Trips Operations";
    if (location === "/live-trips") return "Live Trips & GPS Radar";
    if (location === "/vehicles") return "Commercial Fleet Vehicles";
    if (location === "/customers") return "Customer Directory";
    if (location === "/drivers" || location === "/driver-availability") return "Driver Fleet";
    if (location === "/payments") return "Payment Ledger";
    if (location === "/expenses") return "Expense Approvals";
    if (location === "/reports") return "Reports";
    if (location === "/calendar") return "Calendar";
    if (location === "/route-planner") return "Route Planner";
    if (location === "/notifications") return "Alerts";
    if (location === "/audit-logs") return "Audit Logs";
    if (location === "/settings") return "Settings";
    if (location === "/enquiries") return "Enquiries";
    return "Operations Command Center";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-amber-100 selection:dark:bg-amber-500/30 pb-20 lg:pb-0">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur shadow-xl">
        <div className="w-full px-3 sm:px-5 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="NG Travels"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-black p-0.5 border border-amber-300 dark:border-amber-500/40 shadow-md shadow-amber-500/10 group-hover:scale-105 transition-transform flex-shrink-0"
              />
              <div className="leading-tight flex-shrink-0">
                <div className="font-black text-xs sm:text-sm tracking-wide text-foreground flex items-center gap-1.5">
                  NG TRAVELS <span className="text-amber-700 dark:text-amber-400 text-[9px] font-mono font-bold bg-amber-100 dark:bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-400/30">ERP</span>
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono hidden sm:block">OPERATIONS DESK</div>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop Tabs) — flexes to fill the
              space between the logo and right-side actions, and scrolls
              internally rather than pushing the right actions off-screen
              when there isn't enough width to show every tab. */}
          <nav className="hidden xl:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-mini pb-0.5">
            {navLinks.slice(0, 9).map((link) => {
              const isActive = location === link.href || (link.href !== "/dashboard" && location.startsWith(link.href));
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <button
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-500/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`} />
                    <span>{link.label}</span>
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Desktop Search Input */}
            <form onSubmit={handleGlobalSearch} className="relative hidden lg:block w-36 xl:w-44">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                placeholder="Search bookings, ID, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 bg-card/90 border-border pl-8 text-xs placeholder:text-muted-foreground rounded-lg focus:border-amber-300 focus:dark:border-amber-500/50"
              />
            </form>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="lg:hidden p-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Sync & Network Status Badge */}
            <SyncStatusModal />

            {/* Quick Action: New Trip Button */}
            {onOpenCreateTrip && (
              <Button
                size="sm"
                onClick={onOpenCreateTrip}
                className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-7 sm:h-8 px-2 sm:px-3 shadow-md shadow-amber-400/20 flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">New Trip</span>
              </Button>
            )}

            {/* Light / Dark Theme Toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                className="p-1.5 sm:p-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-all cursor-pointer"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            {/* Notifications */}
            <Link href="/notifications">
              <button className="relative p-1.5 sm:p-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-all cursor-pointer">
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-zinc-950 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
            </Link>

            {/* Switch to Driver Portal */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSwitchRole?.("driver")}
              className="border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-950/30 text-xs font-semibold h-7 sm:h-8 px-2 hidden sm:flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Smartphone className="w-3.5 h-3.5" /> <span className="hidden md:inline">Driver</span>
            </Button>

            {/* Mobile Drawer Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="xl:hidden p-1.5 sm:p-2 rounded-lg bg-card hover:bg-muted text-foreground border border-border transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* User Profile Avatar */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-400/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                AD
              </div>
              <div className="hidden 2xl:block text-left text-xs leading-none whitespace-nowrap">
                <div className="font-semibold text-foreground truncate max-w-[120px]">{user?.fullName || "Operations Admin"}</div>
                <div className="text-[9px] text-amber-700 dark:text-amber-400 uppercase font-mono mt-0.5">OWNER</div>
              </div>
            </div>

            {/* Logout — always reachable from the header itself, not just the mobile drawer */}
            {onSignOut && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSignOut}
                title="Sign Out"
                className="text-muted-foreground hover:text-rose-700 hover:dark:text-rose-400 hover:bg-rose-950/20 h-7 sm:h-8 px-1.5 sm:px-2 flex items-center gap-1 cursor-pointer flex-shrink-0"
              >
                <LogOut className="w-4 h-4" /> <span className="hidden lg:inline text-xs font-semibold">Logout</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Search Dropdown */}
        {mobileSearchOpen && (
          <div className="lg:hidden p-3 border-t border-border bg-background">
            <form onSubmit={handleGlobalSearch} className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                placeholder="Search Booking ID, Customer, Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="h-9 bg-card border-border pl-9 text-xs placeholder:text-muted-foreground rounded-lg w-full"
              />
            </form>
          </div>
        )}
      </header>

      {/* Mobile Slide-out Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex 2xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[80vw] bg-background border-r border-border h-full p-4 flex flex-col z-10 shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="NG Travels"
                  className="w-9 h-9 rounded-xl object-contain bg-background p-0.5 border border-amber-300 dark:border-amber-500/40 shadow-md flex-shrink-0"
                />
                <div>
                  <div className="font-extrabold text-xs text-foreground">NG TRAVELS ERP</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">OWNER DESK</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Mobile Role Switcher */}
            <div className="py-3 border-b border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSwitchRole?.("driver");
                }}
                className="w-full justify-start border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-950/30 text-xs h-9"
              >
                <Smartphone className="w-4 h-4 mr-2" /> Switch to Driver Portal
              </Button>
            </div>

            {/* Navigation Links */}
            <div className="py-3 space-y-1 flex-1">
              <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 pb-1 font-mono">Modules</div>
              {navLinks.map((link) => {
                const isActive = location === link.href || (link.href !== "/dashboard" && location.startsWith(link.href));
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                        isActive
                          ? "bg-amber-100 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-400/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`} />
                        <span>{link.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Drawer Footer / Theme + Sign out */}
            <div className="pt-3 border-t border-border space-y-1">
              {onToggleTheme && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onToggleTheme}
                  className="w-full justify-start text-xs text-foreground hover:bg-card h-9"
                >
                  {theme === "dark" ? (
                    <><Sun className="w-4 h-4 mr-2" /> Switch to Light Theme</>
                  ) : (
                    <><Moon className="w-4 h-4 mr-2" /> Switch to Dark Theme</>
                  )}
                </Button>
              )}
              {onSignOut && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full justify-start text-xs text-rose-700 dark:text-rose-400 hover:bg-rose-950/30 h-9"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb Friendly) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border/80 px-2 py-1.5 flex items-center justify-around lg:hidden">
        <Link href="/dashboard">
          <div className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg cursor-pointer ${location === "/dashboard" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Home</span>
          </div>
        </Link>

        <Link href="/trips">
          <div className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg cursor-pointer ${location === "/trips" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
            <Navigation className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Trips</span>
          </div>
        </Link>

        {/* Center Floating Action for New Trip */}
        {onOpenCreateTrip && (
          <button
            onClick={onOpenCreateTrip}
            className="w-10 h-10 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold shadow-lg shadow-amber-400/30 -mt-4 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 text-zinc-950" />
          </button>
        )}

        <Link href="/customers">
          <div className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg cursor-pointer ${location === "/customers" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
            <Users className="w-4 h-4" />
            <span className="text-[9px] font-semibold">Customers</span>
          </div>
        </Link>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-muted-foreground cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[9px] font-semibold">Menu</span>
        </button>
      </div>

      {/* Desktop Footer */}
      <footer className="border-t border-border bg-background py-4 text-center text-xs text-muted-foreground mt-auto hidden lg:block">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NG Travels Operations ERP • Authoritative Operational Operating System</span>
          <span className="font-mono text-[11px] text-muted-foreground">Live PostgreSQL Database • Real-Time Fleet Sync</span>
        </div>
      </footer>
    </div>
  );
};
