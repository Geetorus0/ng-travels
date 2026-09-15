import React, { useState } from "react";
import { Bell, CheckCheck, Clock, CheckCircle2, Navigation, CircleDollarSign, Fuel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NGTravelsLoader } from "@/components/loading";

interface NotificationsPageProps {
  notifications: any[];
  isLoading?: boolean;
  onMarkRead: (id: number) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications = [],
  isLoading = false,
  onMarkRead,
  onMarkAllRead,
}) => {
  const notifList = Array.isArray(notifications) ? notifications : (Array.isArray((notifications as any)?.items) ? (notifications as any).items : []);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkRead = async (id: number) => {
    if (pendingId) return;
    setPendingId(id);
    try {
      await onMarkRead(id);
    } finally {
      setPendingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await onMarkAllRead();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            Operations Alerts & Notifications
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time feed of driver milestone updates, new booking confirmations, and expense submissions.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkAllRead}
          disabled={markingAll}
          className="border-border text-xs text-foreground hover:bg-muted"
        >
          {markingAll ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-700 dark:text-emerald-400" />
          )}
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading && notifList.length === 0 ? (
          <div className="bg-card/60 p-12 flex justify-center rounded-xl border border-border">
            <NGTravelsLoader size="sm" text="Loading notifications..." />
          </div>
        ) : notifList.length === 0 ? (
          <div className="bg-card/60 p-12 text-center text-muted-foreground rounded-xl border border-border text-xs">
            No notifications in your inbox.
          </div>
        ) : (
          notifList.map((notif: any) => {
            const timeStr = new Date(notif.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const dateStr = new Date(notif.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            });

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                  notif.isRead
                    ? "bg-card/40 border-border/80 text-muted-foreground"
                    : "bg-card/90 border-amber-300 dark:border-amber-500/40 text-foreground shadow-md ring-1 ring-amber-500/20"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl ${
                    notif.isRead ? "bg-muted text-muted-foreground" : "bg-amber-400 text-zinc-950 font-bold"
                  }`}>
                    {notif.kind?.includes("payment") ? (
                      <CircleDollarSign className="w-5 h-5" />
                    ) : notif.kind?.includes("expense") ? (
                      <Fuel className="w-5 h-5" />
                    ) : (
                      <Navigation className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{notif.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                      {dateStr} at {timeStr}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkRead(notif.id)}
                    disabled={pendingId === notif.id}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-950/30"
                  >
                    {pendingId === notif.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Mark read"
                    )}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
