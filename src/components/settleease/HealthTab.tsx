"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  CalendarDays,
  Heart,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  HealthMacroRhythmPayload,
  HealthMode,
  HealthParticipantLensPayload,
  HealthSurfaceCoverage,
  HealthSurfaceState,
  HealthSurfaceStatus,
  HealthTopCategoriesPayload,
  HealthTopContributorsPayload,
  HealthTrendPayload,
} from "@/lib/settleease/healthTypes";
import type { Category, Expense, Person } from "@/lib/settleease/types";
import { useHealthSurface } from "@/hooks/useHealthSurface";
import {
  ExpenseActivitySkeleton,
  LoadingRegion,
  SkeletonChartPanel,
  SkeletonMetricTile,
  SkeletonSectionHeader,
  SkeletonToolbar,
} from "./SkeletonLayouts";

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

type HealthTrendMetric = "calories" | "macros" | "alcohol";
type HealthSourceListMode = "categories" | "contributors";

const DATE_PRESETS: Array<{ value: HealthDatePreset; label: string }> = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All time" },
];

const panelClass = "min-w-0 overflow-hidden rounded-lg border bg-card/50 p-3 sm:p-4 shadow-sm";
const insetTileClass = "rounded-lg border bg-background p-3";

interface SurfaceChromeState {
  status: HealthSurfaceStatus;
  coverage: HealthSurfaceCoverage;
  isRefreshing: boolean;
}

function SurfaceBadge({ state }: { state: SurfaceChromeState | null }) {
  if (!state) return null;
  if (state.status === "partial") {
    return (
      <Badge variant="outline" className="rounded-full bg-background text-xs">
        {state.coverage.coveragePercent}% ready
      </Badge>
    );
  }
  if (state.status === "generating") {
    return (
      <Badge variant="outline" className="rounded-full bg-background text-xs">
        Estimating
      </Badge>
    );
  }
  if (state.isRefreshing) {
    return (
      <Badge variant="outline" className="rounded-full bg-background text-xs">
        Refreshing
      </Badge>
    );
  }
  if (state.status === "failed") {
    return (
      <Badge variant="outline" className="rounded-full bg-background text-xs">
        Needs retry
      </Badge>
    );
  }
  return null;
}

function HealthPanel({
  title,
  description,
  state,
  actions,
  children,
  className,
  tone = "default",
}: {
  title: string;
  description?: string;
  state?: SurfaceChromeState | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className={cn(panelClass, tone === "muted" && "bg-secondary/20", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {state ? <SurfaceBadge state={state} /> : null}
          {actions}
        </div>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="rounded-lg border bg-secondary/20 px-4 py-5 text-sm text-muted-foreground">{message}</div>;
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
    <div className="rounded-lg border bg-secondary/20 p-4 text-sm leading-6 text-foreground">
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

function LoadingPanel({ skeleton }: { skeleton: React.ReactNode }) {
  return <div>{skeleton}</div>;
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
          message={surfaceState.error || "This health section could not be estimated yet."}
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

function MetricSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div className="space-y-3">
      <Skeleton className={cn("h-10 w-40 rounded-lg", large && "h-12 w-52")} />
      <Skeleton className="h-4 w-full max-w-[280px]" />
      <Skeleton className="h-4 w-full max-w-[220px]" />
      <div className="grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function ChartSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-full max-w-[220px]" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className={cn("h-[220px] w-full rounded-lg", tall && "h-[280px]")} />
    </div>
  );
}

function HealthSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold text-primary">{title}</h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function HealthToolbar({
  mode,
  datePreset,
  onDatePresetChange,
  selectedPersonId,
  onSelectedPersonIdChange,
  people,
  peopleMap,
  isLoadingPeople,
}: {
  mode: HealthMode;
  datePreset: HealthDatePreset;
  onDatePresetChange: (preset: HealthDatePreset) => void;
  selectedPersonId: string | null;
  onSelectedPersonIdChange: (personId: string) => void;
  people: Person[];
  peopleMap: Record<string, string>;
  isLoadingPeople: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-md bg-muted/50 px-3 py-2",
        mode === "personal" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="health-date-range" className="text-xs text-muted-foreground">
          Date range
        </Label>
        <Select value={datePreset} onValueChange={(value) => onDatePresetChange(value as HealthDatePreset)}>
          <SelectTrigger id="health-date-range" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "personal" ? (
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="health-person" className="text-xs text-muted-foreground">
            Person
          </Label>
          <Select
            value={selectedPersonId || ""}
            onValueChange={onSelectedPersonIdChange}
            disabled={isLoadingPeople || people.length === 0}
          >
            <SelectTrigger id="health-person" className="h-9 w-full">
              <SelectValue placeholder="Select a person" />
            </SelectTrigger>
            <SelectContent>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {peopleMap[person.id] || person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

function CoverageSection({
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
    <HealthPanel title="Current coverage" state={surfaceState}>
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonMetricTile key={index} className="min-h-[96px]" />
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
                <div key={item.label} className={insetTileClass}>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            {payload.failureMessage && state.status !== "cached" ? (
              <div className="rounded-lg border bg-background px-4 py-4 text-sm leading-6 text-foreground">
                {payload.failureMessage}
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">{payload.disclaimer}</p>
          </div>
        )}
      </SurfaceBody>
    </HealthPanel>
  );
}

function OverviewCaloriesPanel({
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
    <HealthPanel title="Calories" state={surfaceState} className="h-full">
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={<MetricSkeleton large />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) => (
          <div className="space-y-4">
            <div>
              <p className="break-words text-[2.5rem] leading-none sm:text-5xl font-bold tracking-tight text-foreground">
                {Math.round(payload.totalCalories).toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Estimated calories</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Entries</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{payload.entryCount}</p>
              </div>
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Average / active day</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCalories(payload.averagePerActiveDay)}</p>
              </div>
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Active days</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{payload.activeDayCount}</p>
              </div>
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Leading category</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{payload.topCategoryName || "None yet"}</p>
              </div>
            </div>
          </div>
        )}
      </SurfaceBody>
    </HealthPanel>
  );
}

function OverviewMacrosPanel({
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
    <HealthPanel title="Macros" state={surfaceState} className="h-full" tone="muted">
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
                <div key={item.label} className={insetTileClass}>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {payload.leadingMacroLabel ? `${payload.leadingMacroLabel} leads this range.` : "No macro lead yet."}
            </p>
          </div>
        )}
      </SurfaceBody>
    </HealthPanel>
  );
}

function OverviewAlcoholPanel({
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
    <HealthPanel title="Alcohol" state={surfaceState} className="h-full">
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
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Servings</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatServings(payload.servings)}</p>
              </div>
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Calories</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCalories(payload.calories)}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Share of calories</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{payload.shareOfCalories.toFixed(1)}%</p>
              </div>
              <div className={insetTileClass}>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Top source</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{payload.topAlcoholSourceName || "None yet"}</p>
              </div>
            </div>
          </div>
        )}
      </SurfaceBody>
    </HealthPanel>
  );
}

function TrendsSection(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const [metric, setMetric] = useState<HealthTrendMetric>("calories");
  const [granularity, setGranularity] = useState<HealthGranularity>("weekly");

  const calorie = useHealthSurface({
    surfaceId: "calorieRhythm",
    granularity,
    ...props,
  });
  const macro = useHealthSurface({
    surfaceId: "macroRhythm",
    granularity,
    ...props,
  });
  const alcohol = useHealthSurface({
    surfaceId: "alcoholRhythm",
    granularity,
    ...props,
  });

  const actions = (
    <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
      <Select value={metric} onValueChange={(value) => setMetric(value as HealthTrendMetric)}>
        <SelectTrigger className="h-8 w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="calories">Calories</SelectItem>
          <SelectItem value="macros">Macros</SelectItem>
          <SelectItem value="alcohol">Alcohol</SelectItem>
        </SelectContent>
      </Select>

      <Select value={granularity} onValueChange={(value) => setGranularity(value as HealthGranularity)}>
        <SelectTrigger className="h-8 w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  if (metric === "macros") {
    return (
      <HealthPanel title="Estimated intake trend" state={macro.surfaceState} actions={actions} tone="muted">
        <SurfaceBody<HealthMacroRhythmPayload>
          surfaceState={macro.surfaceState as HealthSurfaceState<HealthMacroRhythmPayload> | null}
          isInitialLoading={macro.isInitialLoading}
          retry={macro.retry}
          isRetrying={macro.isRetrying}
          skeleton={<ChartSkeleton tall />}
          emptyMessage="No expense rows landed in this period yet."
        >
          {(payload) =>
            payload.data.length > 0 ? (
              <div className="min-w-0 overflow-hidden">
                <StackedAreaChart
                  data={payload.data}
                  categories={payload.categories}
                  valueFormatter={formatGrams}
                />
              </div>
            ) : (
              <EmptyPanel message="Not enough classified data is ready to draw this macro trend yet." />
            )
          }
        </SurfaceBody>
      </HealthPanel>
    );
  }

  const active = metric === "calories" ? calorie : alcohol;
  const valueLabel = metric === "calories" ? "Calories" : "Alcohol calories";
  const valueFormatter = formatCalories;
  const color = metric === "calories" ? "#2f7d68" : "#c47f2a";
  const emptyMessage =
    metric === "calories"
      ? "Not enough classified data is ready to draw this calorie trend yet."
      : "No alcohol-signaled entries are ready to chart yet.";

  return (
    <HealthPanel title="Estimated intake trend" state={active.surfaceState} actions={actions}>
      <SurfaceBody<HealthTrendPayload>
        surfaceState={active.surfaceState as HealthSurfaceState<HealthTrendPayload> | null}
        isInitialLoading={active.isInitialLoading}
        retry={active.retry}
        isRetrying={active.isRetrying}
        skeleton={<ChartSkeleton tall />}
        emptyMessage="No expense rows landed in this period yet."
      >
        {(payload) =>
          payload.data.length > 0 ? (
            <div className="min-w-0 overflow-hidden">
              <LineChart
                data={payload.data}
                valueLabel={valueLabel}
                valueFormatter={valueFormatter}
                color={color}
              />
            </div>
          ) : (
            <EmptyPanel message={emptyMessage} />
          )
        }
      </SurfaceBody>
    </HealthPanel>
  );
}

function SourcesSection(props: {
  mode: HealthMode;
  selectedPersonId: string | null;
  startDate?: string;
  endDate?: string;
}) {
  const [listMode, setListMode] = useState<HealthSourceListMode>("categories");

  const split = useHealthSurface({
    surfaceId: "sourceSplit",
    ...props,
  });
  const categories = useHealthSurface({
    surfaceId: "topCategories",
    ...props,
  });
  const contributors = useHealthSurface({
    surfaceId: "topContributors",
    ...props,
  });

  const activeList = listMode === "categories" ? categories : contributors;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <HealthPanel title="Food vs alcohol" state={split.surfaceState}>
        <SurfaceBody
          surfaceState={split.surfaceState}
          isInitialLoading={split.isInitialLoading}
          retry={split.retry}
          isRetrying={split.isRetrying}
          skeleton={<ChartSkeleton tall />}
          emptyMessage="No expense rows landed in this period yet."
        >
          {(payload) =>
            payload.breakdown.length > 0 ? (
              <div className="min-w-0 overflow-hidden">
                <DonutChart data={payload.breakdown} valueFormatter={formatCalories} />
              </div>
            ) : (
              <EmptyPanel message="No classified food or alcohol estimates are ready yet." />
            )
          }
        </SurfaceBody>
      </HealthPanel>

      <HealthPanel
        title={listMode === "categories" ? "Top categories" : "Top contributors"}
        state={activeList.surfaceState}
        actions={
          <div className="w-full sm:w-44">
            <Select value={listMode} onValueChange={(value) => setListMode(value as HealthSourceListMode)}>
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="categories">Categories</SelectItem>
                <SelectItem value="contributors">Contributors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        tone="muted"
      >
        {listMode === "categories" ? (
          <SurfaceBody<HealthTopCategoriesPayload>
            surfaceState={categories.surfaceState as HealthSurfaceState<HealthTopCategoriesPayload> | null}
            isInitialLoading={categories.isInitialLoading}
            retry={categories.retry}
            isRetrying={categories.isRetrying}
            skeleton={<ChartSkeleton />}
            emptyMessage="No category estimates are ready yet."
          >
            {(payload) => <RankedList rows={payload.rows} valueFormatter={formatCalories} />}
          </SurfaceBody>
        ) : (
          <SurfaceBody<HealthTopContributorsPayload>
            surfaceState={contributors.surfaceState as HealthSurfaceState<HealthTopContributorsPayload> | null}
            isInitialLoading={contributors.isInitialLoading}
            retry={contributors.retry}
            isRetrying={contributors.isRetrying}
            skeleton={<ChartSkeleton />}
            emptyMessage="No contributor estimates are ready yet."
          >
            {(payload) => <RankedList rows={payload.rows} valueFormatter={formatCalories} />}
          </SurfaceBody>
        )}
      </HealthPanel>
    </div>
  );
}

function PeopleSection(props: {
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
    <HealthPanel title="Shared intake" state={surfaceState} tone="muted">
      <SurfaceBody<HealthParticipantLensPayload>
        surfaceState={surfaceState as HealthSurfaceState<HealthParticipantLensPayload> | null}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonMetricTile key={index} className="min-h-[112px]" />
            ))}
          </div>
        }
        emptyMessage="No participant allocations are ready yet."
      >
        {(payload) => (
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {payload.rows.map((row) => (
              <div key={row.personId} className={insetTileClass}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">{row.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.entryCount} estimated entries</p>
                  </div>
                  <Badge variant="outline" className="rounded-full bg-background">
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
        )}
      </SurfaceBody>
    </HealthPanel>
  );
}

function LedgerSection({
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
    <HealthPanel title="Estimated entries" state={surfaceState}>
      <SurfaceBody
        surfaceState={surfaceState}
        isInitialLoading={isInitialLoading}
        retry={retry}
        isRetrying={isRetrying}
        skeleton={
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <ExpenseActivitySkeleton key={index} />
            ))}
          </ul>
        }
        emptyMessage="No AI-estimated health entries are ready for this range."
      >
        {(payload) =>
          payload.rows.length > 0 ? (
            <div className="space-y-3">
              {payload.rows.map((row) => (
                <button
                  key={row.sourceKey}
                  type="button"
                  className="w-full rounded-lg border bg-background p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onOpenExpense(row.expenseId)}
                >
                  <div className="space-y-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base sm:text-lg font-semibold text-foreground">{row.title}</span>
                        <Badge variant="outline" className="rounded-full bg-secondary/35">
                          {row.classification}
                        </Badge>
                        <Badge variant="outline" className="rounded-full bg-background">
                          {row.confidence}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {row.categoryName} • {row.dateLabel}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{row.rationale}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-lg bg-secondary/20 p-3 text-sm sm:grid-cols-2 sm:gap-x-5">
                      <span className="text-muted-foreground">Calories</span>
                      <span className="font-medium text-foreground sm:text-right">{formatCalories(row.calories)}</span>
                      <span className="text-muted-foreground">Macros</span>
                      <span className="font-medium text-foreground sm:text-right">
                        {formatGrams(row.protein)} / {formatGrams(row.carbs)} / {formatGrams(row.fat)}
                      </span>
                      <span className="text-muted-foreground">Alcohol</span>
                      <span className="font-medium text-foreground sm:text-right">{formatServings(row.alcoholServings)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyPanel message="No AI-estimated health entries are ready for this range." />
          )
        }
      </SurfaceBody>
    </HealthPanel>
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
        <div key={row.key} className={cn(insetTileClass, "shadow-sm")}>
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary/35 text-sm font-medium text-foreground">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-foreground">{row.label}</p>
                  {row.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{row.subtitle}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-foreground">{valueFormatter(row.calories)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.share.toFixed(1)}% of total</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary/35">
                <div
                  className="h-full rounded-full bg-primary"
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

function HealthEmptyState() {
  return (
    <div className="flex items-center justify-center px-4 py-10 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary/50">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-5 text-xl sm:text-2xl font-semibold text-foreground">No health estimates yet</h2>
          <p className="mt-3 text-sm text-muted-foreground">Add Food or Alcohol expenses to unlock Health estimates.</p>
      </div>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <LoadingRegion label="Loading health dashboard" className="h-full">
    <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-lg h-full flex flex-col">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-10 w-full rounded-md sm:w-56" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <SkeletonToolbar count={1} className="grid-cols-1" />
          </div>

          <Separator />

          <section className="space-y-4 min-w-0">
            <SkeletonSectionHeader width="w-28" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonMetricTile key={index} className="min-h-[96px]" />
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-4 min-w-0">
            <SkeletonSectionHeader width="w-24" />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              <SkeletonChartPanel chartClassName="h-[260px]" />
              <div className="grid gap-4">
                <SkeletonChartPanel chartClassName="h-[150px]" />
                <SkeletonChartPanel chartClassName="h-[150px]" />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-4 min-w-0">
            <SkeletonSectionHeader width="w-20" />
            <div className="grid gap-4 xl:grid-cols-2">
              <SkeletonChartPanel chartClassName="h-[260px]" />
              <SkeletonChartPanel chartClassName="h-[260px]" />
            </div>
          </section>

          <Separator />

          <section className="space-y-4 min-w-0">
            <SkeletonSectionHeader width="w-24" />
            <div className="grid gap-4 lg:grid-cols-2">
              <SkeletonChartPanel chartClassName="h-[220px]" />
              <SkeletonChartPanel chartClassName="h-[220px]" />
            </div>
          </section>

          <Separator />

          <section className="space-y-4 min-w-0">
            <SkeletonSectionHeader width="w-20" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonMetricTile key={index} className="min-h-[96px]" />
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-4 min-w-0">
            <SkeletonSectionHeader width="w-20" />
            <ul className="space-y-3">
              <ExpenseActivitySkeleton />
              <ExpenseActivitySkeleton />
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
    </LoadingRegion>
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
  const startDate = dateRange.startDate ? dateRange.startDate.toISOString() : undefined;
  const endDate = dateRange.endDate ? dateRange.endDate.toISOString() : undefined;
  const selectedExpense = selectedExpenseId
    ? expenses.find((expense) => expense.id === selectedExpenseId) || null
    : null;

  const isShellLoading = isLoadingPeople || isLoadingExpenses || isLoadingCategories || !isDataFetchedAtLeastOnce;

  if (isShellLoading) {
    return <HealthSkeleton />;
  }

  return (
    <>
      <Card className="w-full min-w-0 overflow-hidden rounded-lg shadow-lg h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-start">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Heart className="mr-2 h-5 w-5 text-primary" />
                Health
              </CardTitle>
            </div>
            <Tabs
              value={mode}
              onValueChange={(value) => {
                const nextMode = value as HealthMode;
                setMode(nextMode);
                if (nextMode === "group") {
                  setSelectedPersonId(null);
                }
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-auto text-xs sm:text-sm">
                <TabsTrigger value="group">Overview</TabsTrigger>
                <TabsTrigger value="personal">Per Person</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
          <div className="min-w-0 space-y-4 sm:space-y-5">
            <HealthToolbar
              mode={mode}
              datePreset={datePreset}
              onDatePresetChange={setDatePreset}
              selectedPersonId={selectedPersonId}
              onSelectedPersonIdChange={setSelectedPersonId}
              people={people}
              peopleMap={peopleMap}
              isLoadingPeople={isLoadingPeople}
            />

            {!expenses.length ? (
              <>
                <Separator />
                <HealthEmptyState />
              </>
            ) : (
              <>
                <Separator />

                <HealthSection icon={Sparkles} title="Coverage">
                  <CoverageSection
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </HealthSection>

                <Separator />

                <HealthSection icon={Heart} title="Overview">
                  <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                    <OverviewCaloriesPanel
                      mode={mode}
                      selectedPersonId={selectedPersonId}
                      startDate={startDate}
                      endDate={endDate}
                    />
                    <div className="grid gap-4">
                      <OverviewMacrosPanel
                        mode={mode}
                        selectedPersonId={selectedPersonId}
                        startDate={startDate}
                        endDate={endDate}
                      />
                      <OverviewAlcoholPanel
                        mode={mode}
                        selectedPersonId={selectedPersonId}
                        startDate={startDate}
                        endDate={endDate}
                      />
                    </div>
                  </div>
                </HealthSection>

                <Separator />

                <HealthSection icon={CalendarDays} title="Trends">
                  <TrendsSection
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </HealthSection>

                <Separator />

                <HealthSection icon={Sparkles} title="Sources">
                  <SourcesSection
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                  />
                </HealthSection>

                {mode === "group" ? (
                  <>
                    <Separator />

                    <HealthSection icon={Users} title="People">
                      <PeopleSection
                        mode={mode}
                        selectedPersonId={selectedPersonId}
                        startDate={startDate}
                        endDate={endDate}
                      />
                    </HealthSection>
                  </>
                ) : null}

                <Separator />

                <HealthSection icon={Heart} title="Ledger">
                  <LedgerSection
                    mode={mode}
                    selectedPersonId={selectedPersonId}
                    startDate={startDate}
                    endDate={endDate}
                    onOpenExpense={setSelectedExpenseId}
                  />
                </HealthSection>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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
