"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Eye,
  LineChart as LineChartIcon,
  PieChart,
  RefreshCw,
  Sparkles,
  UserSquare,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  ChartFrame,
  DonutChart,
  LineChart,
  StackedAreaChart,
} from "./analytics/VisxPrimitives";
import {
  buildHealthModel,
  formatCalories,
  formatGrams,
  formatServings,
  resolveHealthDateRange,
  type HealthDashboardModel,
} from "@/lib/settleease/healthModel";
import type {
  HealthDatePreset,
  HealthGranularity,
  HealthLedgerResult,
  HealthMode,
} from "@/lib/settleease/healthTypes";
import type { Category, Expense, Person } from "@/lib/settleease/types";

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
  { value: "all", label: "All time" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const healthSelectTriggerClass = "h-11 text-sm transition-none hover:bg-background hover:text-foreground data-[state=open]:bg-background";
const healthSelectItemClass = "transition-none hover:bg-transparent hover:text-popover-foreground focus:bg-transparent focus:text-popover-foreground data-[highlighted]:bg-transparent data-[highlighted]:text-popover-foreground";
const healthTabTriggerClass = "h-10 min-w-0 gap-2 rounded-md px-2 text-xs transition-none hover:bg-transparent hover:text-foreground sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-none data-[state=inactive]:bg-transparent";

function HealthSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="rounded-lg shadow-lg">
        <CardHeader className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="rounded-lg shadow-lg">
            <CardHeader className="space-y-2 pb-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-lg" />
        <Skeleton className="h-[340px] rounded-lg" />
      </div>
      <Skeleton className="h-[320px] rounded-lg" />
    </div>
  );
}

function HealthMetricGrid({ model }: { model: HealthDashboardModel }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {model.snapshot.metricCards.map((metric) => (
        <Card key={metric.label} className="rounded-lg shadow-lg">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {metric.label}
            </CardDescription>
            <CardTitle className="text-2xl font-semibold text-foreground sm:text-3xl">
              {metric.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            {metric.detail}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TrustStrip({ model, result, isLoading }: { model: HealthDashboardModel; result: HealthLedgerResult | null; isLoading: boolean }) {
  return (
    <Card className="overflow-hidden rounded-lg border shadow-lg">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full bg-secondary/35">
              AI Estimated
            </Badge>
            {isLoading ? (
              <Badge variant="secondary" className="rounded-full">
                Refreshing
              </Badge>
            ) : null}
            {model.trust.hasFailures ? (
              <Badge variant="destructive" className="rounded-full">
                Partial coverage
              </Badge>
            ) : null}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {model.trust.disclaimer}
          </p>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground sm:min-w-[320px]">
          <div className="flex items-center justify-between gap-3">
            <span>Coverage</span>
            <span className="text-right font-medium text-foreground">{model.trust.coverageLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Cache</span>
            <span className="text-right font-medium text-foreground">{model.trust.cacheLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Confidence</span>
            <span className="text-right font-medium text-foreground">{model.trust.confidenceLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Latest update</span>
            <span className="text-right font-medium text-foreground">{model.trust.latestUpdateLabel}</span>
          </div>
          {model.trust.hasFailures && model.trust.failureMessage ? (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
              {model.trust.failureMessage}
            </div>
          ) : null}
          {result && result.dataStats.ignoredRowCount > 0 ? (
            <div className="rounded-lg bg-secondary/40 px-3 py-2">
              {result.dataStats.ignoredRowCount} entries were classified as non-health and excluded from totals.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipantCards({ rows }: { rows: HealthDashboardModel["details"]["participantRows"] }) {
  if (!rows.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <Card key={row.personId} className="rounded-lg border shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Participant
            </CardDescription>
            <CardTitle className="text-xl font-semibold">{row.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>Calories</span>
              <span className="font-medium text-foreground">{formatCalories(row.calories)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Alcohol servings</span>
              <span className="font-medium text-foreground">{formatServings(row.alcoholServings)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Estimated entries</span>
              <span className="font-medium text-foreground">{row.entryCount}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DetailList({
  rows,
  onOpenExpense,
}: {
  rows: HealthDashboardModel["details"]["rows"];
  onOpenExpense: (expenseId: string) => void;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        No AI-estimated health entries are available for this view.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-background">
      {rows.slice(0, 10).map((row) => (
        <button
          key={row.sourceKey}
          type="button"
          className="flex w-full flex-col gap-3 p-4 text-left transition-none hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring"
          onClick={() => onOpenExpense(row.expenseId)}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold text-foreground">{row.title}</span>
                <Badge variant={row.classification === "alcohol" ? "secondary" : "outline"} className="rounded-full">
                  {row.classification}
                </Badge>
                <Badge variant="outline" className="rounded-full">
                  {row.confidence}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.categoryName} • {row.dateLabel}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {row.rationale}
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-1 text-sm sm:min-w-[240px]">
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
  );
}

function EmptyState({ hasExpenses }: { hasExpenses: boolean }) {
  return (
    <Card className="mx-auto mt-4 max-w-3xl rounded-lg py-8 text-center shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Sparkles className="h-5 w-5" />
          Health
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 text-sm leading-relaxed text-muted-foreground">
        {hasExpenses
          ? "Add Food or Alcohol expenses with recognizable names to unlock AI-estimated calories, macros, and alcohol trends here."
          : "Add Food or Alcohol expenses to unlock Health estimates. The tab will turn your expense text into an AI-estimated nutrition ledger."}
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
  const getHealthLedger = useAction(api.healthActions.getHealthLedger);
  const [mode, setMode] = useState<HealthMode>("group");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<HealthDatePreset>("30d");
  const [granularity, setGranularity] = useState<HealthGranularity>("weekly");
  const [result, setResult] = useState<HealthLedgerResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  const isLoading = isLoadingPeople || isLoadingExpenses || isLoadingCategories || !isDataFetchedAtLeastOnce;

  useEffect(() => {
    if (mode === "personal" && !selectedPersonId && people.length > 0) {
      setSelectedPersonId(people[0].id);
    }
    if (selectedPersonId && !people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(people[0]?.id || null);
    }
  }, [mode, people, selectedPersonId]);

  const dateRange = useMemo(() => resolveHealthDateRange({ preset: datePreset }), [datePreset]);
  const requestKey = `${dateRange.startDate?.toISOString() || "all"}:${dateRange.endDate?.toISOString() || "all"}:${reloadKey}`;

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    setIsLoadingResult(true);
    setError(null);

    void getHealthLedger({
      startDate: dateRange.startDate ? dateRange.startDate.toISOString() : undefined,
      endDate: dateRange.endDate ? dateRange.endDate.toISOString() : undefined,
    })
      .then((nextResult) => {
        if (cancelled) return;
        setResult(nextResult as HealthLedgerResult);
      })
      .catch((nextError: any) => {
        if (cancelled) return;
        setError(nextError?.message || "Failed to load Health estimates.");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingResult(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange.endDate, dateRange.startDate, getHealthLedger, isLoading, requestKey]);

  const model = useMemo(
    () =>
      buildHealthModel({
        result,
        people,
        peopleMap,
        mode,
        selectedPersonId,
        granularity,
        dateRange,
      }),
    [dateRange, granularity, mode, people, peopleMap, result, selectedPersonId],
  );

  const selectedExpense = selectedExpenseId
    ? expenses.find((expense) => expense.id === selectedExpenseId) || null
    : null;

  if (isLoading && !result) {
    return <HealthSkeleton />;
  }

  if (isLoadingResult && !result) {
    return <HealthSkeleton />;
  }

  if (error && !result) {
    return (
      <Card className="rounded-lg border shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Health
          </div>
          <p>{error}</p>
          <div>
            <Button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result || model.isEmpty) {
    return <EmptyState hasExpenses={expenses.length > 0} />;
  }

  return (
    <>
      <div className="h-full w-full overflow-x-hidden overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-0 pb-10 pt-4 sm:gap-6">
          <header className="flex flex-col gap-4 rounded-lg bg-card px-4 py-4 shadow-lg sm:px-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary/70 text-foreground">
                  <Activity className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Health</h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    AI-estimated calories, macros, and alcohol trends derived from your expense text.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[560px]">
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  const nextMode = value as HealthMode;
                  setMode(nextMode);
                  if (nextMode === "group") setSelectedPersonId(null);
                }}
                className="min-w-0"
              >
                <TabsList className="grid h-12 w-full grid-cols-2 overflow-hidden rounded-lg border border-border/60 bg-muted p-1">
                  <TabsTrigger value="group" className={healthTabTriggerClass}>
                    <Eye className="h-4 w-4" />
                    <span className="truncate">Group</span>
                  </TabsTrigger>
                  <TabsTrigger value="personal" className={healthTabTriggerClass}>
                    <UserSquare className="h-4 w-4" />
                    <span className="truncate">Personal</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-2 gap-2">
                <Select value={datePreset} onValueChange={(value) => setDatePreset(value as HealthDatePreset)}>
                  <SelectTrigger className={healthSelectTriggerClass} aria-label="Date range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value} className={healthSelectItemClass}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={granularity} onValueChange={(value) => setGranularity(value as HealthGranularity)}>
                  <SelectTrigger className={healthSelectTriggerClass} aria-label="Granularity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly" className={healthSelectItemClass}>Weekly</SelectItem>
                    <SelectItem value="monthly" className={healthSelectItemClass}>Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === "personal" ? (
                <div className="sm:col-span-2">
                  <Label htmlFor="health-person" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Person
                  </Label>
                  <Select
                    value={model.selectedPersonId || ""}
                    onValueChange={setSelectedPersonId}
                    disabled={!people.length}
                  >
                    <SelectTrigger id="health-person" className={healthSelectTriggerClass}>
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((person) => (
                        <SelectItem key={person.id} value={person.id} className={healthSelectItemClass}>
                          {peopleMap[person.id] || person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </header>

          <TrustStrip model={model} result={result} isLoading={isLoadingResult} />

          {error ? (
            <Card className="rounded-lg border border-destructive/40 bg-destructive/10 shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-4 text-sm text-destructive">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <HealthMetricGrid model={model} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Calorie Trend"
              description={`${model.dateRange.label} • ${granularity === "weekly" ? "Weekly" : "Monthly"} AI-estimated calories.`}
              actions={
                <Badge variant="outline" className="rounded-full">
                  {model.snapshot.qualifyingEntryCount} entries
                </Badge>
              }
            >
              <LineChart
                data={model.charts.calorieTrend}
                valueLabel="Calories"
                valueFormatter={formatCalories}
                color="#2f7d68"
              />
            </ChartFrame>

            <ChartFrame
              title="Food vs Alcohol"
              description="Share of estimated calories by AI classification."
            >
              <DonutChart
                data={model.charts.classificationBreakdown}
                valueFormatter={formatCalories}
              />
            </ChartFrame>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Macro Trend"
              description="AI-estimated grams over time."
              actions={
                <Badge variant="secondary" className="rounded-full">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Estimated
                </Badge>
              }
            >
              <StackedAreaChart
                data={model.charts.macroTrend.data}
                categories={model.charts.macroTrend.categories}
                valueFormatter={formatGrams}
              />
            </ChartFrame>

            <ChartFrame
              title="Alcohol Trend"
              description="Calories attributable to alcohol across the selected range."
            >
              <LineChart
                data={model.charts.alcoholTrend}
                valueLabel="Alcohol calories"
                valueFormatter={formatCalories}
                color="#c47f2a"
              />
            </ChartFrame>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame
              title="Top Categories"
              description="Categories contributing the most estimated calories."
              actions={
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <PieChart className="h-4 w-4" />
                  {model.snapshot.topCategory ? `${model.snapshot.topCategory.name} leads` : "No dominant category"}
                </div>
              }
            >
              <BarChart
                data={model.charts.topCategories}
                series={[{ id: "calories", label: "Calories", color: "#2f7d68" }]}
                valueFormatter={formatCalories}
                horizontal
              />
            </ChartFrame>

            <ChartFrame
              title="Top Contributors"
              description="Entries with the highest estimated calorie impact."
              actions={
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <LineChartIcon className="h-4 w-4" />
                  {model.snapshot.topContributor ? `${model.snapshot.topContributor.name} leads` : "No dominant contributor"}
                </div>
              }
            >
              <BarChart
                data={model.charts.topContributors}
                series={[{ id: "calories", label: "Calories", color: "#111827" }]}
                valueFormatter={formatCalories}
                horizontal
              />
            </ChartFrame>
          </div>

          {mode === "group" ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Participant Lens</h2>
              </div>
              <ParticipantCards rows={model.details.participantRows} />
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">
                Estimated Health Ledger
                {mode === "personal" && model.selectedPersonName ? ` for ${model.selectedPersonName}` : ""}
              </h2>
            </div>
            <DetailList rows={model.details.rows} onOpenExpense={setSelectedExpenseId} />
          </section>
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
