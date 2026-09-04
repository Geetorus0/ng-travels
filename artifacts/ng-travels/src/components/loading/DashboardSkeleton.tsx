import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const MetricCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2", className)}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-20 bg-zinc-800/70" />
        <Skeleton className="h-6 w-6 rounded-full bg-zinc-800/60" />
      </div>
      <Skeleton className="h-7 w-28 bg-zinc-800" />
      <Skeleton className="h-2.5 w-36 bg-zinc-800/60" />
    </div>
  );
};

export const QuickAccessSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="p-3 sm:p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/70 flex flex-col justify-between min-h-[85px] space-y-2"
        >
          <Skeleton className="h-5 w-5 rounded-md bg-zinc-800" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-16 bg-zinc-800" />
            <Skeleton className="h-2.5 w-20 bg-zinc-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ScheduleRowSkeleton: React.FC = () => {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 flex items-center justify-between gap-3">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 bg-zinc-800 font-mono" />
          <Skeleton className="h-4 w-16 rounded-full bg-zinc-800/60" />
        </div>
        <Skeleton className="h-3.5 w-48 bg-zinc-800" />
      </div>
      <Skeleton className="h-7 w-20 rounded-lg bg-zinc-800/70" />
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32 bg-amber-400/20" />
          <Skeleton className="h-7 w-64 bg-zinc-800" />
          <Skeleton className="h-3 w-96 max-w-full bg-zinc-800/60" />
        </div>
        <Skeleton className="h-11 w-44 rounded-xl bg-amber-400/20" />
      </div>

      {/* Quick Access Skeleton */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-3.5 w-36 bg-zinc-800" />
          <Skeleton className="h-3 w-16 bg-zinc-800/60" />
        </div>
        <QuickAccessSkeleton />
      </div>

      {/* Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Schedule List Skeleton */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-40 bg-zinc-800" />
          <Skeleton className="h-3 w-20 bg-zinc-800/60" />
        </div>
        <div className="space-y-2">
          <ScheduleRowSkeleton />
          <ScheduleRowSkeleton />
          <ScheduleRowSkeleton />
        </div>
      </div>
    </div>
  );
};
