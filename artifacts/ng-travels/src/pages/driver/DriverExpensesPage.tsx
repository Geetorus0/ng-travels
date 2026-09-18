import React from "react";
import { Receipt, Plus, Fuel, Clock, CheckCircle2, XCircle, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/fareEngine";
import { NGTravelsLoader } from "@/components/loading";

interface DriverExpensesPageProps {
  expenses: any[];
  isLoading?: boolean;
  onOpenExpenseModal: () => void;
}

export const DriverExpensesPage: React.FC<DriverExpensesPageProps> = ({
  expenses = [],
  isLoading = false,
  onOpenExpenseModal,
}) => {
  const totalSubmitted = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            My Operational Expenses
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Log fuel, highway tolls, parking and food allowance claims.
          </p>
        </div>
        <Button
          size="sm"
          onClick={onOpenExpenseModal}
          className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs h-9 px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      <div className="bg-card/70 p-3 rounded-xl border border-border flex justify-between items-center text-xs">
        <span className="text-muted-foreground">Total Claims Submitted:</span>
        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">{formatINR(totalSubmitted)}</span>
      </div>

      <div className="space-y-2.5">
        {isLoading && expenses.length === 0 ? (
          <div className="bg-card/60 p-8 flex justify-center rounded-2xl border border-border">
            <NGTravelsLoader size="sm" text="Loading expenses..." />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-card/60 p-8 rounded-2xl border border-border text-center text-muted-foreground text-xs">
            No expenses logged yet. Tap "+ Add" to claim fuel or toll expenses.
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-card/80 border border-border rounded-xl p-3.5 space-y-1.5 text-xs shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-foreground text-sm">{exp.category}</span>
                  <div className="text-muted-foreground text-[10px] mt-0.5">
                    {new Date(exp.expenseDate || exp.createdAt).toLocaleDateString("en-IN")} • Trip #{exp.tripId}
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                  {formatINR(exp.amount)}
                </span>
              </div>

              {exp.location && <div className="text-muted-foreground text-[11px]">Location: {exp.location}</div>}
              {exp.notes && <div className="text-muted-foreground text-[11px] italic">Notes: {exp.notes}</div>}

              {exp.receiptPath && (
                <a
                  href={exp.receiptPath}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-400 hover:underline"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> View Proof of Payment
                </a>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border/80">
                <span className="text-muted-foreground text-[10px]">Status:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                  exp.status === "approved" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30" :
                  exp.status === "rejected" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30" :
                  "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse"
                }`}>
                  {exp.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
