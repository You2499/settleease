import React from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingRegionProps = {
  label?: string;
  className?: string;
  children: React.ReactNode;
};

export function LoadingRegion({
  label = "Loading content",
  className,
  children,
}: LoadingRegionProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      role="status"
      className={className}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonCardHeader({
  titleWidth = "w-44",
  descriptionWidth = "w-full max-w-md",
  icon = true,
  actions = [],
  className,
}: {
  titleWidth?: string;
  descriptionWidth?: string;
  icon?: boolean;
  actions?: string[];
  className?: string;
}) {
  return (
    <CardHeader className={cn("shrink-0 border-b px-4 py-4 sm:px-6 sm:py-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            {icon ? <Skeleton className="h-5 w-5 shrink-0 rounded" /> : null}
            <Skeleton className={cn("h-7 sm:h-8", titleWidth)} />
          </div>
          <Skeleton className={cn("h-4", descriptionWidth)} />
        </div>
        {actions.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            {actions.map((width, index) => (
              <Skeleton key={`${width}-${index}`} className={cn("h-9 rounded-lg", width)} />
            ))}
          </div>
        ) : null}
      </div>
    </CardHeader>
  );
}

export function SkeletonSectionHeader({
  width = "w-40",
  icon = true,
  actionWidth,
  className,
}: {
  width?: string;
  icon?: boolean;
  actionWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {icon ? <Skeleton className="h-4 w-4 shrink-0 rounded" /> : null}
        <Skeleton className={cn("h-6", width)} />
      </div>
      {actionWidth ? <Skeleton className={cn("h-9 shrink-0 rounded-lg", actionWidth)} /> : null}
    </div>
  );
}

export function SkeletonToolbar({
  count,
  className,
  itemClassName = "h-14 rounded-lg",
}: {
  count: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={cn("grid min-w-0 gap-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={itemClassName} />
      ))}
    </div>
  );
}

export function SkeletonFormField({
  className,
  labelWidth = "w-24",
  controlClassName = "h-10 sm:h-11",
}: {
  className?: string;
  labelWidth?: string;
  controlClassName?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <Skeleton className={cn("h-3.5", labelWidth)} />
      <Skeleton className={cn("w-full rounded-lg", controlClassName)} />
    </div>
  );
}

export function SkeletonMetricTile({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-background p-4", className)}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-3.5 w-full max-w-[160px]" />
    </div>
  );
}

export function SkeletonChartPanel({
  className,
  chartClassName = "h-[220px]",
}: {
  className?: string;
  chartClassName?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-background p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-48 max-w-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className={cn("mt-4 w-full rounded-lg", chartClassName)} />
    </div>
  );
}

export function SkeletonPanel({
  children,
  className,
  titleWidth = "w-36",
  descriptionWidth = "w-56",
}: {
  children: React.ReactNode;
  className?: string;
  titleWidth?: string;
  descriptionWidth?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-background p-4", className)}>
      <div className="space-y-2">
        <Skeleton className={cn("h-5", titleWidth)} />
        <Skeleton className={cn("h-3.5 max-w-full", descriptionWidth)} />
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

export function ExpenseActivitySkeleton({
  actions = 0,
  showBadge = false,
}: {
  actions?: number;
  showBadge?: boolean;
}) {
  return (
    <li>
      <Card className="rounded-md bg-card/70">
        <CardHeader className="px-3 pb-1.5 pt-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-48 max-w-full sm:h-7" />
              {showBadge ? <Skeleton className="h-5 w-32 rounded-full" /> : null}
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-36" />
          </div>
          {actions > 0 ? (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              {Array.from({ length: actions }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-lg sm:w-20" />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}

export function SettlementActivitySkeleton({ actions = 0 }: { actions?: number }) {
  return (
    <li>
      <Card className="rounded-md border-l-4 border-green-500 bg-card/70">
        <CardHeader className="px-3 pb-1.5 pt-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-5 w-20 shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            {actions > 0 ? (
              <div className="flex gap-2">
                {Array.from({ length: actions }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-16 rounded-lg" />
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

export function PersonRowSkeleton({ actions = 2 }: { actions?: number }) {
  return (
    <Card className="rounded-md bg-card/70">
      <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
        <Skeleton className="h-5 w-32 max-w-full" />
        <div className="flex shrink-0 gap-1 sm:gap-2">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
    </Card>
  );
}

export function StepRailSkeleton({ steps = 4 }: { steps?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {Array.from({ length: steps }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-background p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-full max-w-[120px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
