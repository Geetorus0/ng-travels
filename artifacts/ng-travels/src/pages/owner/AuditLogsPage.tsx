import React, { useState } from "react";
import { ShieldCheck, Search, Clock, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NGTravelsLoader } from "@/components/loading";

interface AuditLogsPageProps {
  logs: any[];
  isLoading?: boolean;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs = [], isLoading = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const logList = Array.isArray(logs) ? logs : (Array.isArray((logs as any)?.items) ? (logs as any).items : []);

  const filteredLogs = logList.filter((log: any) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (log.actorName && log.actorName.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.entity && log.entity.toLowerCase().includes(q)) ||
      (log.entityId && String(log.entityId).toLowerCase().includes(q)) ||
      (log.newValue && String(log.newValue).toLowerCase().includes(q)) ||
      (log.oldValue && String(log.oldValue).toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          Operations Audit Trail & Compliance Log
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Immutable event log tracking trip creations, status changes, odometer submissions, payments, and approvals.
        </p>
      </div>

      <div className="relative bg-card/60 p-4 rounded-xl border border-border">
        <Search className="w-4 h-4 text-muted-foreground absolute left-7 top-6.5" />
        <Input
          placeholder="Search audit trail by actor (e.g. Admin), action (e.g. CREATE, APPROVE), or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-card border-border pl-10 text-xs placeholder:text-muted-foreground"
        />
      </div>

      <div className="bg-card/70 border border-border rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-card text-muted-foreground border-b border-border uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && logList.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <div className="flex justify-center">
                    <NGTravelsLoader size="sm" text="Loading audit trail..." />
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  {searchTerm ? `No audit logs matching "${searchTerm}".` : "No audit logs recorded yet."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log: any) => {
                const dateStr = new Date(log.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });
                return (
                  <tr key={log.id} className="hover:bg-muted/40 transition-all">
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">{dateStr}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">{log.actorName || "System"}</td>
                    <td className="py-3 px-4 font-bold text-amber-700 dark:text-amber-400">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground uppercase text-[10px]">
                      {log.entity} #{log.entityId}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-foreground font-mono text-[11px]">
                      {log.newValue || log.oldValue || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};
