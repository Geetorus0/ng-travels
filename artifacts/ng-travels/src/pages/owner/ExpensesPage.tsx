import React, { useState } from "react";
import { Fuel, Search, CheckCircle2, XCircle, Check, X, Filter, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/fareEngine";

interface ExpensesPageProps {
  expenses: any[];
  trips: any[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  expenses = [],
  trips = [],
  onApprove,
  onReject,
}) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const expenseList = Array.isArray(expenses) ? expenses : (Array.isArray((expenses as any)?.items) ? (expenses as any).items : []);
  const tripList = Array.isArray(trips) ? trips : (Array.isArray((trips as any)?.items) ? (trips as any).items : []);

  const totalApproved = expenseList
    .filter((e: any) => e.status === "approved")
    .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  const filtered = expenseList.filter((e: any) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-rose-400" />
            Company Expense Approvals & Fleet Spend
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review driver receipts, approve diesel/toll claims, and track company operating expenditure.
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-right">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Total Approved Spend</span>
          <span className="text-xl font-mono font-bold text-rose-400">{formatINR(totalApproved)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
        <div className="w-full sm:w-52">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
              <SelectValue placeholder="Approval Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
              <SelectItem value="all">All Approvals</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-52">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs">
              <SelectValue placeholder="Expense Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Fuel">Fuel (Diesel / Petrol)</SelectItem>
              <SelectItem value="Toll">Toll</SelectItem>
              <SelectItem value="Parking">Parking</SelectItem>
              <SelectItem value="Food">Food / Allowance</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Booking Ref</th>
              <th className="py-3 px-4">Submitted By</th>
              <th className="py-3 px-4">Details & Location</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Approval Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  No expense records match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((exp: any) => {
                const trip = tripList.find((t: any) => t.id === exp.tripId);
                const dateStr = new Date(exp.expenseDate || exp.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <tr key={exp.id} className="hover:bg-zinc-800/40 transition-all">
                    <td className="py-3 px-4 text-zinc-400">{dateStr}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-200">{exp.category}</td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {trip?.bookingId || `Trip #${exp.tripId}`}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{exp.recordedBy || "Driver"}</td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="truncate text-zinc-300">{exp.notes || "Standard claim"}</div>
                      {exp.location && <div className="text-[10px] text-zinc-500 truncate">{exp.location}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        exp.status === "approved" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        exp.status === "rejected" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                        "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}>
                        {exp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {exp.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => onApprove(exp.id)}
                            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onReject(exp.id)}
                            className="h-7 px-2 text-rose-400 hover:bg-rose-950/30 text-[11px]"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500">
                          {exp.status === "approved" ? `Approved by ${exp.approvedBy || "Admin"}` : "Rejected"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
