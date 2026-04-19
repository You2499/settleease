"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart4,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Eye,
  GitFork,
  LayoutGrid,
  LineChart,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Sigma,
  Sparkles,
  UserSquare,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { crashTestManager } from "@/lib/settleease/crashTestContext";
import type { Category, Expense, Person, SettlementPayment } from "@/lib/settleease/types";
import { cn } from "@/lib/utils";

import {
  BarChart,
  ChartFrame,
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

const DATE_PRESETS: Array<{ value: AnalyticsDatePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
];

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
  useEffect(() => {
    crashTestManager.checkAndCrash("analytics", "Analytics Tab crashed: Chart rendering failed with invalid data processing");
  });

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

  const isLoading = isLoadingPeople || isLoadingExpenses || isLoadingCategories || isLoadingSettlements || !isDataFetchedAtLeastOnce;

  const model = useMemo(() => buildAnalyticsModel({
    expenses,
    settlementPayments,
    people,
    peopleMap,
    categories: dynamicCategories,
    mode,
    selectedPersonId,
    dateRange: { preset: datePreset },
    granularity,
  }), [datePreset, dynamicCategories, expenses, granularity, mode, people, peopleMap, selectedPersonId, settlementPayments]);

  const selectedPersonName = model.selectedPersonName || "Selected person";

  if (isLoading) return <AnalyticsSkeleton />;

  if (!expenses.length) {
    return (
      <div className="h-full w-full overflow-x-hidden overflow-y-auto">
        <Card className="mx-auto mt-4 max-w-2xl rounded-lg py-8 text-center shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <BarChart4 className="h-5 w-5" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 text-sm text-muted-foreground">
            Add expenses to see spending, balances, categories, and settlement activity here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-0 pb-10 pt-4 sm:gap-6">
        <header className="flex flex-col gap-4 rounded-lg bg-card px-4 py-4 shadow-lg sm:px-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified analytics
            </div>
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Analytics</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Spending, balances, and settlement movement from one reconciled model.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
            <Tabs
              value={mode}
              onValueChange={(value) => {
                const nextMode = value as AnalyticsMode;
                setMode(nextMode);
                if (nextMode === "group") setSelectedPersonId(null);
              }}
              className="min-w-0"
            >
              <TabsList className="grid h-11 w-full grid-cols-2">
                <TabsTrigger value="group" className="min-h-10 gap-2 text-xs sm:text-sm">
                  <Eye className="h-4 w-4" />
                  Group
                </TabsTrigger>
                <TabsTrigger value="personal" className="min-h-10 gap-2 text-xs sm:text-sm">
                  <UserSquare className="h-4 w-4" />
                  Personal
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-2">
              <Select value={datePreset} onValueChange={(value) => setDatePreset(value as AnalyticsDatePreset)}>
                <SelectTrigger className="h-11 text-sm" aria-label="Date range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={granularity} onValueChange={(value) => setGranularity(value as AnalyticsGranularity)}>
                <SelectTrigger className="h-11 text-sm" aria-label="Granularity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "personal" ? (
              <div className="sm:col-span-2">
                <Label htmlFor="analytics-person" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Person
                </Label>
                <Select
                  value={model.selectedPersonId || ""}
                  onValueChange={setSelectedPersonId}
                  disabled={!people.length}
                >
                  <SelectTrigger id="analytics-person" className="h-11 text-sm">
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {people.map((person) => (
                      <SelectItem key={person.id} value={person.id}>{peopleMap[person.id] || person.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </header>

        <TrustStrip model={model} mode={mode} selectedPersonName={selectedPersonName} />

        <AnalyticsSection title="Overview" icon={Sigma} defaultOpen>
          <OverviewGrid model={model} mode={mode} />
        </AnalyticsSection>

        <AnalyticsSection title="Balance & Settlements" icon={CircleDollarSign} defaultOpen>
          <div className="grid gap-4 lg:grid-cols-2">
            {mode === "personal" ? (
              <ChartFrame
                title={`${selectedPersonName}'s Balance Over Time`}
                description="Positive means they are owed. Negative means they owe."
              >
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
              </ChartFrame>
            ) : (
              <SettlementSummaryPanel model={model} />
            )}

            <ChartFrame
              title={mode === "personal" ? "Paid vs Share" : "Paid vs Share by Person"}
              description="Share includes regular shares and celebration contributions."
            >
              <BarChart
                data={model.charts.paidVsShare.map((row) => ({
                  key: row.personId,
                  label: row.name,
                  paid: row.paid,
                  obligation: row.obligation,
                }))}
                series={[
                  { id: "paid", label: "Paid", color: "#2f7d68" },
                  { id: "obligation", label: "Share", color: "#c47f2a" },
                ]}
              />
            </ChartFrame>
          </div>
          <ParticipantCards rows={model.details.participantRows} compact={mode === "personal"} />
        </AnalyticsSection>

        <AnalyticsSection title="Spending Trends" icon={LineChart} defaultOpen>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame
              title={mode === "personal" ? `${selectedPersonName}'s Spending` : "Group Spending"}
              description={`Grouped ${model.granularity}. Excluded expenses still count as spending.`}
            >
              <VisxLineChart
                data={model.charts.spendingTrend}
                valueLabel={mode === "personal" ? "Share" : "Spent"}
                color="#2f7d68"
              />
            </ChartFrame>
            <ChartFrame title="Category Trends" description="Top categories over the selected range.">
              <StackedAreaChart data={model.charts.categoryTrend.data} categories={model.charts.categoryTrend.categories} />
            </ChartFrame>
            <ChartFrame title="Spending by Day" description="Which weekdays carry the most spend.">
              <BarChart
                data={model.charts.dayOfWeek.map((point) => ({ key: point.key, label: point.label, value: point.value }))}
                series={[{ id: "value", label: "Spent", color: "#111827" }]}
              />
            </ChartFrame>
            <ChartFrame title="Average by Category" description="Average amount per expense in each category.">
              <BarChart
                data={model.charts.averageByCategory.slice(0, 8).map((point) => ({ key: point.key, label: point.label, value: point.value }))}
                series={[{ id: "value", label: "Average", color: "#777169" }]}
                horizontal
              />
            </ChartFrame>
          </div>
        </AnalyticsSection>

        <AnalyticsSection title="Composition" icon={PieChart}>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartFrame title="Category Breakdown" className="lg:col-span-2">
              <DonutChart data={model.charts.categoryBreakdown.slice(0, 6).map((row) => ({ name: row.name, amount: row.amount, share: row.share }))} />
            </ChartFrame>
            <ChartFrame title="Split Methods">
              <DonutChart
                data={model.charts.splitMethods.map((row) => ({ name: row.label, amount: row.count, share: row.share }))}
                valueFormatter={(value) => `${value} expense${value === 1 ? "" : "s"}`}
              />
            </ChartFrame>
            <ChartFrame title="Expense Size Distribution" className="lg:col-span-3">
              <Histogram data={model.charts.expenseSizeDistribution} valueLabel="Expenses" />
            </ChartFrame>
          </div>
        </AnalyticsSection>

        <AnalyticsSection title="Activity Patterns" icon={Activity}>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartFrame title="Expense Activity Heatmap" description="Tap a day to inspect the expense list.">
              <HeatmapCalendar data={model.charts.activityHeatmap} />
            </ChartFrame>
            <div className="grid gap-4">
              <ChartFrame title="Expense Frequency" description="Daily expense count in the selected range.">
                <VisxLineChart
                  data={model.charts.frequency}
                  valueLabel="Expenses"
                  valueFormatter={(value) => `${value}`}
                  color="#111827"
                />
              </ChartFrame>
              <ChartFrame title="Expense Velocity" description="Expenses per week.">
                <VisxLineChart
                  data={model.charts.velocity}
                  valueLabel="Expenses per week"
                  valueFormatter={(value) => `${value}`}
                  color="#c47f2a"
                  height={320}
                />
              </ChartFrame>
            </div>
          </div>
        </AnalyticsSection>

        <AnalyticsSection title="Details" icon={ReceiptText}>
          <DetailsGrid
            model={model}
            getCategoryIconFromName={getCategoryIconFromName}
          />
        </AnalyticsSection>
      </div>
    </div>
  );
}

function TrustStrip({
  model,
  mode,
  selectedPersonName,
}: {
  model: ReturnType<typeof buildAnalyticsModel>;
  mode: AnalyticsMode;
  selectedPersonName: string;
}) {
  const balanceText = mode === "personal"
    ? `${selectedPersonName}: ${signedCurrency(model.snapshot.currentNetBalance || 0)}`
    : `${formatAnalyticsCurrency(model.snapshot.totalOutstanding)} outstanding`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TrustItem icon={ShieldCheck} label="Balance check" value={model.trust.balanceReconciled ? "Reconciled" : "Needs review"} tone={model.trust.balanceReconciled ? "good" : "warn"} />
      <TrustItem icon={Sparkles} label="Current position" value={balanceText} />
      <TrustItem icon={ReceiptText} label="Expenses counted" value={`${model.trust.spendingExpenseCount} spending / ${model.trust.settlementExpenseCount} settlement`} />
      <TrustItem icon={AlertTriangle} label="Data warnings" value={`${model.trust.dataQualityWarningCount}`} tone={model.trust.dataQualityWarningCount ? "warn" : "good"} />
    </div>
  );
}

function TrustItem({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-card px-4 py-3 shadow-sm">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted",
        tone === "good" && "bg-green-100 text-green-700",
        tone === "warn" && "bg-yellow-100 text-yellow-800"
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

function AnalyticsSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="min-w-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate text-lg font-semibold sm:text-xl">{title}</h2>
          </div>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-11 min-w-11 gap-2">
              <span className="hidden sm:inline">{open ? "Hide" : "Show"}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="min-w-0 space-y-4">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function OverviewGrid({
  model,
  mode,
}: {
  model: ReturnType<typeof buildAnalyticsModel>;
  mode: AnalyticsMode;
}) {
  const stats = [
    {
      label: mode === "personal" ? "Total Share" : "Total Spend",
      value: formatAnalyticsCurrency(model.snapshot.totalSpend),
      detail: model.dateRange.label,
      icon: CircleDollarSign,
    },
    {
      label: "Expenses",
      value: `${model.snapshot.expenseCount}`,
      detail: `${model.trust.excludedExpenseCount} excluded from settlement`,
      icon: ReceiptText,
    },
    {
      label: "Average",
      value: formatAnalyticsCurrency(model.snapshot.averageExpense),
      detail: "Per counted expense",
      icon: BarChart4,
    },
    {
      label: mode === "personal" ? "Current Balance" : "Outstanding",
      value: mode === "personal"
        ? signedCurrency(model.snapshot.currentNetBalance || 0)
        : formatAnalyticsCurrency(model.snapshot.totalOutstanding),
      detail: mode === "personal" ? "After settlements" : "Total owed to creditors",
      icon: Users,
    },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <InsightCard
          icon={LayoutGrid}
          label="Top category"
          title={model.snapshot.topCategory?.name || "No category yet"}
          value={model.snapshot.topCategory ? formatAnalyticsCurrency(model.snapshot.topCategory.amount) : formatAnalyticsCurrency(0)}
        />
        <InsightCard
          icon={CalendarDays}
          label="Largest expense"
          title={model.snapshot.largestExpense?.description || "No expense yet"}
          value={model.snapshot.largestExpense ? `${formatAnalyticsCurrency(model.snapshot.largestExpense.amount)} on ${model.snapshot.largestExpense.dateLabel}` : model.snapshot.dateRangeLabel}
        />
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="truncate text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="truncate text-xl font-semibold">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-lg bg-card p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-base font-semibold">{title}</div>
        <div className="truncate text-sm text-muted-foreground">{value}</div>
      </div>
    </div>
  );
}

function SettlementSummaryPanel({ model }: { model: ReturnType<typeof buildAnalyticsModel> }) {
  return (
    <ChartFrame title="Settlement Position" description="Net positions after recorded settlement payments.">
      <div className="grid min-h-[280px] content-center gap-3">
        <div className="rounded-lg bg-muted/35 p-4">
          <div className="text-sm text-muted-foreground">Outstanding across the group</div>
          <div className="mt-1 text-2xl font-semibold">{formatAnalyticsCurrency(model.snapshot.totalOutstanding)}</div>
        </div>
        <div className="grid gap-2">
          {model.details.participantRows.slice(0, 5).map((row) => (
            <div key={row.personId} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{row.name}</span>
              <Badge variant={row.netBalance >= 0 ? "secondary" : "outline"} className="shrink-0">
                {signedCurrency(row.netBalance)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function ParticipantCards({
  rows,
  compact,
}: {
  rows: ReturnType<typeof buildAnalyticsModel>["details"]["participantRows"];
  compact?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <div className={cn("grid gap-3", compact ? "sm:grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3")}>
      {rows.map((row) => (
        <div key={row.personId} className="min-w-0 rounded-lg bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-semibold">{row.name}</div>
              <div className="text-xs text-muted-foreground">{row.expensesSharedCount} shared / {row.expensesPaidCount} paid</div>
            </div>
            <Badge variant={row.netBalance >= 0 ? "secondary" : "outline"}>{signedCurrency(row.netBalance)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <MiniStat label="Paid" value={formatAnalyticsCompactCurrency(row.paid)} />
            <MiniStat label="Share" value={formatAnalyticsCompactCurrency(row.obligation)} />
            <MiniStat label="Sent" value={formatAnalyticsCompactCurrency(row.settlementsSent)} />
            <MiniStat label="Received" value={formatAnalyticsCompactCurrency(row.settlementsReceived)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/35 px-3 py-2">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  );
}

function DetailsGrid({
  model,
  getCategoryIconFromName,
}: {
  model: ReturnType<typeof buildAnalyticsModel>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame title="Top Expenses" description="Largest expenses or personal shares in the selected view.">
        <div className="space-y-2">
          {model.details.topExpenses.length ? model.details.topExpenses.map((expense) => (
            <div key={expense.id} className="grid gap-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="truncate font-medium">{expense.description}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{expense.category}</span>
                  <span>{expense.dateLabel}</span>
                  {expense.excluded ? <Badge variant="outline" className="px-1.5 py-0 text-[10px]">Excluded</Badge> : null}
                </div>
              </div>
              <div className="font-semibold sm:text-right">{formatAnalyticsCurrency(expense.amount)}</div>
            </div>
          )) : <EmptyDetails label="No expenses in this view." />}
        </div>
      </ChartFrame>

      <ChartFrame title="Category Deep Dive" description="Totals, averages, and payer context by category.">
        <div className="space-y-2">
          {model.details.categoryRows.length ? model.details.categoryRows.map((category) => {
            const Icon = getCategoryIconFromName(category.iconName);
            return (
              <div key={category.name} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.expenseCount} expenses</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-semibold">{formatAnalyticsCurrency(category.totalAmount)}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <MiniStat label="Average" value={formatAnalyticsCompactCurrency(category.averageAmount)} />
                  <MiniStat label="Top payer" value={category.topPayer ? category.topPayer.name : "N/A"} />
                </div>
              </div>
            );
          }) : <EmptyDetails label="No category spending in this view." />}
        </div>
      </ChartFrame>
    </div>
  );
}

function EmptyDetails({ label }: { label: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-lg bg-muted/35 px-4 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-0 pb-10 pt-4">
        <div className="rounded-lg bg-card p-4 shadow-lg">
          <Skeleton className="mb-3 h-6 w-36" />
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-lg" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-96 w-full rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

function signedCurrency(value: number) {
  if (Math.abs(value) < 0.01) return formatAnalyticsCurrency(0);
  return value > 0 ? `+${formatAnalyticsCurrency(value)}` : formatAnalyticsCurrency(value);
}
