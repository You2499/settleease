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
type AnalyticsSectionId = "money-flow" | "spending-intelligence" | "patterns" | "records";
type AnalyticsSurfaceVariant = "featured" | "supporting" | "compact";
type AnalyticsPanelTone = "white" | "warm";

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

  if (!expenses.length) {
    return <AnalyticsEmptyState />;
  }

  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto">
      <InsightsLayout className="max-w-7xl">
        <AnalyticsHero
          mode={mode}
          onModeChange={(nextMode) => {
            setMode(nextMode);
            if (nextMode === "group") setSelectedPersonId(null);
          }}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          granularity={granularity}
          onGranularityChange={setGranularity}
          selectedPersonId={model.selectedPersonId}
          onSelectedPersonIdChange={setSelectedPersonId}
          selectedPersonName={selectedPersonName}
          people={people}
          peopleMap={peopleMap}
          isLoadingPeople={isLoadingPeople}
          model={model}
        />

        <SummaryBand model={model} mode={mode} selectedPersonName={selectedPersonName} />
        <TrustRibbon model={model} />

        <DashboardSection
          id="money-flow"
          label="Money Flow"
          title={mode === "personal" ? `${selectedPersonName}'s money flow` : "Who covered what"}
          icon={<CircleDollarSign className="h-4 w-4" />}
        >
          <MoneyFlowSection model={model} mode={mode} selectedPersonName={selectedPersonName} />
        </DashboardSection>

        <DashboardSection
          id="spending-intelligence"
          label="Spending Intelligence"
          title={mode === "personal" ? "How your share moved" : "How the group spent"}
          icon={<LineChart className="h-4 w-4" />}
        >
          <SpendingIntelligenceSection
            model={model}
            mode={mode}
            getCategoryIconFromName={getCategoryIconFromName}
          />
        </DashboardSection>

        <DashboardSection
          id="patterns"
          label="Patterns"
          title="When activity shows up"
          icon={<Activity className="h-4 w-4" />}
        >
          <PatternsSection model={model} />
        </DashboardSection>

        <DashboardSection
          id="records"
          label="Records"
          title="Largest moves"
          icon={<ReceiptText className="h-4 w-4" />}
        >
          <RecordsSection model={model} getCategoryIconFromName={getCategoryIconFromName} />
        </DashboardSection>
      </InsightsLayout>
    </div>
  );
}

function AnalyticsHero({
  mode,
  onModeChange,
  datePreset,
  onDatePresetChange,
  granularity,
  onGranularityChange,
  selectedPersonId,
  onSelectedPersonIdChange,
  selectedPersonName,
  people,
  peopleMap,
  isLoadingPeople,
  model,
}: {
  mode: AnalyticsMode;
  onModeChange: (mode: AnalyticsMode) => void;
  datePreset: AnalyticsDatePreset;
  onDatePresetChange: (preset: AnalyticsDatePreset) => void;
  granularity: AnalyticsGranularity;
  onGranularityChange: (granularity: AnalyticsGranularity) => void;
  selectedPersonId: string | null;
  onSelectedPersonIdChange: (personId: string) => void;
  selectedPersonName: string;
  people: Person[];
  peopleMap: Record<string, string>;
  isLoadingPeople: boolean;
  model: AnalyticsViewModel;
}) {
  return (
    <InsightsPageHeader
      icon={BarChart4}
      title="Analytics"
      meta={
        <>
          <InsightsMetaBadge icon={CalendarDays} label={model.dateRange.label} />
          <InsightsMetaBadge
            icon={Users}
            label={mode === "group" ? `${model.snapshot.participantCount} people` : selectedPersonName}
          />
          <InsightsMetaBadge
            icon={ShieldCheck}
            label={model.trust.balanceReconciled ? "Reconciled" : "Needs review"}
          />
        </>
      }
      controls={
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,180px)_minmax(0,220px)]">
          <div className="min-w-0">
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">View</Label>
            <Tabs
              value={mode}
              onValueChange={(value) => onModeChange(value as AnalyticsMode)}
              className="w-full"
            >
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
            <Label htmlFor="analytics-date-preset" className="mb-2 block text-xs font-medium text-muted-foreground">
              Date range
            </Label>
            <Select value={datePreset} onValueChange={(value) => onDatePresetChange(value as AnalyticsDatePreset)}>
              <SelectTrigger id="analytics-date-preset" className={insightsSelectTriggerClass}>
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

          <div className="min-w-0">
            <Label htmlFor="analytics-granularity" className="mb-2 block text-xs font-medium text-muted-foreground">
              Granularity
            </Label>
            <Select
              value={granularity}
              onValueChange={(value) => onGranularityChange(value as AnalyticsGranularity)}
            >
              <SelectTrigger id="analytics-granularity" className={insightsSelectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRANULARITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className={insightsSelectItemClass}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "personal" ? (
            <div className="min-w-0">
              <Label htmlFor="analytics-person" className="mb-2 block text-xs font-medium text-muted-foreground">
                Person
              </Label>
              <Select
                value={selectedPersonId || ""}
                onValueChange={onSelectedPersonIdChange}
                disabled={isLoadingPeople || people.length === 0}
              >
                <SelectTrigger id="analytics-person" className={insightsSelectTriggerClass}>
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

function SummaryBand({
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
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <DashboardSurface
        eyebrow="Overview"
        title={mode === "personal" ? `${selectedPersonName}'s snapshot` : "Group overview"}
        tone="warm"
        variant="featured"
        className="h-full"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {mode === "personal" ? "Total share" : "Total spend"}
            </div>
            <div className="mt-3 break-words text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {formatAnalyticsCurrency(model.snapshot.totalSpend)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{model.dateRange.label}</p>
          </div>

          <div className="rounded-lg border bg-background/90 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {mode === "personal" ? "Current balance" : "Outstanding"}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {mode === "personal"
                ? signedCurrency(model.snapshot.currentNetBalance || 0)
                : formatAnalyticsCurrency(model.snapshot.totalOutstanding)}
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryLine label="Settlement payments" value={`${model.trust.settlementPaymentCount}`} />
              <SummaryLine
                label={mode === "personal" ? "Selected person" : "People tracked"}
                value={mode === "personal" ? selectedPersonName : `${model.snapshot.participantCount}`}
              />
              <SummaryLine
                label="Balance check"
                value={model.trust.balanceReconciled ? "Reconciled" : "Needs review"}
              />
            </div>
          </div>
        </div>
      </DashboardSurface>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <CompactMetricSurface
          eyebrow="Volume"
          title="Expenses"
          value={`${model.snapshot.expenseCount}`}
          detail={`${model.trust.excludedExpenseCount} excluded`}
          icon={ReceiptText}
        />
        <CompactMetricSurface
          eyebrow="Average"
          title="Per expense"
          value={formatAnalyticsCurrency(model.snapshot.averageExpense)}
          detail="Counted entries only"
          icon={BarChart4}
        />
        <HighlightSurface
          eyebrow="Category"
          title={topCategory?.name || "No category yet"}
          value={topCategory ? formatAnalyticsCurrency(topCategory.amount) : formatAnalyticsCurrency(0)}
          detail={topCategory ? `${topCategory.name} leads the range` : "Waiting for activity"}
          icon={PieChart}
          className="md:col-span-2"
        />
        <HighlightSurface
          eyebrow="Largest expense"
          title={largestExpense?.description || "No expense yet"}
          value={largestExpense ? formatAnalyticsCurrency(largestExpense.amount) : formatAnalyticsCurrency(0)}
          detail={largestExpense ? largestExpense.dateLabel : model.dateRange.label}
          icon={CalendarDays}
          className="md:col-span-2"
        />
      </div>
    </section>
  );
}

function TrustRibbon({ model }: { model: AnalyticsViewModel }) {
  const items: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    tone: "neutral" | "good" | "warn";
  }> = [
    {
      icon: ShieldCheck,
      label: "Balance check",
      value: model.trust.balanceReconciled ? "Reconciled" : "Needs review",
      tone: model.trust.balanceReconciled ? "good" : "warn",
    },
    {
      icon: CircleDollarSign,
      label: "Settlements",
      value: `${model.trust.settlementPaymentCount} recorded`,
      tone: "neutral" as const,
    },
    {
      icon: ReceiptText,
      label: "Excluded",
      value: `${model.trust.excludedExpenseCount} expenses`,
      tone: "neutral" as const,
    },
    {
      icon: AlertTriangle,
      label: "Warnings",
      value: `${model.trust.dataQualityWarningCount}`,
      tone: model.trust.dataQualityWarningCount ? "warn" : "good",
    },
  ];

  return (
    <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <TrustChip key={item.label} {...item} />
      ))}
    </section>
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
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <DashboardSurface
          eyebrow={mode === "personal" ? "Balance" : "Settlement"}
          title={mode === "personal" ? `${selectedPersonName}'s balance` : "Settlement position"}
          variant="featured"
          className="h-full"
        >
          {mode === "personal" ? (
            <div className="min-w-0 overflow-x-hidden">
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
        </DashboardSurface>

        <DashboardSurface
          eyebrow="Split"
          title={mode === "personal" ? "Paid vs share" : "Paid vs share by person"}
          className="h-full"
        >
          <div className="min-w-0 overflow-x-hidden">
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
        </DashboardSurface>
      </div>

      <DashboardSurface
        eyebrow="People"
        title={mode === "personal" ? "Group context" : "Participant balances"}
        tone="warm"
      >
        <ParticipantBalanceGrid
          rows={model.details.participantRows}
          selectedPersonId={mode === "personal" ? model.selectedPersonId : null}
        />
      </DashboardSurface>
    </div>
  );
}

function SpendingIntelligenceSection({
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
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <DashboardSurface
          eyebrow="Trend"
          title={mode === "personal" ? "Share over time" : "Spend over time"}
          variant="featured"
          className="h-full"
        >
          <div className="min-w-0 overflow-x-hidden">
            <VisxLineChart
              data={model.charts.spendingTrend}
              valueLabel={mode === "personal" ? "Share" : "Spend"}
              color="#2f7d68"
            />
          </div>
        </DashboardSurface>

        <DashboardSurface eyebrow="Category drift" title="Category trend" className="h-full">
          <div className="min-w-0 overflow-x-hidden">
            <StackedAreaChart
              data={model.charts.categoryTrend.data}
              categories={model.charts.categoryTrend.categories}
            />
          </div>
        </DashboardSurface>
      </div>

      <DashboardSurface eyebrow="Sources" title="Category breakdown" tone="warm">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:items-center">
          <div className="min-w-0 overflow-x-hidden">
            <DonutChart
              data={breakdownRows.map((row) => ({
                name: row.name,
                amount: row.amount,
                share: row.share,
              }))}
            />
          </div>
          <CategoryBreakdownList
            rows={breakdownRows}
            getCategoryIconFromName={getCategoryIconFromName}
          />
        </div>
      </DashboardSurface>
    </div>
  );
}

function PatternsSection({ model }: { model: AnalyticsViewModel }) {
  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
        <DashboardSurface eyebrow="Calendar" title="Activity heatmap" variant="featured">
          <HeatmapCalendar data={model.charts.activityHeatmap} />
        </DashboardSurface>

        <div className="grid min-w-0 gap-4">
          <DashboardSurface eyebrow="Weekdays" title="Spend by day">
            <div className="min-w-0 overflow-x-hidden">
              <BarChart
                data={model.charts.dayOfWeek.map((point) => ({
                  key: point.key,
                  label: point.label,
                  value: point.value,
                }))}
                series={[{ id: "value", label: "Spend", color: "#111827" }]}
              />
            </div>
          </DashboardSurface>

          <DashboardSurface eyebrow="Cadence" title="Expense cadence" tone="warm">
            <div className="grid min-w-0 gap-5">
              <MiniTrendBlock label="Daily frequency" valueLabel="Expenses">
                <div className="min-w-0 overflow-x-hidden">
                  <VisxLineChart
                    data={model.charts.frequency}
                    valueLabel="Expenses"
                    valueFormatter={(value) => `${value}`}
                    color="#111827"
                    integerAxis
                    height={220}
                  />
                </div>
              </MiniTrendBlock>
              <MiniTrendBlock label="Weekly velocity" valueLabel="Expenses per week">
                <div className="min-w-0 overflow-x-hidden">
                  <VisxLineChart
                    data={model.charts.velocity}
                    valueLabel="Expenses per week"
                    valueFormatter={(value) => `${value}`}
                    color="#c47f2a"
                    integerAxis
                    height={220}
                  />
                </div>
              </MiniTrendBlock>
            </div>
          </DashboardSurface>
        </div>
      </div>

      <DashboardSurface eyebrow="Distribution" title="Expense size distribution">
        <div className="min-w-0 overflow-x-hidden">
          <Histogram data={model.charts.expenseSizeDistribution} valueLabel="Expenses" />
        </div>
      </DashboardSurface>
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
      <DashboardSurface eyebrow="Largest entries" title="Top expenses">
        <TopExpensesList rows={model.details.topExpenses} />
      </DashboardSurface>

      <DashboardSurface eyebrow="Category context" title="Category deep dive" tone="warm">
        <CategoryDeepDiveList
          rows={model.details.categoryRows}
          getCategoryIconFromName={getCategoryIconFromName}
        />
      </DashboardSurface>
    </div>
  );
}

function DashboardSection({
  id,
  label,
  title,
  icon,
  children,
}: {
  id: AnalyticsSectionId;
  label: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="min-w-0 space-y-4">
      <InsightsSectionHeader
        label={label}
        title={title}
        icon={
          (({ className }: { className?: string }) => (
            <span className={cn("inline-flex", className)}>{icon}</span>
          )) as React.ComponentType<{ className?: string }>
        }
      />
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function DashboardSurface({
  eyebrow,
  title,
  actions,
  children,
  className,
  tone = "white",
  variant = "supporting",
}: {
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: AnalyticsPanelTone;
  variant?: AnalyticsSurfaceVariant;
}) {
  return (
    <InsightsSurface
      eyebrow={eyebrow}
      title={title}
      headerAside={actions}
      tone={tone === "warm" ? "muted" : "default"}
      className={cn(
        "prevent-horizontal-scroll h-full",
        variant === "featured" && "sm:[&_h3]:text-xl",
        variant === "compact" && "sm:[&_h3]:text-base",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full min-w-0 flex-col",
          variant === "featured" ? "gap-5" : "gap-4",
          variant === "compact" && "gap-3",
        )}
      >
        {children}
      </div>
    </InsightsSurface>
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

function CompactMetricSurface({
  eyebrow,
  title,
  value,
  detail,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <DashboardSurface eyebrow={eyebrow} title={title} variant="compact" className="h-full">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-2xl font-semibold tracking-tight text-foreground">{value}</div>
          <div className="mt-2 text-sm text-muted-foreground">{detail}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/40">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </DashboardSurface>
  );
}

function HighlightSurface({
  eyebrow,
  title,
  value,
  detail,
  icon: Icon,
  className,
}: {
  eyebrow: string;
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <DashboardSurface eyebrow={eyebrow} title={title} className={className}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/35">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </DashboardSurface>
  );
}

function TrustChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "neutral" | "good" | "warn";
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-4 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/35 text-foreground",
          tone === "good" && "bg-[rgba(245,242,239,0.8)]",
          tone === "warn" && "bg-secondary/60",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function SettlementPositionPanel({ model }: { model: AnalyticsViewModel }) {
  const positiveRows = [...model.details.participantRows].filter((row) => row.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance);
  const negativeRows = [...model.details.participantRows].filter((row) => row.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance);
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
          <div key={row.personId} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/35 px-4 py-3 text-sm">
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
    <div className={cn("rounded-lg p-4", subdued ? "bg-background shadow-sm" : "bg-secondary/35")}>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
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
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 truncate text-lg font-semibold text-foreground">{name}</p>
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
              "rounded-lg border p-4",
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
          <div key={row.name} className="rounded-lg border bg-background p-4 shadow-sm">
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
              <div
                className="h-full rounded-full bg-black/85"
                style={{ width: `${Math.max(6, Math.min(100, row.share))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MiniTrendBlock({
  label,
  valueLabel,
  children,
}: {
  label: string;
  valueLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{valueLabel}</p>
      </div>
      <div className="mt-4 min-w-0">{children}</div>
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
          <div key={category.name} className="rounded-lg border bg-background p-4 shadow-sm">
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
    <div className="rounded-md bg-secondary/40 px-3 py-2">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <InsightsEmptyPanel message={message} />;
}

function AnalyticsEmptyState() {
  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto">
      <InsightsLayout className="max-w-3xl">
        <InsightsEmptyState
          icon={BarChart4}
          title="Analytics"
          message="Add expenses to unlock the dashboard."
        />
      </InsightsLayout>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="h-full w-full overflow-x-hidden overflow-y-auto">
      <InsightsLayout className="max-w-7xl">
        <div className="rounded-lg border bg-card p-4 shadow-lg sm:p-6">
          <Skeleton className="h-8 w-28 rounded-full" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-full" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Skeleton className="h-[280px] rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[132px] rounded-lg" />
            <Skeleton className="h-[132px] rounded-lg" />
            <Skeleton className="h-[148px] rounded-lg md:col-span-2" />
            <Skeleton className="h-[148px] rounded-lg md:col-span-2" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-[360px] rounded-lg" />
          <Skeleton className="h-[360px] rounded-lg" />
        </div>
      </InsightsLayout>
    </div>
  );
}

function signedCurrency(value: number) {
  if (Math.abs(value) < 0.01) return formatAnalyticsCurrency(0);
  return value > 0 ? `+${formatAnalyticsCurrency(value)}` : formatAnalyticsCurrency(value);
}
