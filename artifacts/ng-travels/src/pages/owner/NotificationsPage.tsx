import React from "react";
import { Bell, CheckCheck, Clock, CheckCircle2, Navigation, CircleDollarSign, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationsPageProps {
  notifications: any[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
}) => {
  const notifList = Array.isArray(notifications) ? notifications : (Array.isArray((notifications as any)?.items) ? (notifications as any).items : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Operations Alerts & Notifications
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time feed of driver milestone updates, new booking confirmations, and expense submissions.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onMarkAllRead}
          className="border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Mark All as Read
        </Button>
      </div>

      <div className="space-y-3">
        {notifList.length === 0 ? (
          <div className="bg-zinc-900/60 p-12 text-center text-zinc-500 rounded-xl border border-zinc-800 text-xs">
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
                    ? "bg-zinc-900/40 border-zinc-800/80 text-zinc-400"
                    : "bg-zinc-900/90 border-amber-500/40 text-zinc-100 shadow-md ring-1 ring-amber-500/20"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl ${
                    notif.isRead ? "bg-zinc-800 text-zinc-500" : "bg-amber-400 text-zinc-950 font-bold"
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
                    <h3 className="font-bold text-sm text-zinc-100">{notif.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                      {dateStr} at {timeStr}
                    </span>
                  </div>
                </div>

                {!notif.isRead && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onMarkRead(notif.id)}
                    className="text-xs text-amber-400 hover:bg-amber-950/30"
                  >
                    Mark read
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
