"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart4,
  CalendarDays,
  CircleDollarSign,
  LineChart,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildAnalyticsModel,
  formatAnalyticsCompactCurrency,
  formatAnalyticsCurrency,
  type AnalyticsDatePreset,
  type AnalyticsGranularity,
  type AnalyticsMode,
} from "@/lib/settleease/analyticsModel";
import type { Category, Expense, Person, SettlementPayment } from "@/lib/settleease/types";
import { cn } from "@/lib/utils";

import {
  BarChart,
  DonutChart,
  HeatmapCalendar,
  Histogram,
  LineChart as VisxLineChart,
  StackedAreaChart,
} from "./analytics/VisxPrimitives";

interface AnalyticsTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  settlementPayments: SettlementPayment[];
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingCategories?: boolean;
  isLoadingSettlements?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

type AnalyticsViewModel = ReturnType<typeof buildAnalyticsModel>;
type AnalyticsSectionId = "overview" | "money-flow" | "trends" | "activity" | "records";
type AnalyticsCadenceView = "frequency" | "velocity";

const DATE_PRESETS: Array<{ value: AnalyticsDatePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

const GRANULARITY_OPTIONS: Array<{ value: AnalyticsGranularity; label: string }> = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

const panelClass = "min-w-0 rounded-lg border bg-card/50 p-4 shadow-sm";
const insetTileClass = "rounded-lg border bg-background p-3";

export default function AnalyticsTab({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
  settlementPayments,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isLoadingSettlements = false,
  isDataFetchedAtLeastOnce = true,
}: AnalyticsTabProps) {
  const [mode, setMode] = useState<AnalyticsMode>("group");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<AnalyticsDatePreset>("all");
  const [granularity, setGranularity] = useState<AnalyticsGranularity>("monthly");

  useEffect(() => {
    if (mode === "personal" && !selectedPersonId && people.length > 0) {
      setSelectedPersonId(people[0].id);
    }
    if (selectedPersonId && !people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(people[0]?.id || null);
    }
  }, [mode, people, selectedPersonId]);

  const isLoading =
    isLoadingPeople || isLoadingExpenses || isLoadingCategories || isLoadingSettlements || !isDataFetchedAtLeastOnce;

  const model = useMemo(
    () =>
      buildAnalyticsModel({
        expenses,
        settlementPayments,
        people,
        peopleMap,
        categories: dynamicCategories,
        mode,
        selectedPersonId,
        dateRange: { preset: datePreset },
        granularity,
      }),
    [datePreset, dynamicCategories, expenses, granularity, mode, people, peopleMap, selectedPersonId, settlementPayments],
  );

  const selectedPersonName = model.selectedPersonName || "Selected person";

  if (isLoading) return <AnalyticsSkeleton />;
  if (!expenses.length) return <AnalyticsEmptyState />;

  return (
    <Card className="shadow-lg rounded-lg h-full flex flex-col">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <BarChart4 className="mr-2 h-5 w-5 text-primary" />
          Analytics
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="space-y-6">
          <AnalyticsToolbar
            mode={mode}
            onModeChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === "group") setSelectedPersonId(null);
            }}
            datePreset={datePreset}
            onDatePresetChange={setDatePreset}
            granularity={granularity}
            onGranularityChange={setGranularity}
            selectedPersonId={selectedPersonId}
            onSelectedPersonIdChange={setSelectedPersonId}
            people={people}
            peopleMap={peopleMap}
            isLoadingPeople={isLoadingPeople}
          />

          <Separator />

          <AnalyticsSection id="overview" icon={BarChart4} title="Overview">
            <OverviewSection model={model} mode={mode} selectedPersonName={selectedPersonName} />
          </AnalyticsSection>

          <Separator />

          <AnalyticsSection id="money-flow" icon={CircleDollarSign} title="Money Flow">
            <MoneyFlowSection model={model} mode={mode} selectedPersonName={selectedPersonName} />
          </AnalyticsSection>

          <Separator />

          <AnalyticsSection id="trends" icon={LineChart} title="Trends">
            <TrendsSection model={model} mode={mode} getCategoryIconFromName={getCategoryIconFromName} />
          </AnalyticsSection>

          <Separator />

          <AnalyticsSection id="activity" icon={Activity} title="Activity">
            <ActivitySection model={model} />
          </AnalyticsSection>

          <Separator />

          <AnalyticsSection id="records" icon={ReceiptText} title="Records">
            <RecordsSection model={model} getCategoryIconFromName={getCategoryIconFromName} />
          </AnalyticsSection>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsToolbar({
  mode,
  onModeChange,
  datePreset,
  onDatePresetChange,
  granularity,
  onGranularityChange,
  selectedPersonId,
  onSelectedPersonIdChange,
  people,
  peopleMap,
  isLoadingPeople,
}: {
  mode: AnalyticsMode;
  onModeChange: (mode: AnalyticsMode) => void;
  datePreset: AnalyticsDatePreset;
  onDatePresetChange: (preset: AnalyticsDatePreset) => void;
  granularity: AnalyticsGranularity;
  onGranularityChange: (granularity: AnalyticsGranularity) => void;
  selectedPersonId: string | null;
  onSelectedPersonIdChange: (personId: string) => void;
  people: Person[];
  peopleMap: Record<string, string>;
  isLoadingPeople: boolean;
}) {
  return (
    <div className={cn("grid gap-2", mode === "personal" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}>
      <div className="min-w-0 space-y-1.5">
        <Label className="text-xs text-muted-foreground">View</Label>
        <Tabs value={mode} onValueChange={(value) => onModeChange(value as AnalyticsMode)} className="w-full">
          <TabsList className="grid h-9 w-full grid-cols-2">
            <TabsTrigger value="group" className="text-xs sm:text-sm">
              Group
            </TabsTrigger>
            <TabsTrigger value="personal" className="text-xs sm:text-sm">
              Personal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="analytics-date-range" className="text-xs text-muted-foreground">
          Date range
        </Label>
        <Select value={datePreset} onValueChange={(value) => onDatePresetChange(value as AnalyticsDatePreset)}>
          <SelectTrigger id="analytics-date-range" className="h-9 w-full">
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

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="analytics-granularity" className="text-xs text-muted-foreground">
          Granularity
        </Label>
        <Select value={granularity} onValueChange={(value) => onGranularityChange(value as AnalyticsGranularity)}>
          <SelectTrigger id="analytics-granularity" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRANULARITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "personal" ? (
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="analytics-person" className="text-xs text-muted-foreground">
            Person
          </Label>
          <Select
            value={selectedPersonId || ""}
            onValueChange={onSelectedPersonIdChange}
            disabled={isLoadingPeople || people.length === 0}
          >
            <SelectTrigger id="analytics-person" className="h-9 w-full">
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

function AnalyticsSection({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: AnalyticsSectionId;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 min-w-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold text-primary">{title}</h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function OperationalPanel({
  title,
  description,
  actions,
  children,
  className,
  tone = "default",
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className={cn(panelClass, tone === "muted" && "bg-secondary/20", className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h3 className="text-sm sm:text-base font-semibold text-foreground">{title}</h3> : null}
            {description ? <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("min-w-0", title || description || actions ? "mt-4" : "")}>{children}</div>
    </div>
  );
}

function OverviewSection({
  model,
  mode,
  selectedPersonName,
}: {
  model: AnalyticsViewModel;
  mode: AnalyticsMode;
  selectedPersonName: string;
}) {
  const topCategory = model.snapshot.topCategory;
  const largestExpense = model.snapshot.largestExpense;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <OperationalPanel
        title={mode === "personal" ? `${selectedPersonName}'s overview` : "Group overview"}
        description={model.dateRange.label}
        className="h-full"
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {mode === "personal" ? "Total share" : "Total spend"}
            </p>
            <div className="mt-2 break-words text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              {formatAnalyticsCurrency(model.snapshot.totalSpend)}
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className={insetTileClass}>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <PieChart className="h-4 w-4 text-primary" />
                Top category
              </div>
              <p className="mt-2 text-lg font-semibold text-foreground">{topCategory?.name || "No category yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {topCategory ? formatAnalyticsCurrency(topCategory.amount) : formatAnalyticsCurrency(0)}
              </p>
            </div>

            <div className={insetTileClass}>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Largest expense
              </div>
              <p className="mt-2 truncate text-lg font-semibold text-foreground">
                {largestExpense?.description || "No expense yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {largestExpense ? `${formatAnalyticsCurrency(largestExpense.amount)} • ${largestExpense.dateLabel}` : model.dateRange.label}
              </p>
            </div>
          </div>
        </div>
      </OperationalPanel>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <OverviewStatTile
          label={mode === "personal" ? "Current balance" : "Outstanding"}
          value={
            mode === "personal"
              ? signedCurrency(model.snapshot.currentNetBalance || 0)
              : formatAnalyticsCurrency(model.snapshot.totalOutstanding)
          }
        />
        <OverviewStatTile label="Expenses" value={`${model.snapshot.expenseCount}`} detail={`${model.snapshot.participantCount} people`} />
        <OverviewStatTile label="Average" value={formatAnalyticsCurrency(model.snapshot.averageExpense)} detail="Counted entries only" />
        <OperationalPanel title="Status" className="h-full">
          <div className="space-y-3 text-sm">
            <SummaryLine label="Balance check" value={model.trust.balanceReconciled ? "Reconciled" : "Needs review"} />
            <SummaryLine label="Settlements" value={`${model.trust.settlementPaymentCount} recorded`} />
            <SummaryLine label="Excluded" value={`${model.trust.excludedExpenseCount} expenses`} />
            <SummaryLine label="Warnings" value={`${model.trust.dataQualityWarningCount}`} />
          </div>
        </OperationalPanel>
      </div>
    </div>
  );
}

function OverviewStatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className={cn(insetTileClass, "shadow-sm")}>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground break-words">{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function MoneyFlowSection({
  model,
  mode,
  selectedPersonName,
}: {
  model: AnalyticsViewModel;
  mode: AnalyticsMode;
  selectedPersonName: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <OperationalPanel
          title={mode === "personal" ? `${selectedPersonName}'s balance` : "Settlement position"}
          className="h-full"
        >
          {mode === "personal" ? (
            <div className="min-w-0 overflow-hidden">
              <VisxLineChart
                data={model.charts.balanceTimeline.map((point) => ({
                  key: point.key,
                  label: point.label,
                  value: point.balance,
                  sortValue: point.sortValue,
                }))}
                valueLabel="Balance"
                color={model.snapshot.currentNetBalance && model.snapshot.currentNetBalance < 0 ? "#c2415d" : "#2f7d68"}
                balanceMode
              />
            </div>
          ) : (
            <SettlementPositionPanel model={model} />
          )}
        </OperationalPanel>

        <OperationalPanel
          title={mode === "personal" ? "Paid vs share" : "Paid vs share by person"}
          className="h-full"
        >
          <div className="min-w-0 overflow-hidden">
            <BarChart
              data={model.charts.paidVsShare.map((row) => ({
                key: row.personId,
                label: row.name,
                paid: row.paid,
                obligation: row.obligation,
              }))}
              series={[
                { id: "paid", label: "Paid", color: "#111827" },
                { id: "obligation", label: "Share", color: "#c47f2a" },
              ]}
            />
          </div>
        </OperationalPanel>
      </div>

      <OperationalPanel title={mode === "personal" ? "Group context" : "Participant balances"}>
        <ParticipantBalanceGrid
          rows={model.details.participantRows}
          selectedPersonId={mode === "personal" ? model.selectedPersonId : null}
        />
      </OperationalPanel>
    </div>
  );
}

function TrendsSection({
  model,
  mode,
  getCategoryIconFromName,
}: {
  model: AnalyticsViewModel;
  mode: AnalyticsMode;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  const breakdownRows = model.charts.categoryBreakdown.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <OperationalPanel title={mode === "personal" ? "Share over time" : "Spend over time"} className="h-full">
          <div className="min-w-0 overflow-hidden">
            <VisxLineChart
              data={model.charts.spendingTrend}
              valueLabel={mode === "personal" ? "Share" : "Spend"}
              color="#2f7d68"
            />
          </div>
        </OperationalPanel>

        <OperationalPanel title="Category trend" className="h-full">
          <div className="min-w-0 overflow-hidden">
            <StackedAreaChart
              data={model.charts.categoryTrend.data}
              categories={model.charts.categoryTrend.categories}
            />
          </div>
        </OperationalPanel>
      </div>

      <OperationalPanel title="Category breakdown">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,250px)_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0 overflow-hidden">
            <DonutChart
              data={breakdownRows.map((row) => ({
                name: row.name,
                amount: row.amount,
                share: row.share,
              }))}
            />
          </div>

          <CategoryBreakdownList rows={breakdownRows} getCategoryIconFromName={getCategoryIconFromName} />
        </div>
      </OperationalPanel>
    </div>
  );
}

function ActivitySection({ model }: { model: AnalyticsViewModel }) {
  const [cadenceView, setCadenceView] = useState<AnalyticsCadenceView>("frequency");
  const cadenceData = cadenceView === "frequency" ? model.charts.frequency : model.charts.velocity;
  const cadenceLabel = cadenceView === "frequency" ? "Daily frequency" : "Weekly velocity";
  const cadenceValueLabel = cadenceView === "frequency" ? "Expenses" : "Expenses per week";
  const cadenceColor = cadenceView === "frequency" ? "#111827" : "#c47f2a";

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <OperationalPanel title="Activity heatmap" className="h-full">
          <HeatmapCalendar data={model.charts.activityHeatmap} />
        </OperationalPanel>

        <div className="grid min-w-0 gap-4">
          <OperationalPanel title="Spend by day">
            <div className="min-w-0 overflow-hidden">
              <BarChart
                data={model.charts.dayOfWeek.map((point) => ({
                  key: point.key,
                  label: point.label,
                  value: point.value,
                }))}
                series={[{ id: "value", label: "Spend", color: "#111827" }]}
              />
            </div>
          </OperationalPanel>

          <OperationalPanel
            title="Cadence"
            actions={
              <div className="w-full sm:w-44">
                <Select value={cadenceView} onValueChange={(value) => setCadenceView(value as AnalyticsCadenceView)}>
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">Daily frequency</SelectItem>
                    <SelectItem value="velocity">Weekly velocity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="space-y-3">
              <div className={insetTileClass}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{cadenceLabel}</p>
                  <p className="text-xs text-muted-foreground">{cadenceValueLabel}</p>
                </div>
                <div className="mt-4 min-w-0 overflow-hidden">
                  <VisxLineChart
                    data={cadenceData}
                    valueLabel={cadenceValueLabel}
                    valueFormatter={(value) => `${value}`}
                    color={cadenceColor}
                    integerAxis
                    height={220}
                  />
                </div>
              </div>
            </div>
          </OperationalPanel>
        </div>
      </div>

      <OperationalPanel title="Expense size">
        <div className="min-w-0 overflow-hidden">
          <Histogram data={model.charts.expenseSizeDistribution} valueLabel="Expenses" />
        </div>
      </OperationalPanel>
    </div>
  );
}

function RecordsSection({
  model,
  getCategoryIconFromName,
}: {
  model: AnalyticsViewModel;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <OperationalPanel title="Top expenses">
        <TopExpensesList rows={model.details.topExpenses} />
      </OperationalPanel>

      <OperationalPanel title="Category deep dive">
        <CategoryDeepDiveList rows={model.details.categoryRows} getCategoryIconFromName={getCategoryIconFromName} />
      </OperationalPanel>
    </div>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="shrink-0 font-medium text-foreground">{value}</span>
    </div>
  );
}

function SettlementPositionPanel({ model }: { model: AnalyticsViewModel }) {
  const positiveRows = [...model.details.participantRows]
    .filter((row) => row.netBalance > 0)
    .sort((a, b) => b.netBalance - a.netBalance);
  const negativeRows = [...model.details.participantRows]
    .filter((row) => row.netBalance < 0)
    .sort((a, b) => a.netBalance - b.netBalance);
  const topCreditor = positiveRows[0] || null;
  const topDebtor = negativeRows[0] || null;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricBlock label="Outstanding" value={formatAnalyticsCurrency(model.snapshot.totalOutstanding)} />
        <MetricBlock
          label="Balance delta"
          value={formatAnalyticsCurrency(Math.abs(model.trust.balanceDelta))}
          subdued={model.trust.balanceReconciled}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BalanceCallout
          label="Top creditor"
          name={topCreditor?.name || "No creditor"}
          value={topCreditor ? signedCurrency(topCreditor.netBalance) : formatAnalyticsCurrency(0)}
        />
        <BalanceCallout
          label="Top debtor"
          name={topDebtor?.name || "No debtor"}
          value={topDebtor ? signedCurrency(topDebtor.netBalance) : formatAnalyticsCurrency(0)}
        />
      </div>

      <div className="space-y-2">
        {model.details.participantRows.slice(0, 5).map((row) => (
          <div key={row.personId} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/25 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{row.name}</div>
              <div className="text-xs text-muted-foreground">
                {row.expensesSharedCount} shared / {row.expensesPaidCount} paid
              </div>
            </div>
            <BalanceBadge value={row.netBalance} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: string;
  subdued?: boolean;
}) {
  return (
    <div className={cn(insetTileClass, subdued ? "shadow-sm" : "bg-secondary/20")}>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground break-words">{value}</p>
    </div>
  );
}

function BalanceCallout({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <div className={cn(insetTileClass, "shadow-sm")}>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold text-foreground">{name}</p>
      <p className="mt-1 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function ParticipantBalanceGrid({
  rows,
  selectedPersonId,
}: {
  rows: AnalyticsViewModel["details"]["participantRows"];
  selectedPersonId: string | null;
}) {
  const orderedRows = [...rows].sort((a, b) => {
    if (selectedPersonId) {
      if (a.personId === selectedPersonId) return -1;
      if (b.personId === selectedPersonId) return 1;
    }
    return Math.abs(b.netBalance) - Math.abs(a.netBalance);
  });

  if (!orderedRows.length) {
    return <EmptyPanel message="No participant balances are available here yet." />;
  }

  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {orderedRows.map((row) => {
        const isSelected = row.personId === selectedPersonId;
        return (
          <div
            key={row.personId}
            className={cn(
              "rounded-lg border p-4 min-w-0",
              isSelected ? "bg-background shadow-sm" : "bg-secondary/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-medium text-foreground">{row.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.expensesSharedCount} shared / {row.expensesPaidCount} paid
                </div>
              </div>
              <BalanceBadge value={row.netBalance} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <MiniValue label="Paid" value={formatAnalyticsCompactCurrency(row.paid)} />
              <MiniValue label="Share" value={formatAnalyticsCompactCurrency(row.obligation)} />
              <MiniValue label="Sent" value={formatAnalyticsCompactCurrency(row.settlementsSent)} />
              <MiniValue label="Received" value={formatAnalyticsCompactCurrency(row.settlementsReceived)} />
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              {row.topCategory ? `Top category: ${row.topCategory.name}` : "No category lead yet"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryBreakdownList({
  rows,
  getCategoryIconFromName,
}: {
  rows: AnalyticsViewModel["charts"]["categoryBreakdown"];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  if (!rows.length) {
    return <EmptyPanel message="No category breakdown is available here yet." />;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const Icon = getCategoryIconFromName(row.iconName);
        return (
          <div key={row.name} className={cn(insetTileClass, "shadow-sm")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/35">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.expenseCount} expenses</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium text-foreground">{formatAnalyticsCurrency(row.amount)}</div>
                <div className="text-xs text-muted-foreground">{row.share.toFixed(1)}%</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-secondary/40">
              <div className="h-full rounded-full bg-black/85" style={{ width: `${Math.max(6, Math.min(100, row.share))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopExpensesList({
  rows,
}: {
  rows: AnalyticsViewModel["details"]["topExpenses"];
}) {
  if (!rows.length) {
    return <EmptyPanel message="No expenses landed in this view." />;
  }

  return (
    <div className="space-y-3">
      {rows.map((expense, index) => (
        <div key={expense.id} className="rounded-lg bg-secondary/25 p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-background text-sm font-medium text-foreground shadow-sm">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-foreground">{expense.description}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{expense.category}</span>
                    <span>{expense.dateLabel}</span>
                    <span>{expense.paidBy}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-medium text-foreground">{formatAnalyticsCurrency(expense.amount)}</p>
                  {expense.excluded ? (
                    <Badge variant="outline" className="mt-2 rounded-full bg-background px-2.5 py-1 text-[10px]">
                      Excluded
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryDeepDiveList({
  rows,
  getCategoryIconFromName,
}: {
  rows: AnalyticsViewModel["details"]["categoryRows"];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  if (!rows.length) {
    return <EmptyPanel message="No category context is available in this view." />;
  }

  return (
    <div className="space-y-3">
      {rows.map((category) => {
        const Icon = getCategoryIconFromName(category.iconName);
        return (
          <div key={category.name} className={cn(insetTileClass, "shadow-sm")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/35">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{category.name}</div>
                  <div className="text-xs text-muted-foreground">{category.expenseCount} expenses</div>
                </div>
              </div>
              <div className="shrink-0 text-right font-medium text-foreground">
                {formatAnalyticsCurrency(category.totalAmount)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <MiniValue label="Average" value={formatAnalyticsCompactCurrency(category.averageAmount)} />
              <MiniValue label="Top payer" value={category.topPayer ? category.topPayer.name : "N/A"} />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {category.largestEntry
                ? `Largest entry: ${category.largestEntry.description} · ${formatAnalyticsCurrency(category.largestEntry.amount)}`
                : "No standout entry yet"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BalanceBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium",
        isPositive ? "bg-background text-foreground" : "bg-secondary/55 text-foreground",
      )}
    >
      {signedCurrency(value)}
    </Badge>
  );
}

function MiniValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-secondary/35 px-3 py-2">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="rounded-lg border bg-secondary/20 px-4 py-5 text-sm text-muted-foreground">{message}</div>;
}

function AnalyticsEmptyState() {
  return (
    <Card className="shadow-lg rounded-lg h-full flex flex-col">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <BarChart4 className="mr-2 h-5 w-5 text-primary" />
          Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 text-center">
        <div className="max-w-md">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary/50">
            <BarChart4 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-5 text-xl sm:text-2xl font-semibold text-foreground">No analytics yet</h2>
          <p className="mt-3 text-sm text-muted-foreground">Add expenses to unlock the dashboard.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <Card className="shadow-lg rounded-lg h-full flex flex-col">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>

          <Separator />

          <div className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Skeleton className="h-[250px] rounded-lg" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-[120px] rounded-lg" />
                <Skeleton className="h-[120px] rounded-lg" />
                <Skeleton className="h-[120px] rounded-lg" />
                <Skeleton className="h-[120px] rounded-lg" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="grid gap-4 xl:grid-cols-2">
              <Skeleton className="h-[320px] rounded-lg" />
              <Skeleton className="h-[320px] rounded-lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function signedCurrency(value: number) {
  if (Math.abs(value) < 0.01) return formatAnalyticsCurrency(0);
  return value > 0 ? `+${formatAnalyticsCurrency(value)}` : formatAnalyticsCurrency(value);
}
