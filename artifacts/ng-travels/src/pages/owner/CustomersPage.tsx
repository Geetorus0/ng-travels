import React, { useState } from "react";
import { Users, Search, Plus, Phone, Mail, MapPin, ArrowUpRight, CheckCircle2, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/fareEngine";

interface CustomersPageProps {
  customers: any[];
  onCustomerCreated?: (newCustomer: any) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ customers = [] }) => {
  const [search, setSearch] = useState("");

  const customerList = Array.isArray(customers) ? customers : (Array.isArray((customers as any)?.items) ? (customers as any).items : []);

  const filtered = customerList.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.mobile?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.customerCode?.toLowerCase().includes(q) ||
      c.customerId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Customer Account Directory
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage customer profiles, lifetime trip histories, and pending account balances.
          </p>
        </div>
      </div>

      <div className="relative bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
        <Search className="w-4 h-4 text-zinc-500 absolute left-7 top-6.5" />
        <Input
          placeholder="Search by customer name, mobile, email or customer code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border-zinc-800 pl-10 text-xs"
        />
      </div>

      {customerList.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-400 space-y-3">
          <Users className="w-12 h-12 text-zinc-600 mx-auto" />
          <div className="text-sm font-semibold text-zinc-300">No customers registered yet</div>
          <div className="text-xs text-zinc-500 max-w-sm mx-auto">
            Customers will automatically appear here when booking trips, receiving quotes, or registering new journeys.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-400 text-xs">
          No customer accounts found matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c: any) => (
          <div
            key={c.id}
            className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 space-y-4 hover:border-zinc-700 transition-all shadow-md"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[11px] text-amber-400 font-bold">{c.customerId || c.customerCode}</span>
                <h3 className="font-bold text-sm text-zinc-100 mt-0.5">{c.name}</h3>
              </div>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded border border-zinc-700">
                {c.totalTrips || 0} Trip(s)
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                <span>{c.mobile}</span>
              </div>
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 text-[10px] block">Lifetime Spent</span>
                <span className="font-mono font-bold text-emerald-400">{formatINR(c.totalPaid || 0)}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block">Pending Balance</span>
                <span className={`font-mono font-bold ${Number(c.pending) > 0 ? "text-amber-300" : "text-zinc-400"}`}>
                  {formatINR(c.pending || 0)}
                </span>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};
