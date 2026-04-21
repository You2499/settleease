"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Eye,
  RefreshCw,
  Sparkles,
  UserSquare,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DonutChart, LineChart, StackedAreaChart } from "./analytics/VisxPrimitives";
import { cn } from "@/lib/utils";
import {
  describeHealthChunkActivity,
  formatCalories,
  formatGrams,
  formatServings,
  resolveHealthDateRange,
} from "@/lib/settleease/healthSurfaceModel";
import type {
  HealthDatePreset,
  HealthGranularity,
  HealthMode,
  HealthParticipantLensPayload,
  HealthSurfaceCoverage,
  HealthSurfaceStatus,
  HealthSurfaceState,
} from "@/lib/settleease/healthTypes";
import type { Category, Expense, Person } from "@/lib/settleease/types";
import { useHealthSurface } from "@/hooks/useHealthSurface";

const ExpenseDetailModal = dynamic(() => import("./ExpenseDetailModal"), {
  ssr: false,
});

interface HealthTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingCategories?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

const DATE_PRESETS: Array<{ value: HealthDatePreset; label: string }> = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

const displayHeadingStyle: React.CSSProperties = {
  fontFamily: "\"Waldenburg\", \"Iowan Old Style\", \"Times New Roman\", serif",
  fontWeight: 300,
  letterSpacing: "-0.04em",
};

const capsHeadingStyle: React.CSSProperties = {
  fontFamily: "\"WaldenburgFH\", var(--font-inter), serif",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const selectTriggerClass =
  "h-11 rounded-full border-border/60 bg-white/90 px-4 text-sm shadow-sm transition-none hover:bg-background hover:text-foreground data-[state=open]:bg-background";
const selectItemClass =
  "transition-none hover:bg-transparent hover:text-popover-foreground focus:bg-transparent focus:text-popover-foreground data-[highlighted]:bg-transparent data-[highlighted]:text-popover-foreground";

interface SurfaceChromeState {
  status: HealthSurfaceStatus;
  coverage: HealthSurfaceCoverage;
  isRefreshing: boolean;
}

function HeroPillButton({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium tracking-[0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-transparent bg-black text-white shadow-lg"
          : "border-border/70 bg-white/90 text-foreground shadow-sm hover:bg-secondary/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SurfaceBadge({ state }: { state: SurfaceChromeState | null }) {
  if (!state) return null;
  if (state.status === "partial") {
    return (
      <Badge variant="outline" className="rounded-full bg-secondary/40">
        {state.coverage.coveragePercent}% ready
      </Badge>
    );
  }
  if (state.status === "generating") {
    return (
      <Badge variant="outline" className="rounded-full bg-secondary/40">
        Estimating
      </Badge>
    );
  }
  if (state.isRefreshing) {
    return (
      <Badge variant="outline" className="rounded-full bg-secondary/40">
        Refreshing
      </Badge>
    );
  }
  if (state.status === "failed") {
    return (
      <Badge variant="outline" className="rounded-full bg-secondary/40">
        Needs retry
      </Badge>
    );
  }
  return null;
}

function SurfaceFrame({
  eyebrow,
  title,
  description,
  state,
  actions,
  children,
  className,
  tone = "white",
}: {
  eyebrow: string;
  title: string;
  description: string;
  state: SurfaceChromeState | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "white" | "warm";
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[24px] border border-border/70 shadow-lg motion-safe:animate-in motion-safe:fade-in-50",
        tone === "warm" ? "bg-[rgba(245,242,239,0.72)]" : "bg-white/95",
        className,
      )}
    >
      <CardContent className="flex h-full flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p
              className="text-[11px] text-muted-foreground"
              style={capsHeadingStyle}
            >
              {eyebrow}
            </p>
            <h2
              className="mt-3 text-[2rem] leading-[1.08] text-foreground"
              style={displayHeadingStyle}
            >
              {title}
            </h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceBadge state={state} />
            {actions}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[20px] bg-secondary/35 px-4 py-5 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
      {message}
    </div>
  );
}

function FailurePanel({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => Promise<void> | void;
  isRetrying: boolean;
}) {
  return (
    <div className="rounded-[20px] bg-secondary/35 p-4 text-sm leading-6 tracking-[0.01em] text-foreground">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-foreground" />
        <div className="min-w-0">
          <p>{message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            onClick={() => void onRetry()}
            disabled={isRetrying}
          >
            <RefreshCw className={cn("h-4 w-4", isRetrying ? "animate-spin" : "")} />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingPanel({
  state,
  skeleton,
}: {
  state: SurfaceChromeState | null;
  skeleton: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {skeleton}
      <p className="text-sm leading-6 tracking-[0.01em] text-muted-foreground">
        {describeHealthChunkActivity(state?.coverage.activeChunkLabel || null)}
      </p>
    </div>
  );
}

function SurfaceBody<TPayload>({
  surfaceState,
  isInitialLoading,
  retry,
  isRetrying,
  skeleton,
  emptyMessage,
  children,
}: {
  surfaceState: HealthSurfaceState<TPayload> | null;
  isInitialLoading: boolean;
  retry: () => Promise<void> | void;
  isRetrying: boolean;
  skeleton: React.ReactNode;
  emptyMessage: string;
  children: (payload: TPayload, state: HealthSurfaceState<TPayload>) => React.ReactNode;
}) {
  if (isInitialLoading || !surfaceState) {
    return <LoadingPanel state={surfaceState} skeleton={skeleton} />;
  }

  if (!surfaceState.payload) {
    if (surfaceState.status === "failed") {
      return (
        <FailurePanel
          message={surfaceState.error || "This health surface could not be estimated yet."}
          onRetry={retry}
          isRetrying={isRetrying}
        />
      );
    }

    if (surfaceState.status === "empty") {
      return <EmptyPanel message={emptyMessage} />;
    }

    return <LoadingPanel state={surfaceState} skeleton={skeleton} />;
  }

  return <>{children(surfaceState.payload, surfaceState)}</>;
}

function SectionHeading({
  label,
  title,
  description,
  icon,
}: {
  label: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary/45 px-3 py-1.5 text-xs text-muted-foreground">
          {icon}
          <span style={capsHeadingStyle}>{label}</span>
        </div>
        <h2 className="mt-4 text-[2.25rem] leading-[1.04]" style={displayHeadingStyle}>
          {title}
        </h2>
      </div>
      <p className="max-w-[58ch] text-sm leading-6 tracking-[0.01em] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function MetricSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div className="space-y-4">
      <Skeleton className={cn("h-14 w-40 rounded-full", large && "h-16 w-52")} />
      <Skeleton className="h-5 w-full max-w-[280px] rounded-full" />
      <Skeleton className="h-5 w-full max-w-[220px] rounded-full" />
    </div>
  );
}

function ChartSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-full max-w-[220px] rounded-full" />
      <Skeleton className={cn("h-[240px] w-full rounded-[20px]", tall && "h-[300px]")} />
    </div>
  );
}

function RankedList({
  rows,
  valueFormatter,
}: {
  rows: Array<{ key: string; label: string; calories: number; share: number; subtitle?: string }>;
  valueFormatter: (value: number) => string;
}) {
  if (!rows.length) {
    return <EmptyPanel message="Nothing has accumulated here yet for the selected range." />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-[18px] bg-secondary/30 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-medium text-foreground shadow-sm">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-foreground">{row.label}</p>
                  {row.subtitle ? (
                    <p className="mt-1 text-sm text-muted-foreground">{row.subtitle}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-foreground">{valueFormatter(row.calories)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.share.toFixed(1)}% of total</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-black/80"
                  style={{ width: `${Math.max(6, Math.min(100, row.share))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero({
  mode,
  onModeChange,
  datePreset,
  onDatePresetChange,
  selectedPersonId,
  onSelectedPersonIdChange,
  people,
  peopleMap,
  isLoadingPeople,
}: {
  mode: HealthMode;
  onModeChange: (mode: HealthMode) => void;
  datePreset: HealthDatePreset;
  onDatePresetChange: (preset: HealthDatePreset) => void;
  selectedPersonId: string | null;
  onSelectedPersonIdChange: (personId: string) => void;
  people: Person[];
  peopleMap: Record<string, string>;
  isLoadingPeople: boolean;
}) {
  return (
    <section className="rounded-[32px] border border-border/60 bg-white/95 shadow-lg">
      <div className="grid gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1.2fr_0.95fr] lg:items-end">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/45 px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span style={capsHeadingStyle}>Health Journal</span>
          </div>
          <h1 className="mt-5 text-[3rem] leading-[0.95] text-foreground sm:text-[3.5rem]" style={displayHeadingStyle}>
            Health
          </h1>
          <p className="mt-4 max-w-[64ch] text-[15px] leading-7 tracking-[0.01em] text-muted-foreground sm:text-base">
            A calmer read on food and alcohol intake, estimated from your expense history and revealed as cached month chunks become ready.
          </p>
          <div className="mt-5 inline-flex items-start gap-3 rounded-[24px] bg-[rgba(245,242,239,0.8)] px-4 py-3 shadow-sm">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <p className="text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              Every number in Health comes from AI-estimated ledger rows. Filters and charts only regroup those cached estimates, so changing views should feel lighter over time.
            </p>
          </div>
        </div>

        <div className="grid gap-5">
          <div>
            <p className="mb-3 text-[11px] text-muted-foreground" style={capsHeadingStyle}>
              Lens
            </p>
            <div className="flex flex-wrap gap-2">
              <HeroPillButton selected={mode === "group"} onClick={() => onModeChange("group")}>
                <Eye className="mr-2 h-4 w-4" />
                Group
              </HeroPillButton>
              <HeroPillButton selected={mode === "personal"} onClick={() => onModeChange("personal")}>
                <UserSquare className="mr-2 h-4 w-4" />
                Personal
              </HeroPillButton>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] text-muted-foreground" style={capsHeadingStyle}>
              Time Window
            </p>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <HeroPillButton
                  key={preset.value}
                  selected={datePreset === preset.value}
                  onClick={() => onDatePresetChange(preset.value)}
                >
                  {preset.label}
                </HeroPillButton>
              ))}
            </div>
          </div>

          {mode === "personal" ? (
            <div>
              <Label htmlFor="health-person" className="mb-3 block text-[11px] text-muted-foreground" style={capsHeadingStyle}>
                Person
              </Label>
              <Select
                value={selectedPersonId || ""}
                onValueChange={onSelectedPersonIdChange}
                disabled={isLoadingPeople || people.length === 0}
              >
                <SelectTrigger id="health-person" className={selectTriggerClass}>
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id} className={selectItemClass}>
                      {peopleMap[person.id] || person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TrustAndCoverageSurface({
  mode,
  selectedPersonId,
  startDate,
  endDate,
}: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "trustAndCoverage",
    mode,
    selectedPersonId,
    startDate,
    endDate,
  });

  return (
    <SurfaceFrame
      eyebrow="Trust & Coverage"
      title="What is already grounded"
      description="Health reveals itself as cached months become available. Partial reads stay visible while missing periods continue to estimate in the background."
      state={surfaceState}
      tone="warm"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[18px]" />
            ))}
          </div>
        }
        emptyMessage="No candidate rows landed in this window yet."
      >
        {(payload, state) => (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Coverage", value: payload.coverageLabel },
                { label: "Cache", value: payload.cacheLabel },
                { label: "Confidence", value: payload.confidenceLabel },
                { label: "Latest update", value: payload.latestUpdateLabel },
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] bg-white/85 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 tracking-[0.01em] text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-[20px] bg-white/70 px-4 py-4 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.disclaimer}
              {payload.ignoredRowCount > 0 ? ` ${payload.ignoredRowCount} entries were marked as non-health and excluded from totals.` : ""}
            </div>
            {payload.failureMessage && state.status !== "cached" ? (
              <div className="rounded-[18px] bg-white/80 px-4 py-4 text-sm leading-6 tracking-[0.01em] text-foreground">
                {payload.failureMessage}
              </div>
            ) : null}
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function OverviewCaloriesSurface({
  mode,
  selectedPersonId,
  startDate,
  endDate,
}: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "overviewCalories",
    mode,
    selectedPersonId,
    startDate,
    endDate,
  });

  return (
    <SurfaceFrame
      eyebrow="This Period"
      title="Calories"
      description="Estimated intake for the selected window, shaped by cached month chunks rather than one blocking dashboard run."
      state={surfaceState}
      className="lg:min-h-[360px]"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<MetricSkeleton large />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) => (
          <div className="flex h-full flex-col justify-between gap-6">
            <div>
              <p className="text-[4rem] leading-none text-foreground sm:text-[4.75rem]" style={displayHeadingStyle}>
                {Math.round(payload.totalCalories).toLocaleString("en-IN")}
              </p>
              <p className="mt-3 text-base tracking-[0.01em] text-muted-foreground">estimated calories</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Entries</p>
                <p className="mt-3 text-2xl font-medium text-foreground">{payload.entryCount}</p>
              </div>
              <div className="rounded-[20px] bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Leading category</p>
                <p className="mt-3 text-xl font-medium text-foreground">{payload.topCategoryName || "None yet"}</p>
              </div>
            </div>
            <p className="rounded-[20px] bg-secondary/35 px-4 py-4 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.note}
            </p>
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function OverviewMacrosSurface({
  mode,
  selectedPersonId,
  startDate,
  endDate,
}: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "overviewMacros",
    mode,
    selectedPersonId,
    startDate,
    endDate,
  });

  return (
    <SurfaceFrame
      eyebrow="Macro Read"
      title="Protein, carbs, fat"
      description="A lighter read on the macro profile the AI inferred from your expense text."
      state={surfaceState}
      tone="warm"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<MetricSkeleton />}
        emptyMessage="No entries were available for macro estimation in this window."
      >
        {(payload) => (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Protein", value: formatGrams(payload.protein) },
                { label: "Carbs", value: formatGrams(payload.carbs) },
                { label: "Fat", value: formatGrams(payload.fat) },
              ].map((item) => (
                <div key={item.label} className="rounded-[18px] bg-white/85 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-lg font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="rounded-[20px] bg-white/75 px-4 py-4 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.note} {payload.totalMacroGrams > 0 ? `Across all three, that is ${formatGrams(payload.totalMacroGrams)} in total.` : ""}
            </p>
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function OverviewAlcoholSurface({
  mode,
  selectedPersonId,
  startDate,
  endDate,
}: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "overviewAlcohol",
    mode,
    selectedPersonId,
    startDate,
    endDate,
  });

  return (
    <SurfaceFrame
      eyebrow="Alcohol Read"
      title="Alcohol"
      description="A softer estimate of drink servings and the calories tied to them."
      state={surfaceState}
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<MetricSkeleton />}
        emptyMessage="No entries were available for alcohol estimation in this window."
      >
        {(payload) => (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Servings</p>
                <p className="mt-3 text-2xl font-medium text-foreground">{formatServings(payload.servings)}</p>
              </div>
              <div className="rounded-[18px] bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Calories</p>
                <p className="mt-3 text-2xl font-medium text-foreground">{formatCalories(payload.calories)}</p>
              </div>
            </div>
            <p className="rounded-[20px] bg-secondary/35 px-4 py-4 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.note}
              {payload.topAlcoholSourceName ? ` ${payload.topAlcoholSourceName} stood out most in the current selection.` : ""}
            </p>
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function TrendGranularityToggle({
  value,
  onChange,
}: {
  value: HealthGranularity;
  onChange: (value: HealthGranularity) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border/60 bg-white/85 p-1 shadow-sm">
      {(["weekly", "monthly"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium capitalize tracking-[0.01em] transition-colors",
            value === option ? "bg-black text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function CalorieRhythmSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const [granularity, setGranularity] = useState<HealthGranularity>("weekly");
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "calorieRhythm",
    granularity,
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="How Intake Moved"
      title="Calorie rhythm"
      description="The tempo of calorie estimates across the selected range, with a local weekly or monthly lens."
      state={surfaceState}
      actions={<TrendGranularityToggle value={granularity} onChange={setGranularity} />}
      className="lg:min-h-[420px]"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<ChartSkeleton tall />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-secondary/35 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            {payload.data.length > 0 ? (
              <LineChart
                data={payload.data}
                valueLabel="Calories"
                valueFormatter={formatCalories}
                color="#2f7d68"
              />
            ) : (
              <EmptyPanel message="Not enough classified data is ready to draw this rhythm yet." />
            )}
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function MacroRhythmSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const [granularity, setGranularity] = useState<HealthGranularity>("weekly");
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "macroRhythm",
    granularity,
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="How Intake Moved"
      title="Macro rhythm"
      description="A layered view of protein, carbs, and fat as the AI-estimated ledger fills in."
      state={surfaceState}
      actions={<TrendGranularityToggle value={granularity} onChange={setGranularity} />}
      className="lg:min-h-[420px]"
      tone="warm"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<ChartSkeleton tall />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-white/80 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            {payload.data.length > 0 ? (
              <StackedAreaChart
                data={payload.data}
                categories={payload.categories}
                valueFormatter={formatGrams}
              />
            ) : (
              <EmptyPanel message="Not enough classified data is ready to draw this macro rhythm yet." />
            )}
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function AlcoholRhythmSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const [granularity, setGranularity] = useState<HealthGranularity>("weekly");
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "alcoholRhythm",
    granularity,
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="How Intake Moved"
      title="Alcohol rhythm"
      description="A narrower look at when alcohol-linked calories peaked."
      state={surfaceState}
      actions={<TrendGranularityToggle value={granularity} onChange={setGranularity} />}
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<ChartSkeleton />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-secondary/35 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            {payload.data.length > 0 ? (
              <LineChart
                data={payload.data}
                valueLabel="Alcohol calories"
                valueFormatter={formatCalories}
                color="#c47f2a"
              />
            ) : (
              <EmptyPanel message="No alcohol-signaled entries are ready to chart yet." />
            )}
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function SourceSplitSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "sourceSplit",
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="Where It Came From"
      title="Food vs alcohol"
      description="A softer split of estimated calories between food-oriented and alcohol-oriented entries."
      state={surfaceState}
      className="lg:min-h-[420px]"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<ChartSkeleton tall />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-secondary/35 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.narrative}
            </p>
            {payload.breakdown.length > 0 ? (
              <DonutChart data={payload.breakdown} valueFormatter={formatCalories} />
            ) : (
              <EmptyPanel message="No classified food or alcohol estimates are ready yet." />
            )}
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function TopCategoriesSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "topCategories",
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="Where It Came From"
      title="Top categories"
      description="Which categories carried the biggest share of estimated intake."
      state={surfaceState}
      tone="warm"
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<ChartSkeleton />}
        emptyMessage="No category estimates are ready yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-white/80 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            <RankedList rows={payload.rows} valueFormatter={formatCalories} />
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function TopContributorsSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "topContributors",
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="Where It Came From"
      title="Top contributors"
      description="The items or expenses that contributed the most estimated calories."
      state={surfaceState}
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<ChartSkeleton />}
        emptyMessage="No contributor estimates are ready yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-secondary/35 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            <RankedList rows={payload.rows} valueFormatter={formatCalories} />
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function ParticipantLensSurface(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "participantLens",
    ...props,
  });

  return (
    <SurfaceFrame
      eyebrow="People"
      title="Shared intake"
      description="A participant view built from shared item rows and apportioned expense rows."
      state={surfaceState}
      tone="warm"
    >
      <SurfaceBody<HealthParticipantLensPayload>
        surfaceState={surfaceState as HealthSurfaceState<HealthParticipantLensPayload> | null}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-[20px]" />
            ))}
          </div>
        }
        emptyMessage="No participant allocations are ready yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-white/75 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {payload.rows.map((row) => (
                <div key={row.personId} className="rounded-[20px] bg-white/85 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-foreground">{row.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.entryCount} estimated entries</p>
                    </div>
                    <Badge variant="outline" className="rounded-full bg-secondary/35">
                      {row.shareOfCalories.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <span>Calories</span>
                      <span className="font-medium text-foreground">{formatCalories(row.calories)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Alcohol</span>
                      <span className="font-medium text-foreground">{formatServings(row.alcoholServings)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function LedgerSurface({
  mode,
  selectedPersonId,
  startDate,
  endDate,
  onOpenExpense,
}: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
  onOpenExpense: (expenseId: string) => void;
}) {
  const { surfaceState, isInitialLoading, retry, isRetrying } = useHealthSurface({
    surfaceId: "ledgerList",
    mode,
    selectedPersonId,
    startDate,
    endDate,
  });

  return (
    <SurfaceFrame
      eyebrow="Estimated Ledger"
      title="Journal"
      description="The entries underneath Health, kept close to the expense detail you already have."
      state={surfaceState}
    >
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-[20px]" />
            ))}
          </div>
        }
        emptyMessage="No AI-estimated health entries are ready for this range."
      >
        {(payload) => (
          <div className="space-y-4">
            <p className="rounded-[18px] bg-secondary/35 px-4 py-3 text-sm leading-6 tracking-[0.01em] text-muted-foreground">
              {payload.summary}
            </p>
            {payload.rows.length > 0 ? (
              <div className="space-y-3">
                {payload.rows.map((row) => (
                  <button
                    key={row.sourceKey}
                    type="button"
                    className="w-full rounded-[22px] bg-white/95 p-4 text-left shadow-sm transition-colors hover:bg-secondary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpenExpense(row.expenseId)}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-lg font-medium text-foreground">{row.title}</span>
                          <Badge variant="outline" className="rounded-full bg-secondary/35">
                            {row.classification}
                          </Badge>
                          <Badge variant="outline" className="rounded-full">
                            {row.confidence}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {row.categoryName} • {row.dateLabel}
                        </p>
                        <p className="mt-3 max-w-[70ch] text-sm leading-6 tracking-[0.01em] text-muted-foreground">
                          {row.rationale}
                        </p>
                      </div>
                      <div className="grid shrink-0 grid-cols-2 gap-x-5 gap-y-2 text-sm sm:min-w-[260px]">
                        <span className="text-muted-foreground">Calories</span>
                        <span className="text-right font-medium text-foreground">{formatCalories(row.calories)}</span>
                        <span className="text-muted-foreground">Macros</span>
                        <span className="text-right font-medium text-foreground">
                          {formatGrams(row.protein)} / {formatGrams(row.carbs)} / {formatGrams(row.fat)}
                        </span>
                        <span className="text-muted-foreground">Alcohol</span>
                        <span className="text-right font-medium text-foreground">
                          {formatServings(row.alcoholServings)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyPanel message="No AI-estimated health entries are ready for this range." />
            )}
          </div>
        )}
      </SurfaceBody>
    </SurfaceFrame>
  );
}

function GlobalEmptyState({ hasExpenses }: { hasExpenses: boolean }) {
  return (
    <Card className="rounded-[32px] border border-border/60 bg-white/95 shadow-lg">
      <CardContent className="px-6 py-10 text-center sm:px-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary/50">
          <Sparkles className="h-5 w-5 text-foreground" />
        </div>
        <h2 className="mt-5 text-[2.5rem] leading-[1.02]" style={displayHeadingStyle}>
          Nothing to read yet
        </h2>
        <p className="mx-auto mt-4 max-w-[56ch] text-sm leading-7 tracking-[0.01em] text-muted-foreground sm:text-base">
          {hasExpenses
            ? "Add Food or Alcohol expenses with recognizable item names or descriptions to unlock Health estimates."
            : "Add Food or Alcohol expenses to unlock Health estimates. Once the ledger has something to classify, cards and charts will begin to reveal themselves progressively."}
        </p>
      </CardContent>
    </Card>
  );
}

export default function HealthTab({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isDataFetchedAtLeastOnce = true,
}: HealthTabProps) {
  const [mode, setMode] = useState<HealthMode>("group");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<HealthDatePreset>("30d");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "personal" && !selectedPersonId && people.length > 0) {
      setSelectedPersonId(people[0].id);
    }
    if (selectedPersonId && !people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(people[0]?.id || null);
    }
  }, [mode, people, selectedPersonId]);

  const dateRange = useMemo(() => resolveHealthDateRange({ preset: datePreset }), [datePreset]);
  const selectedExpense = selectedExpenseId
    ? expenses.find((expense) => expense.id === selectedExpenseId) || null
    : null;
  const startDate = dateRange.startDate ? dateRange.startDate.toISOString() : undefined;
  const endDate = dateRange.endDate ? dateRange.endDate.toISOString() : undefined;
  const isShellLoading = isLoadingPeople || isLoadingExpenses || isLoadingCategories || !isDataFetchedAtLeastOnce;

  return (
    <>
      <div className="h-full w-full overflow-x-hidden overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-0 pb-14 pt-4 sm:gap-10">
          <Hero
            mode={mode}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === "group") {
                setSelectedPersonId(null);
              }
            }}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            selectedPersonId={selectedPersonId}
            onSelectedPersonIdChange={setSelectedPersonId}
            people={people}
            peopleMap={peopleMap}
            isLoadingPeople={isLoadingPeople}
          />

          {!isShellLoading && expenses.length === 0 ? (
            <GlobalEmptyState hasExpenses={false} />
          ) : (
            <>
              <TrustAndCoverageSurface
                mode={mode}
                selectedPersonId={selectedPersonId}
                startDate={startDate}
                endDate={endDate}
              />

              <section className="space-y-5">
                <SectionHeading
                  label="This period"
                  title="A calmer first read"
                  description="Start with the broad shape of intake, then move into rhythm, source, people, and the journal beneath it."
                  icon={<Activity className="h-3.5 w-3.5" />}
                />
                <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                  <OverviewCaloriesSurface
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                  <div className="grid gap-4">
                    <OverviewMacrosSurface
                      mode={mode}
                      selectedPersonId={selectedPersonId}
                      startDate={startDate}
                      endDate={endDate}
                    />
                    <OverviewAlcoholSurface
                      mode={mode}
                      selectedPersonId={selectedPersonId}
                      startDate={startDate}
                      endDate={endDate}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <SectionHeading
                  label="Rhythm"
                  title="How intake moved"
                  description="These views stay independent, so a ready month can surface immediately instead of waiting for the slowest chart."
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <CalorieRhythmSurface
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                  <MacroRhythmSurface
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </div>
                <AlcoholRhythmSurface
                  mode={mode}
                  selectedPersonId={selectedPersonId}
                  startDate={startDate}
                  endDate={endDate}
                />
              </section>

              <section className="space-y-5">
                <SectionHeading
                  label="Origins"
                  title="Where it came from"
                  description="A softer breakdown of what drove the period instead of a dense analytics wall."
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                />
                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <SourceSplitSurface
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                  <div className="grid gap-4">
                    <TopCategoriesSurface
                      mode={mode}
                      selectedPersonId={selectedPersonId}
                      startDate={startDate}
                      endDate={endDate}
                    />
                    <TopContributorsSurface
                      mode={mode}
                      selectedPersonId={selectedPersonId}
                      startDate={startDate}
                      endDate={endDate}
                    />
                  </div>
                </div>
              </section>

              {mode === "group" ? (
                <section className="space-y-5">
                  <SectionHeading
                    label="People"
                    title="Shared intake"
                    description="Health allocates itemwise rows by participants and non-itemwise rows by shares, not by who paid."
                    icon={<Users className="h-3.5 w-3.5" />}
                  />
                  <ParticipantLensSurface
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </section>
              ) : null}

              <section className="space-y-5">
                <SectionHeading
                  label="Journal"
                  title="The estimated ledger"
                  description="A drillable reading of the entries behind Health, so you can move from estimate to original expense detail without losing context."
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                />
                <LedgerSurface
                  mode={mode}
                  selectedPersonId={selectedPersonId}
                  startDate={startDate}
                  endDate={endDate}
                  onOpenExpense={setSelectedExpenseId}
                />
              </section>
            </>
          )}
        </div>
      </div>

      {selectedExpense ? (
        <ExpenseDetailModal
          expense={selectedExpense}
          isOpen={Boolean(selectedExpense)}
          onOpenChange={(open) => {
            if (!open) setSelectedExpenseId(null);
          }}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
          categories={dynamicCategories}
        />
      ) : null}
    </>
  );
}
