import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wifi,
  WifiOff,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Server,
  Zap,
} from "lucide-react";
import { syncEngine, type SyncState, getDefaultServerUrl } from "@/lib/syncEngine";
import { toast } from "sonner";
import { ConnectionIndicator } from "@/components/loading";

export function SyncStatusModal() {
  const [open, setOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(syncEngine.getState());
  const [targetUrl, setTargetUrl] = useState(syncState.serverUrl || getDefaultServerUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    return syncEngine.subscribe((state) => {
      setSyncState(state);
      setTargetUrl(state.serverUrl || getDefaultServerUrl());
    });
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await syncEngine.testConnection(targetUrl);
      setTestResult(res);
      if (res.success) {
        toast.success("Connection Successful!", { description: res.message });
      } else {
        toast.error("Connection Failed", { description: res.message });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await syncEngine.setServerUrl(targetUrl);
    toast.success("Backend Server Updated", {
      description: `Operations connected to ${targetUrl}`,
    });
    setOpen(false);
  };

  return (
    <>
      <ConnectionIndicator onClick={() => setOpen(true)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-zinc-100">
                  Operations Backend Network
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Real-time synchronization across Web, Owner APK, and Driver APK
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4 text-xs">
            {/* Connection Indicator */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              syncState.status === "connected"
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                : syncState.status === "connecting"
                ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                : "bg-rose-950/20 border-rose-500/30 text-rose-300"
            }`}>
              {syncState.status === "connected" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : syncState.status === "connecting" ? (
                <Zap className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-bold text-sm capitalize">{syncState.status}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {syncState.status === "connected"
                    ? `Connected to ${syncState.serverUrl}`
                    : syncState.errorMessage || "Connecting to NG Travels operations server..."}
                </div>
              </div>
            </div>

            {/* Server URL Input */}
            <div className="space-y-2 pt-1">
              <Label htmlFor="server-url" className="text-xs text-zinc-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-amber-400" />
                Backend API Server Endpoint
              </Label>
              <Input
                id="server-url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://ng-travels-operations.vercel.app"
                className="bg-zinc-900 border-zinc-800 text-xs font-mono py-4 text-zinc-200"
              />
              <p className="text-[11px] text-zinc-500">
                Default: Production cloud backend endpoint.
              </p>
            </div>

            {/* Test result message */}
            {testResult && (
              <div className={`p-3 rounded-lg text-[11px] font-mono border ${
                testResult.success
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}>
                {testResult.message}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
              className="text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs text-zinc-400 cursor-pointer"
              >
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="text-xs bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold cursor-pointer"
              >
                Save & Connect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
