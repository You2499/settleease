"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DonutChart, LineChart, StackedAreaChart } from "./analytics/VisxPrimitives";
import { cn } from "@/lib/utils";
import {
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
import {
  InsightsEmptyPanel,
  InsightsEmptyState,
  InsightsLayout,
  InsightsMetaBadge,
  InsightsPageHeader,
  InsightsSectionHeader,
  InsightsSurface,
  insightsSelectItemClass,
  insightsSelectTriggerClass,
  insightsTabsListClass,
  insightsTabsTriggerClass,
} from "./insights/InsightsChrome";

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

interface SurfaceChromeState {
  status: HealthSurfaceStatus;
  coverage: HealthSurfaceCoverage;
  isRefreshing: boolean;
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
  description?: string;
  state: SurfaceChromeState | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "white" | "warm";
}) {
  return (
    <InsightsSurface
      eyebrow={eyebrow}
      title={title}
      description={description}
      headerAside={
        <>
          <SurfaceBadge state={state} />
          {actions}
        </>
      }
      tone={tone === "warm" ? "muted" : "default"}
      className={cn(
        "prevent-horizontal-scroll h-full motion-safe:animate-in motion-safe:fade-in-50",
        className,
      )}
    >
      <div className="flex h-full min-w-0 flex-col gap-4">{children}</div>
    </InsightsSurface>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <InsightsEmptyPanel message={message} />;
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
    <div className="rounded-lg bg-secondary/35 p-4 text-sm leading-6 text-foreground">
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
  skeleton,
}: {
  skeleton: React.ReactNode;
}) {
  return (
    <div>{skeleton}</div>
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
    return <LoadingPanel skeleton={skeleton} />;
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

    return <LoadingPanel skeleton={skeleton} />;
  }

  return <>{children(surfaceState.payload, surfaceState)}</>;
}

function SectionHeading({
  label,
  title,
  icon,
}: {
  label: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <InsightsSectionHeader
      label={label}
      title={title}
      icon={
        (({ className }: { className?: string }) => (
          <span className={cn("inline-flex", className)}>{icon}</span>
        )) as React.ComponentType<{ className?: string }>
      }
    />
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
      <Skeleton className={cn("h-[220px] w-full rounded-lg", tall && "h-[280px]")} />
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
        <div key={row.key} className="rounded-lg bg-secondary/25 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-sm font-medium text-foreground shadow-sm">
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
    <InsightsPageHeader
      icon={Activity}
      title="Health"
      meta={
        <>
          <InsightsMetaBadge
            icon={Users}
            label={mode === "group" ? "Group estimates" : peopleMap[selectedPersonId || ""] || "Personal estimates"}
          />
          <InsightsMetaBadge
            icon={CalendarDays}
            label={DATE_PRESETS.find((preset) => preset.value === datePreset)?.label || "Date range"}
          />
          <InsightsMetaBadge icon={Sparkles} label="Estimated" />
        </>
      }
      controls={
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,220px)]">
          <div className="min-w-0">
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">View</Label>
            <Tabs value={mode} onValueChange={(value) => onModeChange(value as HealthMode)} className="w-full">
              <TabsList className={insightsTabsListClass}>
                <TabsTrigger value="group" className={insightsTabsTriggerClass}>
                  Group
                </TabsTrigger>
                <TabsTrigger value="personal" className={insightsTabsTriggerClass}>
                  Personal
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="min-w-0">
            <Label htmlFor="health-date-preset" className="mb-2 block text-xs font-medium text-muted-foreground">
              Date range
            </Label>
            <Select value={datePreset} onValueChange={(value) => onDatePresetChange(value as HealthDatePreset)}>
              <SelectTrigger id="health-date-preset" className={insightsSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value} className={insightsSelectItemClass}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "personal" ? (
            <div className="min-w-0">
              <Label htmlFor="health-person" className="mb-2 block text-xs font-medium text-muted-foreground">
                Person
              </Label>
              <Select
                value={selectedPersonId || ""}
                onValueChange={onSelectedPersonIdChange}
                disabled={isLoadingPeople || people.length === 0}
              >
                <SelectTrigger id="health-person" className={insightsSelectTriggerClass}>
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person.id} value={person.id} className={insightsSelectItemClass}>
                      {peopleMap[person.id] || person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>
      }
    />
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
      title="Coverage"
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
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </div>
        }
        emptyMessage="No candidate rows landed in this window yet."
      >
        {(payload, state) => (
          <div className="space-y-4">
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Coverage", value: payload.coverageLabel },
                { label: "Cache", value: payload.cacheLabel },
                { label: "Confidence", value: payload.confidenceLabel },
                { label: "Latest update", value: payload.latestUpdateLabel },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-background p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            {payload.failureMessage && state.status !== "cached" ? (
              <div className="rounded-lg border bg-background px-4 py-4 text-sm leading-6 text-foreground">
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
      eyebrow="Overview"
      title="Calories"
      state={surfaceState}
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
              <p className="break-words text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
                {Math.round(payload.totalCalories).toLocaleString("en-IN")}
              </p>
              <p className="mt-3 text-base text-muted-foreground">Estimated calories</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Entries</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{payload.entryCount}</p>
              </div>
              <div className="rounded-lg bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Leading category</p>
                <p className="mt-3 text-xl font-semibold text-foreground">{payload.topCategoryName || "None yet"}</p>
              </div>
            </div>
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
                <div key={item.label} className="rounded-lg border bg-background p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
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
              <div className="rounded-lg bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Servings</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{formatServings(payload.servings)}</p>
              </div>
              <div className="rounded-lg bg-secondary/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Calories</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{formatCalories(payload.calories)}</p>
              </div>
            </div>
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
    <div className="inline-flex max-w-full rounded-full border border-border/60 bg-white/85 p-1 shadow-sm">
      {(["weekly", "monthly"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "min-w-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize tracking-[0.01em] transition-colors",
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
      state={surfaceState}
      actions={<TrendGranularityToggle value={granularity} onChange={setGranularity} />}
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
          <div className="min-w-0 space-y-4">
            {payload.data.length > 0 ? (
              <div className="min-w-0 overflow-x-hidden">
                <LineChart
                  data={payload.data}
                  valueLabel="Calories"
                  valueFormatter={formatCalories}
                  color="#2f7d68"
                />
              </div>
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
      state={surfaceState}
      actions={<TrendGranularityToggle value={granularity} onChange={setGranularity} />}
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
          <div className="min-w-0 space-y-4">
            {payload.data.length > 0 ? (
              <div className="min-w-0 overflow-x-hidden">
                <StackedAreaChart
                  data={payload.data}
                  categories={payload.categories}
                  valueFormatter={formatGrams}
                />
              </div>
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
          <div className="min-w-0 space-y-4">
            {payload.data.length > 0 ? (
              <div className="min-w-0 overflow-x-hidden">
                <LineChart
                  data={payload.data}
                  valueLabel="Alcohol calories"
                  valueFormatter={formatCalories}
                  color="#c47f2a"
                />
              </div>
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
      state={surfaceState}
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
          <div className="min-w-0 space-y-4">
            {payload.breakdown.length > 0 ? (
              <div className="min-w-0 overflow-x-hidden">
                <DonutChart data={payload.breakdown} valueFormatter={formatCalories} />
              </div>
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
              <Skeleton key={index} className="h-28 rounded-lg" />
            ))}
          </div>
        }
        emptyMessage="No participant allocations are ready yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {payload.rows.map((row) => (
                <div key={row.personId} className="rounded-lg border bg-background p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
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
      title="Estimated entries"
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
              <Skeleton key={index} className="h-28 rounded-lg" />
            ))}
          </div>
        }
        emptyMessage="No AI-estimated health entries are ready for this range."
      >
        {(payload) => (
          <div className="space-y-4">
            {payload.rows.length > 0 ? (
              <div className="space-y-3">
                {payload.rows.map((row) => (
                  <button
                    key={row.sourceKey}
                    type="button"
                    className="prevent-horizontal-scroll w-full max-w-full rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onOpenExpense(row.expenseId)}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-base font-semibold text-foreground sm:text-lg">{row.title}</span>
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
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {row.rationale}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 rounded-lg bg-secondary/20 p-3 text-sm sm:grid-cols-2 sm:gap-x-5">
                        <span className="text-muted-foreground">Calories</span>
                        <span className="font-medium text-foreground sm:text-right">{formatCalories(row.calories)}</span>
                        <span className="text-muted-foreground">Macros</span>
                        <span className="font-medium text-foreground sm:text-right">
                          {formatGrams(row.protein)} / {formatGrams(row.carbs)} / {formatGrams(row.fat)}
                        </span>
                        <span className="text-muted-foreground">Alcohol</span>
                        <span className="font-medium text-foreground sm:text-right">
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
    <InsightsEmptyState
      icon={Sparkles}
      title="Health"
      message={
        hasExpenses
          ? "No Health estimates are available for this selection."
          : "Add Food or Alcohol expenses to unlock Health estimates."
      }
    />
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
      <div className="prevent-horizontal-scroll h-full w-full overflow-x-hidden overflow-y-auto">
        <InsightsLayout className="max-w-7xl">
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
                  label="Overview"
                  title="Overview"
                  icon={<Activity className="h-3.5 w-3.5" />}
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
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
                  label="Trends"
                  title="Trends"
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
                  label="Sources"
                  title="Sources"
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
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
                  label="Ledger"
                  title="Ledger"
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
        </InsightsLayout>
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
