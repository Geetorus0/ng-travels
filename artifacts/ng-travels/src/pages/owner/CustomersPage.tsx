import React, { useState } from "react";
import { Users, Search, Plus, Phone, Mail, MapPin, ArrowUpRight, CheckCircle2, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/fareEngine";
import { NGTravelsLoader } from "@/components/loading";

interface CustomersPageProps {
  customers: any[];
  isLoading?: boolean;
  onCustomerCreated?: (newCustomer: any) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ customers = [], isLoading = false }) => {
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
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            Customer Account Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage customer profiles, lifetime trip histories, and pending account balances.
          </p>
        </div>
      </div>

      <div className="relative bg-card/60 p-4 rounded-xl border border-border">
        <Search className="w-4 h-4 text-muted-foreground absolute left-7 top-6.5" />
        <Input
          placeholder="Search by customer name, mobile, email or customer code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-card border-border pl-10 text-xs"
        />
      </div>

      {isLoading && customerList.length === 0 ? (
        <div className="p-12 flex justify-center bg-card/50 rounded-2xl border border-border">
          <NGTravelsLoader size="sm" text="Loading customers..." />
        </div>
      ) : customerList.length === 0 ? (
        <div className="p-12 text-center bg-card/50 rounded-2xl border border-border text-muted-foreground space-y-3">
          <Users className="w-12 h-12 text-muted-foreground mx-auto" />
          <div className="text-sm font-semibold text-foreground">No customers registered yet</div>
          <div className="text-xs text-muted-foreground max-w-sm mx-auto">
            Customers will automatically appear here when booking trips, receiving quotes, or registering new journeys.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-card/50 rounded-2xl border border-border text-muted-foreground text-xs">
          No customer accounts found matching "{search}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c: any) => (
          <div
            key={c.id}
            className="bg-card/70 border border-border rounded-xl p-5 space-y-4 hover:border-border transition-all shadow-md"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400 font-bold">{c.customerId || c.customerCode}</span>
                <h3 className="font-bold text-sm text-foreground mt-0.5">{c.name}</h3>
              </div>
              <span className="text-[10px] bg-muted text-foreground font-mono px-2 py-0.5 rounded border border-border">
                {c.totalTrips || 0} Trip(s)
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{c.mobile}</span>
              </div>
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] block">Lifetime Spent</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatINR(c.totalPaid || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Pending Balance</span>
                <span className={`font-mono font-bold ${Number(c.pending) > 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
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
