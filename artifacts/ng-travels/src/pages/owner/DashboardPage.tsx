import React, { useState } from "react";
import { Link } from "wouter";
import {
  Navigation, Users, Car, CircleDollarSign, Receipt, BarChart3, CalendarDays,
  MapPin, Bell, Settings, Plus, TrendingUp, Radio, Clock3, ArrowUpRight,
  CheckCircle2, AlertCircle, Fuel, Gauge, Eye, Phone, ChevronRight,
  MessageSquareQuote, Compass, Sparkles, IndianRupee, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR, formatKM } from "@/lib/fareEngine";
import { DashboardSkeleton } from "@/components/loading";

interface DashboardPageProps {
  metrics?: any;
  schedule?: any[];
  recentActivity?: any[];
  allTrips?: any[];
  customers?: any[];
  payments?: any[];
  vehicles?: any[];
  isLoading?: boolean;
  onOpenCreateTrip: () => void;
  onOpenCreateEnquiry?: () => void;
  onOpenCustomerCopy?: (trip: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics = {},
  schedule = [],
  allTrips = [],
  customers = [],
  payments = [],
  vehicles = [],
  isLoading = false,
  onOpenCreateTrip,
  onOpenCreateEnquiry,
  onOpenCustomerCopy,
}) => {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const customerList = Array.isArray(customers) ? customers : ((customers as any)?.items || []);
  const vehicleList = Array.isArray(vehicles) ? vehicles : ((vehicles as any)?.items || []);
  const tripList = Array.isArray(allTrips) ? allTrips : ((allTrips as any)?.items || []);

  const activeVehiclesCount = vehicleList.filter((v: any) => v && v.status === "active").length;
  const expiringDocCount = vehicleList.filter((v: any) => v && v.hasExpiringDocuments).length;

  // 12 Balanced Quick Access Cards
  const quickAccessCards = [
    { title: "New Trip", desc: "Dispatch booking", icon: Plus, href: "#new-trip", onClick: onOpenCreateTrip, primary: true },
    { title: "Trips", desc: `${tripList.length} Bookings`, icon: Navigation, href: "/trips", color: "text-amber-400" },
    { title: "Vehicles", desc: `${vehicleList.length} Fleet Units`, icon: Car, href: "/vehicles", color: "text-amber-400" },
    { title: "Drivers", desc: "Duty Roster", icon: Users, href: "/drivers", color: "text-emerald-400" },
    { title: "Customers", desc: `${customerList.length} Profiles`, icon: Users, href: "/customers", color: "text-sky-400" },
    { title: "Payments", desc: "Ledger", icon: CircleDollarSign, href: "/payments", color: "text-emerald-400" },
    { title: "Expenses", desc: "Claims", icon: Receipt, href: "/expenses", color: "text-rose-400" },
    { title: "Reports", desc: "Excel / PDF", icon: BarChart3, href: "/reports", color: "text-amber-400" },
    { title: "Enquiries", desc: "Quotes", icon: MessageSquareQuote, href: "/enquiries", color: "text-purple-400" },
    { title: "Route Planner", desc: "Maps & Tolls", icon: MapPin, href: "/route-planner", color: "text-amber-400" },
    { title: "Alerts", desc: "Notifications", icon: Bell, href: "/notifications", color: "text-amber-300" },
    { title: "Settings", desc: "Rates & Profile", icon: Settings, href: "/settings", color: "text-zinc-400" },
  ];

  const [perfViewMode, setPerfViewMode] = useState<"all_time" | "today">("all_time");

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const todayTrips = tripList.filter((t: any) => t?.startDate === todayStr);

  // All-time aggregate calculations (100% Dynamic from trips & ledger)
  const totalRevenue = tripList.reduce((sum: number, t: any) => sum + Number(t?.customerTotal || 0), 0);
  const totalCollection = tripList.reduce((sum: number, t: any) => sum + Number(t?.totalPaid || 0), 0);
  const totalPendingBalance = tripList.reduce((sum: number, t: any) => sum + Number(t?.remainingBalance || 0), 0);
  const totalCompletedTrips = tripList.filter((t: any) => t?.status === "completed").length;
  const totalBillingKm = tripList.reduce((sum: number, t: any) => sum + Number(t?.billingKm || 0), 0);
  const totalExpenses = metrics?.weeklyExpenses || metrics?.monthlyExpenses || 0;
  const totalProfit = Math.max(0, totalRevenue - totalExpenses);

  // Today's dispatch calculations
  const todaysRevenueCalc = todayTrips.reduce((sum: number, t: any) => sum + Number(t?.customerTotal || 0), 0);
  const todaysCollectionCalc = todayTrips.reduce((sum: number, t: any) => sum + Number(t?.totalPaid || 0), 0);
  const completedTodayCalc = todayTrips.filter((t: any) => t?.status === "completed").length;
  const todaysExpenses = metrics?.todaysExpenses ?? 0;
  const todaysProfit = metrics?.todaysProfit ?? (todaysRevenueCalc - todaysExpenses);

  // Dynamic selection based on view mode
  const isAllTime = perfViewMode === "all_time";
  const displayTrips = isAllTime ? tripList.length : (metrics?.todaysTrips ?? todayTrips.length);
  const displayCompleted = isAllTime ? totalCompletedTrips : (metrics?.completedToday ?? completedTodayCalc);
  const displayRevenue = isAllTime ? totalRevenue : (metrics?.todaysRevenue ?? todaysRevenueCalc);
  const displayCollection = isAllTime ? totalCollection : (metrics?.todaysCollection ?? todaysCollectionCalc);
  const displayExpenses = isAllTime ? totalExpenses : todaysExpenses;
  const displayProfit = isAllTime ? totalProfit : todaysProfit;

  const getRouteText = (trip: any) => {
    if (!trip) return "Route";
    const p = trip.pickup?.name || trip.pickup?.address || (typeof trip.pickup === "string" ? trip.pickup : "Pickup");
    const d = trip.destination?.name || trip.destination?.address || (typeof trip.destination === "string" ? trip.destination : "Destination");
    return `${p} ➔ ${d}`;
  };

  const getPassengerName = (trip: any) => {
    if (!trip) return "Customer";
    if (trip.customerName) return trip.customerName;
    const found = customerList.find((c: any) => c?.id === trip.customerId);
    return found?.name || "Corporate Customer";
  };

  // Active / Ongoing Trips
  const activeTrips = tripList.filter((t: any) =>
    ["started", "reached_pickup", "customer_picked_up", "in_progress"].includes(t?.status)
  );

  // Upcoming Trips
  const upcomingTrips = tripList.filter((t: any) =>
    ["upcoming", "ready", "confirmed"].includes(t?.status)
  );

  // Pending Payments Trips
  const pendingPaymentTrips = tripList.filter((t: any) => Number(t?.remainingBalance || 0) > 0);

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          IN PROGRESS
        </span>
      );
    }
    if (s === "started" || s === "reached_pickup" || s === "customer_picked_up") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          {s.replaceAll("_", " ")}
        </span>
      );
    }
    if (s === "completed") {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          COMPLETED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
        {s.replaceAll("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Welcome Header & Primary Booking CTA */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900/90 p-4 sm:p-7 rounded-2xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            <Sparkles className="w-3 h-3" /> NG TRAVELS COMMAND DESK
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-zinc-100 tracking-tight">Good Morning, Operations Owner</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Real-time fleet operations, central fare calculations, driver dispatching, and audited revenue ledgers.
          </p>
        </div>
        <Button
          size="lg"
          onClick={onOpenCreateTrip}
          className="w-full md:w-auto bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs sm:text-sm py-5 sm:py-6 px-5 sm:px-6 shadow-xl shadow-amber-400/25 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all flex-shrink-0 z-10 cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> NEW TRIP BOOKING
        </Button>
      </div>

      {/* QUICK ACCESS ACTION CARDS (12-Card Mobile Grid) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Quick Access Command Hub
          </h2>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">12 Modules</span>
        </div>

        <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {quickAccessCards.map((card, idx) => {
            const Icon = card.icon;
            if (card.onClick) {
              return (
                <button
                  key={idx}
                  onClick={card.onClick}
                  className="bg-gradient-to-br from-amber-400 to-amber-500 text-zinc-950 p-3 sm:p-4 rounded-xl font-bold text-left shadow-lg shadow-amber-400/20 hover:scale-[1.02] transition-all flex flex-col justify-between min-h-[85px] sm:min-h-[90px] cursor-pointer"
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-950" />
                  <div>
                    <div className="text-xs sm:text-sm font-black tracking-tight">{card.title}</div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-900 font-semibold truncate">{card.desc}</div>
                  </div>
                </button>
              );
            }
            return (
              <Link key={idx} href={card.href}>
                <div className="bg-zinc-900/80 hover:bg-zinc-900 p-3 sm:p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all text-left flex flex-col justify-between min-h-[85px] sm:min-h-[90px] cursor-pointer group shadow-sm">
                  <div className="flex justify-between items-start">
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color || "text-zinc-400"} group-hover:scale-110 transition-transform`} />
                    <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-xs font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">{card.title}</div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate">{card.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* OPERATIONS & FINANCIAL PERFORMANCE SUMMARY */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
            {isAllTime ? "All-Time Financial & Operational Performance" : "Today's Dispatch & Revenue Performance"}
          </h2>
          <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
            <button
              onClick={() => setPerfViewMode("all_time")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                isAllTime
                  ? "bg-amber-400 text-zinc-950 font-bold shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All-Time Business
            </button>
            <button
              onClick={() => setPerfViewMode("today")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                !isAllTime
                  ? "bg-amber-400 text-zinc-950 font-bold shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Today's Dispatch
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Trips Count */}
          <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-semibold block">
              {isAllTime ? "Total Booked Trips" : "Today's Trips"}
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 mt-0.5">{displayTrips}</div>
            <span className="text-[9px] sm:text-[10px] text-emerald-400 mt-0.5 block font-medium">
              {displayCompleted} completed
            </span>
          </div>

          {/* Revenue */}
          <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-semibold block">
              {isAllTime ? "Total Booked Revenue" : "Today's Revenue"}
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-0.5">
              {formatINR(displayRevenue)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 block font-medium">Gross Fare Volume</span>
          </div>

          {/* Collection */}
          <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-semibold block">
              {isAllTime ? "Total Cash Collected" : "Today's Collection"}
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {formatINR(displayCollection)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-emerald-400/80 mt-0.5 block font-medium">Cash / Bank In</span>
          </div>

          {/* Outstanding Balance */}
          <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-semibold block">Outstanding Receivables</span>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-300 mt-0.5">
              {formatINR(totalPendingBalance)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 block font-medium">
              {pendingPaymentTrips.length} pending runs
            </span>
          </div>

          {/* Operating Expenses */}
          <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 hover:border-zinc-700 transition-colors">
            <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-semibold block">
              {isAllTime ? "Operating Expenses" : "Today's Expenses"}
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-400 mt-0.5">
              {formatINR(displayExpenses)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 block font-medium">Approved Claims</span>
          </div>

          {/* Net Profit */}
          <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 shadow-md">
            <span className="text-[9px] sm:text-[10px] text-amber-300 uppercase font-bold block">
              {isAllTime ? "Net Company Profit" : "Today's Profit"}
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-0.5">
              {formatINR(displayProfit)}
            </div>
            <span className="text-[9px] sm:text-[10px] text-amber-400/80 mt-0.5 block font-medium">Revenue - Expenses</span>
          </div>

          {/* Active Commercial Fleet */}
          <Link href="/vehicles">
            <div className="bg-zinc-900/80 p-3 sm:p-4 rounded-xl border border-zinc-800/80 hover:border-amber-500/50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center">
                <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-semibold">Active Fleet</span>
                <Car className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-mono text-zinc-100 mt-0.5">
                {activeVehiclesCount} <span className="text-xs text-zinc-500 font-normal">/ {vehicles.length}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-400 mt-0.5 block font-medium">
                {expiringDocCount > 0 ? `${expiringDocCount} doc alerts` : "All documents OK"}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ACTIVE RUNS RADAR + UPCOMING SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Active Trips Radar */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              Active Trips Radar ({activeTrips.length})
            </h2>
            <Link href="/trips" className="text-xs text-amber-400 hover:underline flex items-center gap-0.5">
              All Trips <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeTrips.length === 0 ? (
            <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800 text-center text-zinc-500 text-xs">
              No trips currently in active transit.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="bg-zinc-900/80 p-3.5 sm:p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400">{trip.bookingId}</span>
                      {renderStatusBadge(trip.status)}
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-zinc-100">
                      {getRouteText(trip)}
                    </div>
                    <div className="text-[11px] sm:text-xs text-zinc-400">
                      Passenger: <span className="text-zinc-300 font-medium">{getPassengerName(trip)}</span> • Driver: <strong className="text-zinc-200">{trip.driverName || "Unassigned"}</strong>
                    </div>
                  </div>
                  <Link href={`/trips/${trip.id}`} className="self-end xs:self-center">
                    <Button size="sm" variant="outline" className="border-zinc-700 hover:border-zinc-600 text-xs h-7 sm:h-8 cursor-pointer">
                      Inspect <Eye className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Trips */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-sky-400" />
              Upcoming Scheduled Trips ({upcomingTrips.length})
            </h2>
            <Link href="/calendar" className="text-xs text-amber-400 hover:underline flex items-center gap-0.5">
              Calendar <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingTrips.length === 0 ? (
            <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800 text-center text-zinc-500 text-xs">
              No upcoming trips scheduled.
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingTrips.slice(0, 4).map((trip) => (
                <div key={trip.id} className="bg-zinc-900/80 p-3.5 sm:p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-zinc-300">{trip.bookingId}</span>
                      <span className="text-[11px] text-zinc-500">• {new Date(trip.startDate).toLocaleDateString("en-IN")} {trip.startTime}</span>
                    </div>
                    <div className="font-semibold text-xs sm:text-sm text-zinc-200 truncate max-w-[200px] xs:max-w-none">
                      {getRouteText(trip)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-zinc-400">
                      {getPassengerName(trip)} • {trip.billingKm} km ({formatINR(trip.customerTotal)})
                    </div>
                  </div>
                  <Link href={`/trips/${trip.id}`}>
                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-zinc-100 text-xs h-7 sm:h-8 px-2 cursor-pointer">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PENDING PAYMENTS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pending Payments Widget */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Pending Payment Balances ({pendingPaymentTrips.length})
            </h2>
            <Link href="/payments" className="text-xs text-amber-400 hover:underline">
              Payments Ledger
            </Link>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-x-auto shadow-sm">
            {pendingPaymentTrips.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                All trip balances are settled. No outstanding payments.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Booking ID</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4">Customer</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Total</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Paid</th>
                    <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {pendingPaymentTrips.slice(0, 5).map((trip) => (
                    <tr key={trip.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-mono font-bold text-amber-400">
                        <Link href={`/trips/${trip.id}`} className="hover:underline">
                          {trip.bookingId}
                        </Link>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                        <div className="font-semibold text-zinc-200">{trip.customerName}</div>
                        <div className="text-[10px] sm:text-[11px] text-zinc-500">{trip.customerMobile}</div>
                      </td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono text-zinc-300">{formatINR(trip.customerTotal)}</td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono text-emerald-400">{formatINR(trip.totalPaid)}</td>
                      <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right font-mono font-bold text-amber-300">{formatINR(trip.remainingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Customers Widget */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Recent Customers ({customerList.length})
            </h2>
            <Link href="/customers" className="text-xs text-amber-400 hover:underline">
              Directory
            </Link>
          </div>

          <div className="bg-zinc-900/80 p-3.5 sm:p-4 rounded-xl border border-zinc-800 space-y-2.5 shadow-sm">
            {customerList.length === 0 ? (
              <div className="py-4 text-center text-zinc-500 text-xs">
                No customers recorded yet. Add your first customer to get started.
              </div>
            ) : (
              customerList.slice(0, 5).map((cust: any) => (
                <div key={cust.id} className="flex justify-between items-center text-xs pb-2 border-b border-zinc-800/60 last:border-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-zinc-200">{cust.name}</div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-500">{cust.mobile}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono font-semibold">
                      {cust.totalTrips || 0} Runs
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
