import React, { useState } from "react";
import { Link } from "wouter";
import { CalendarDays, ChevronLeft, ChevronRight, Navigation, Clock, User, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarPageProps {
  trips: any[];
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ trips = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group trips by date string 'YYYY-MM-DD'
  const tripList = Array.isArray(trips) ? trips : (Array.isArray((trips as any)?.items) ? (trips as any).items : []);
  const tripsByDate = tripList.reduce((acc: Record<string, any[]>, trip: any) => {
    try {
      const dStr = new Date(trip.startDate).toISOString().slice(0, 10);
      if (!acc[dStr]) acc[dStr] = [];
      acc[dStr].push(trip);
    } catch {}
    return acc;
  }, {});

  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            Operations Trip Calendar
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Visual schedule of fleet departures, outstation bookings, and return dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrevMonth} className="border-zinc-800 h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-sm font-bold text-zinc-200 min-w-[140px] text-center">
            {monthNames[month]} {year}
          </div>
          <Button size="sm" variant="outline" onClick={handleNextMonth} className="border-zinc-800 h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-xs font-bold text-zinc-400 py-3 bg-zinc-900">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800/60 text-xs">
          {daysArray.map((dayNum, idx) => {
            if (dayNum === null) {
              return <div key={idx} className="min-h-[110px] bg-zinc-950/40 p-2" />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayTrips = tripsByDate[dateStr] || [];
            const isToday = new Date().toISOString().slice(0, 10) === dateStr;

            return (
              <div
                key={idx}
                className={`min-h-[110px] p-2 transition-all ${
                  isToday ? "bg-amber-950/10 ring-1 ring-amber-400/30" : "bg-zinc-950/20 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full font-bold text-xs ${
                    isToday ? "bg-amber-400 text-zinc-950" : "text-zinc-400"
                  }`}>
                    {dayNum}
                  </span>
                  {dayTrips.length > 0 && (
                    <span className="text-[10px] bg-zinc-800 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                      {dayTrips.length} run(s)
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-hidden">
                  {dayTrips.slice(0, 3).map((t: any) => (
                    <Link key={t.id} href={`/trips/${t.id}`}>
                      <div className="bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded border border-zinc-800 text-[10px] truncate cursor-pointer transition-all">
                        <div className="font-bold text-zinc-200 truncate flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          {t.destination?.name || t.destination?.address || "Trip"}
                        </div>
                        <div className="text-zinc-500 text-[9px] truncate">
                          {t.startTime} • {t.customerName || "Customer"}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {dayTrips.length > 3 && (
                    <div className="text-[9px] text-zinc-500 font-semibold text-center">
                      +{dayTrips.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
