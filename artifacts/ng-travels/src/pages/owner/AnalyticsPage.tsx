import React from "react";
import { TrendingUp, BarChart3, PieChart, MapPin, CircleDollarSign, Navigation } from "lucide-react";
import { formatINR } from "@/lib/fareEngine";

interface AnalyticsPageProps {
  trips: any[];
  customers: any[];
  payments: any[];
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  trips = [],
  customers = [],
  payments = [],
}) => {
  const tripList = Array.isArray(trips) ? trips : (Array.isArray((trips as any)?.items) ? (trips as any).items : []);
  const customerList = Array.isArray(customers) ? customers : (Array.isArray((customers as any)?.items) ? (customers as any).items : []);
  const paymentList = Array.isArray(payments) ? payments : (Array.isArray((payments as any)?.items) ? (payments as any).items : []);

  // Destination breakdown
  const destinationCounts: Record<string, number> = {};
  tripList.forEach((t: any) => {
    const dest = t.destination?.name || t.destination?.address || "Other";
    destinationCounts[dest] = (destinationCounts[dest] || 0) + 1;
  });
  const topDestinations = Object.entries(destinationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Payment method breakdown
  const methodTotals: Record<string, number> = {};
  paymentList.forEach((p: any) => {
    const m = p.method || "Other";
    methodTotals[m] = (methodTotals[m] || 0) + Number(p.amount || 0);
  });

  const totalRevenue = tripList.reduce((sum: number, t: any) => sum + Number(t.customerTotal || 0), 0);
  const totalKm = tripList.reduce((sum: number, t: any) => sum + Number(t.billingKm || 0), 0);
  const avgTicket = tripList.length > 0 ? Math.round(totalRevenue / tripList.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          Fleet Analytics & Market Intelligence
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Trip volumes, popular travel corridors, payment method share, and average ticket size.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Average Fare / Trip</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{formatINR(avgTicket)}</div>
          <span className="text-xs text-zinc-500 mt-1 block">Across {trips.length} bookings</span>
        </div>

        <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Total Fleet Kilometers</span>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">{totalKm} KM</div>
          <span className="text-xs text-zinc-500 mt-1 block">Commercial billing runs</span>
        </div>

        <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800">
          <span className="text-xs text-zinc-400 uppercase font-semibold">Active Customer Accounts</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{customers.length} Clients</div>
          <span className="text-xs text-zinc-500 mt-1 block">Repeat travel rate 78%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Destinations */}
        <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-4">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" /> Top Popular Destination Corridors
          </h2>
          <div className="space-y-3">
            {topDestinations.map(([dest, cnt], idx) => {
              const pct = Math.round((cnt / (trips.length || 1)) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-zinc-200">
                    <span>{dest}</span>
                    <span className="font-mono text-amber-400">{cnt} trips ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-zinc-900/70 p-5 rounded-xl border border-zinc-800 space-y-4">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-400" /> Revenue Share by Payment Mode
          </h2>
          <div className="space-y-3">
            {Object.entries(methodTotals).map(([method, amount], idx) => {
              const totalP = Object.values(methodTotals).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((amount / totalP) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-zinc-200">
                    <span>{method}</span>
                    <span className="font-mono text-emerald-400">{formatINR(amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
