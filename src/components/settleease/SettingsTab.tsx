"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTheme } from "next-themes";
import {
  Activity,
  AlertTriangle,
  Brain,
  Brush,
  ChartColumn,
  ExternalLink,
  FileDown,
  HandCoins,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  Unlock,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useUsageAnalytics } from "@/hooks/useUsageAnalytics";
import { applyFontPreference } from "@/hooks/useFontSync";
import { cn } from "@/lib/utils";
import type {
  ActiveView,
  Category,
  Expense,
  FontPreference,
  ManualSettlementOverride,
  Person,
  SettlementPayment,
  UserProfile,
  UserRole,
} from "@/lib/settleease";
import {
  DEVELOPMENT_CONVEX_HOST,
  getClientSettleEaseEnvironment,
  getExpectedConvexHost,
  type SettleEaseEnvironment,
} from "@/lib/settleease/developmentAuth";
import { getConvexUrl } from "@/lib/settleease/convexUrl";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL_CODE,
  getAiModelOption,
  type AiModelCode,
} from "@/lib/settleease/aiModels";
import {
  analyzeModelHeuristically,
  type DynamicModelMetadata,
  type ModelUIProps,
  type ModelGroup,
} from "@/lib/settleease/aiModelMetadata";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Check,
  FlaskConical,
  Package,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  LoadingRegion,
  SkeletonCardHeader,
  SkeletonMetricTile,
  SkeletonPanel,
  SkeletonToolbar,
} from "./SkeletonLayouts";
import ShortcutHint from "./ShortcutHint";
import AppEmptyState from "./AppEmptyState";
import {
  SettleEaseAlertDialog,
  SettleEaseModalBody,
  SettleEaseModalFooter,
  SettleEaseModalHeader,
  SettleEaseModalSection,
} from "./SettleEaseDialog";
import IconPickerModal from "./IconPickerModal";
import AnnouncementModal from "./AnnouncementModal";
import type { Announcement } from "@/lib/settleease";
import * as LucideIcons from "lucide-react";

type AdminSettingsSnapshot = {
  environment: {
    environment: SettleEaseEnvironment;
    environmentSource: "explicit" | "inferred";
    configuredEnvironment: string | null;
    authMode: "disabled" | "supabase-jwt";
    authDisabled: boolean;
    requiresDangerZoneUnlock: boolean;
    destructiveActionsEnabled: boolean;
    destructiveActionsReason: string;
    expectedConvexHost: string;
    deploymentLabel: string;
  };
  counts: {
    people: number;
    categories: number;
    expenses: number;
    settlementPayments: number;
    manualOverrides: number;
    activeManualOverrides: number;
    budgetItems: number;
    budgetDrafts: number;
    userProfiles: number;
    reportGenerationEvents: number;
    appUsageEvents: number;
    usageDailyRollups: number;
    usageDailyTouches: number;
    aiSummaries: number;
    aiRedactions: number;
    aiPrompts: number;
  };
  aiConfig: {
    id?: string;
    key: string;
    modelCode: AiModelCode;
    fallbackModelCodes: AiModelCode[];
    updatedAt: string | null;
    updatedByUserId: string | null;
  };
  checkedAt: string;
};

type UsageAnalyticsPreset = "24h" | "7d" | "30d" | "90d";

type UsageAnalytics = {
  datePreset: UsageAnalyticsPreset;
  filters: {
    surface: string;
    status: string;
    role: string;
    eventGroup: string;
  };
  range: {
    startDateKey: string;
    endDateKey: string;
  };
  cards: {
    activeUsers: number;
    sessions: number;
    totalEvents: number;
    failureRate: number;
    topSurface: string;
    expenseSaves: number;
    scanSuccessRate: number;
    settlementActions: number;
    reportDownloads: number;
    aiCacheRate: number;
    aiFallbackFailureRate: number;
  };
  totals: {
    success: number;
    failure: number;
    cancelled: number;
    info: number;
  };
  activityByDate: Array<{ dateKey: string; count: number }>;
  featureAdoption: Array<{ key: string; count: number }>;
  eventGroups: Array<{ key: string; count: number }>;
  statuses: Array<{ key: string; count: number }>;
  topActions: Array<{ key: string; count: number }>;
  workflowFunnel: Array<{ key: string; count: number }>;
  aiReportHealth: Array<{ key: string; count: number }>;
};

type AdminUserProfile = {
  id: string;
  user_id: string;
  email: string | null;
  role: "admin" | "user";
  first_name: string | null;
  last_name: string | null;
  windows_experience_enabled: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
};

interface SettingsTabProps {
  onNavigate: (view: ActiveView) => void;
  onEditProfileName: () => void;
  onUpdateUserProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  people: Person[];
  expenses: Expense[];
  categories: Category[];
  settlementPayments: SettlementPayment[];
  manualOverrides: ManualSettlementOverride[];
  currentUserId?: string;
  currentUserEmail?: string | null;
  displayName: string;
  userRole: UserRole;
  userProfile: UserProfile | null;
  isDevelopmentEnvironment: boolean;
}

type DangerAction = {
  id: string;
  title: string;
  description: string;
  phrase: string;
  buttonLabel: string;
  targetSummary: Array<{ label: string; value: number | string }>;
  run: (confirmation: string) => Promise<void>;
};

type BudgetBackfillResult = {
  dryRun: boolean;
  expenseCount: number;
  itemObservationCount: number;
  validObservationCount: number;
  skippedObservationCount: number;
  mergedCatalogRowCount: number;
  rowsToInsert: number;
  rowsToUpdate: number;
};

const FONT_OPTIONS: Array<{ value: FontPreference; label: string }> = [
  { value: "google-sans", label: "Google Sans Flex" },
  { value: "inter", label: "Inter" },
];

const PRODUCTION_DANGER_UNLOCK_CONFIRMATION = "UNLOCK PRODUCTION DANGER ZONE";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const LANDING_VIEW_OPTIONS: Array<{ value: ActiveView; label: string }> = [
  { value: "dashboard", label: "Home" },
  { value: "analytics", label: "Analytics" },
  { value: "health", label: "Health" },
  { value: "addExpense", label: "Add Expense" },
  { value: "editExpenses", label: "Edit Expenses" },
  { value: "manageSettlements", label: "Settlements" },
  { value: "managePeople", label: "People" },
  { value: "manageCategories", label: "Categories" },
  { value: "settings", label: "Settings" },
];

const USAGE_SURFACE_FILTERS = [
  "app",
  "dashboard",
  "analytics",
  "health",
  "addExpense",
  "editExpenses",
  "managePeople",
  "manageCategories",
  "manageSettlements",
  "exportExpense",
  "scanReceipt",
  "settings",
];

const USAGE_EVENT_GROUP_FILTERS = [
  "session",
  "navigation",
  "expenses",
  "people",
  "categories",
  "settlements",
  "scan",
  "summary",
  "health",
  "budget",
  "report",
  "analytics",
  "settings",
  "errors",
];

function getHostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function formatNumber(value: number | undefined | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function formatPercent(value: number | undefined | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function formatUsageLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

function getAdminProfileDisplayName(profile: AdminUserProfile) {
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return fullName || profile.email || profile.user_id;
}

function buildDangerPhrase(
  environment: SettleEaseEnvironment,
  action:
    | "clearReportLogs"
    | "clearUsageAnalytics"
    | "clearAiCaches"
    | "clearActiveOverrides"
    | "clearSettlementRecords"
    | "resetOperational"
    | "factoryReset",
) {
  const name = environment === "development" ? "DEVELOPMENT" : "PRODUCTION";

  switch (action) {
    case "clearReportLogs":
      return `CLEAR ${name} REPORT LOGS`;
    case "clearUsageAnalytics":
      return `CLEAR ${name} USAGE ANALYTICS`;
    case "clearAiCaches":
      return `CLEAR ${name} AI CACHES`;
    case "clearActiveOverrides":
      return `CLEAR ${name} ACTIVE OVERRIDES`;
    case "clearSettlementRecords":
      return `CLEAR ${name} SETTLEMENT RECORDS`;
    case "resetOperational":
      return `RESET ${name} DATA`;
    case "factoryReset":
      return `FACTORY RESET ${name}`;
  }
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-background p-4", className)}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary/60 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-6 text-foreground">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <p className="mt-3 truncate text-2xl font-semibold text-foreground">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {description ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function UsageList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; count: number }>;
}) {
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="min-w-0 rounded-lg border bg-card/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="secondary">{formatNumber(rows.reduce((sum, row) => sum + row.count, 0))}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {rows.length > 0 ? rows.slice(0, 8).map((row) => (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">{formatUsageLabel(row.key)}</span>
              <span className="shrink-0 font-medium">{formatNumber(row.count)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (row.count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No aggregate data for this filter.</p>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  title,
  description,
  children,
  destructive,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h4 className={cn("text-sm font-semibold", destructive && "text-destructive")}>
          {title}
        </h4>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  );
}

function EnvironmentBadge({
  environmentSafe,
  clientEnvironment,
  snapshot,
}: {
  environmentSafe: boolean;
  clientEnvironment: SettleEaseEnvironment;
  snapshot?: AdminSettingsSnapshot;
}) {
  if (!snapshot) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking environment
      </Badge>
    );
  }

  if (!environmentSafe) {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        ENVIRONMENT MISMATCH
      </Badge>
    );
  }

  const isDev = clientEnvironment === "development";
  return (
    <Badge
      variant={isDev ? "outline" : "default"}
      className={cn(
        "gap-1.5",
        isDev && "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
      )}
    >
      {isDev ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {isDev ? "DEVELOPMENT DATABASE" : "PRODUCTION DATABASE"}
    </Badge>
  );
}

function DangerActionDialog({
  action,
  open,
  working,
  onOpenChange,
}: {
  action: DangerAction | null;
  open: boolean;
  working: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!open) setConfirmation("");
  }, [open]);

  const canConfirm = !!action && confirmation === action.phrase && !working;

  if (!action) return null;

  return (
    <SettleEaseAlertDialog open={open} onOpenChange={onOpenChange}>
      <SettleEaseModalHeader
        kind="alert"
        icon={AlertTriangle}
        tone="danger"
        title={action.title}
        description={action.description}
      />
      <SettleEaseModalBody className="space-y-4">
        <SettleEaseModalSection className="grid gap-2 border-destructive/25 bg-destructive/5">
          {action.targetSummary.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </SettleEaseModalSection>

        <div className="space-y-2">
          <Label htmlFor="danger-confirmation">Confirmation phrase</Label>
          <div className="rounded-xl border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
            {action.phrase}
          </div>
          <Input
            id="danger-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={action.phrase}
            autoComplete="off"
            className="rounded-full"
          />
        </div>
      </SettleEaseModalBody>

      <SettleEaseModalFooter className="sm:justify-end">
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" className="h-10 rounded-full" disabled={working} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-10 rounded-full"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              void action.run(confirmation);
            }}
          >
            {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {action.buttonLabel}
          </Button>
        </div>
      </SettleEaseModalFooter>
    </SettleEaseAlertDialog>
  );
}

function ProductionDangerUnlockDialog({
  open,
  onOpenChange,
  onUnlock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: () => void;
}) {
  const [confirmation, setConfirmation] = useState("");
  const [understandsProduction, setUnderstandsProduction] = useState(false);
  const [understandsIrreversible, setUnderstandsIrreversible] = useState(false);
  const [understandsNoCrossEnv, setUnderstandsNoCrossEnv] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmation("");
      setUnderstandsProduction(false);
      setUnderstandsIrreversible(false);
      setUnderstandsNoCrossEnv(false);
    }
  }, [open]);

  const canUnlock =
    confirmation === PRODUCTION_DANGER_UNLOCK_CONFIRMATION &&
    understandsProduction &&
    understandsIrreversible &&
    understandsNoCrossEnv;

  return (
    <SettleEaseAlertDialog open={open} onOpenChange={onOpenChange}>
      <SettleEaseModalHeader
        kind="alert"
        icon={ShieldAlert}
        tone="danger"
        title="Unlock Production Danger Zone"
        description="This unlocks production-only destructive controls for this browser session. Each destructive action will still require its own exact confirmation phrase."
      />

      <SettleEaseModalBody className="space-y-4">
          <SettleEaseModalSection className="space-y-3 border-destructive/25 bg-destructive/5">
            <label className="flex items-start gap-3 text-sm leading-6">
              <Checkbox
                checked={understandsProduction}
                onCheckedChange={(value) => setUnderstandsProduction(value === true)}
              />
              <span>I understand this targets the live production database.</span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-6">
              <Checkbox
                checked={understandsIrreversible}
                onCheckedChange={(value) => setUnderstandsIrreversible(value === true)}
              />
              <span>I understand destructive actions can permanently delete production data.</span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-6">
              <Checkbox
                checked={understandsNoCrossEnv}
                onCheckedChange={(value) => setUnderstandsNoCrossEnv(value === true)}
              />
              <span>I have confirmed I am not trying to manage the development database from production.</span>
            </label>
          </SettleEaseModalSection>

          <div className="space-y-2">
            <Label htmlFor="production-danger-unlock">Unlock phrase</Label>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
              {PRODUCTION_DANGER_UNLOCK_CONFIRMATION}
            </div>
            <Input
              id="production-danger-unlock"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={PRODUCTION_DANGER_UNLOCK_CONFIRMATION}
              autoComplete="off"
              className="rounded-full"
            />
          </div>
      </SettleEaseModalBody>

        <SettleEaseModalFooter className="sm:justify-end">
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" className="h-10 rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-10 rounded-full"
            disabled={!canUnlock}
            onClick={() => {
              if (!canUnlock) return;
              onUnlock();
              onOpenChange(false);
            }}
          >
            <Unlock className="mr-2 h-4 w-4" />
            Unlock Production Danger Zone
          </Button>
          </div>
        </SettleEaseModalFooter>
    </SettleEaseAlertDialog>
  );
}

interface ModelSelectorProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ModelUIProps[];
  disabled?: boolean;
  allowNone?: boolean;
  probeStatus?: {
    loading: boolean;
    success?: boolean;
    error?: string | null;
    features?: {
      textGeneration: boolean;
      structuredOutput: boolean;
    };
    latencyMs?: number;
  };
}

export function ModelSelector({
  id,
  value,
  onValueChange,
  options,
  disabled = false,
  allowNone = false,
  probeStatus,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const resolvedModel = useMemo(() => {
    if (value === "none") return null;
    const found = options.find((opt) => opt.code === value);
    return found || analyzeModelHeuristically({ code: value });
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (opt) =>
        opt.displayName.toLowerCase().includes(query) ||
        opt.code.toLowerCase().includes(query) ||
        opt.description.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<ModelGroup, ModelUIProps[]> = {
      stable: [],
      previews: [],
      snapshots: [],
      legacy: [],
    };
    filteredOptions.forEach((opt) => {
      groups[opt.group].push(opt);
    });
    return groups;
  }, [filteredOptions]);

  const activeStatusColor = resolvedModel
    ? resolvedModel.statusLightColor
    : "bg-muted-foreground";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="flex h-11 w-full items-center justify-between rounded-full border-border/80 bg-background px-4 text-left shadow-sm hover:bg-accent/40 focus:ring-2 focus:ring-ring"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {value === "none" ? (
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            ) : (
              <span className={cn("h-2 w-2 shrink-0 rounded-full", activeStatusColor)} />
            )}
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-sm font-medium">
                {value === "none" ? "None (Disabled)" : resolvedModel?.displayName}
              </span>
              {resolvedModel && (
                <span className="hidden truncate text-[10px] text-muted-foreground sm:inline-block">
                  ({resolvedModel.formattedInputLimit})
                </span>
              )}
            </div>
            {/* Probe Status Indicator */}
            {probeStatus && value !== "none" && (
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {probeStatus.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : probeStatus.features?.structuredOutput ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/60">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                    <ShieldAlert className="h-3 w-3 text-rose-500" />
                    Failed
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 w-[340px] p-0 shadow-xl sm:w-[420px] rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md"
      >
        <div className="flex items-center border-b px-3 py-2.5 bg-muted/20">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            placeholder="Search models, capacity, or version..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <ScrollArea className="h-[360px] overflow-y-auto p-2">
          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onValueChange("none");
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent/60",
                value === "none" && "bg-accent/60"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="font-semibold text-foreground">None</span>
              </div>
              {value === "none" && <Check className="h-4 w-4 text-primary" />}
            </button>
          )}

          {Object.entries(grouped).map(([groupKey, groupItems]) => {
            if (groupItems.length === 0) return null;

            const group = groupKey as ModelGroup;
            let groupIcon = Sparkles;
            let groupLabel = "Recommended & Stable";

            if (group === "previews") {
              groupIcon = FlaskConical;
              groupLabel = "Previews & Pre-Releases";
            } else if (group === "snapshots") {
              groupIcon = Package;
              groupLabel = "Frozen Snapshots";
            } else if (group === "legacy") {
              groupIcon = AlertTriangle;
              groupLabel = "Outdated & Legacy";
            }

            const IconComponent = groupIcon;

            return (
              <div key={groupKey} className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <IconComponent className="h-3 w-3" />
                  <span>{groupLabel}</span>
                </div>
                <div className="space-y-1">
                  {groupItems.map((opt) => {
                    const isSelected = value === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => {
                          onValueChange(opt.code);
                          setOpen(false);
                        }}
                        className={cn(
                          "group flex w-full flex-col gap-1 rounded-lg border border-transparent px-3 py-2.5 text-left transition-all hover:bg-accent/40",
                          isSelected && "bg-accent/60 border-border/60"
                        )}
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", opt.statusLightColor)} />
                            <span className="truncate text-xs font-semibold text-foreground">
                              {opt.displayName}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-semibold border",
                                opt.suitabilityColor
                              )}
                            >
                              {opt.suitability}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        </div>
                        <div className="pl-4 space-y-0.5">
                          <p className="text-[10px] text-muted-foreground leading-normal line-clamp-2">
                            {opt.description}
                          </p>
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground/80 font-medium">
                            <span className="inline-flex items-center gap-1">
                              <Activity className="h-2.5 w-2.5" />
                              <span>{opt.formattedInputLimit}</span>
                            </span>
                            <span>•</span>
                            <span>{opt.formattedOutputLimit}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function SettingsTabSkeleton() {
  return (
    <LoadingRegion label="Loading settings" className="flex h-full min-h-0">
      <Card className="flex h-full min-h-0 w-full flex-col rounded-lg shadow-lg">
        <SkeletonCardHeader
          titleWidth="w-44"
          descriptionWidth="w-full max-w-lg"
          actions={["w-36", "w-28"]}
        />
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <Skeleton className="h-10 w-full rounded-lg sm:w-[520px]" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonMetricTile />
            <SkeletonMetricTile />
            <SkeletonMetricTile />
            <SkeletonMetricTile />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <SkeletonPanel>
              <SkeletonToolbar count={3} />
            </SkeletonPanel>
            <SkeletonPanel>
              <SkeletonToolbar count={3} />
            </SkeletonPanel>
          </div>
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}

export default function SettingsTab({
  onNavigate,
  onEditProfileName,
  onUpdateUserProfile,
  people,
  expenses,
  categories,
  settlementPayments,
  manualOverrides,
  currentUserId,
  currentUserEmail,
  displayName,
  userRole,
  userProfile,
  isDevelopmentEnvironment,
}: SettingsTabProps) {
  const { theme, setTheme } = useTheme();
  const usageAnalytics = useUsageAnalytics({ surface: "settings" });
  const snapshot = useQuery(api.app.getAdminSettingsSnapshot, {}) as
    | AdminSettingsSnapshot
    | undefined;
  const adminProfiles = useQuery(api.app.listUserProfilesForAdmin, {}) as
    | AdminUserProfile[]
    | undefined;

  const ensureDefaultPeople = useMutation(api.app.ensureDefaultPeople);
  const seedDefaultCategories = useMutation(api.app.seedDefaultCategories);
  const updateAiConfig = useMutation(api.app.updateAiConfig);
  const setUserWindowsExperience = useMutation(api.app.setUserWindowsExperience);
  const backfillBudgetItemsFromExpenses = useMutation(api.app.backfillBudgetItemsFromExpenses);
  const clearAppUsageAnalytics = useMutation(api.app.clearAppUsageAnalytics);
  const clearAiCaches = useMutation(api.app.clearAiCaches);
  const clearSettlementRecords = useMutation(api.app.clearSettlementRecords);
  const resetSettleEaseData = useMutation(api.app.resetSettleEaseData);

  // Announcement System Convex Hooks
  const allAnnouncements = useQuery(api.app.listAllAnnouncementsForAdmin, {}) as Announcement[] | undefined;
  const createAnnouncement = useMutation(api.app.createAnnouncement);
  const updateAnnouncementMutation = useMutation(api.app.updateAnnouncement);
  const toggleAnnouncementActive = useMutation(api.app.toggleAnnouncementActive);
  const deleteAnnouncement = useMutation(api.app.deleteAnnouncement);
  const listAvailableModels = useAction(api.healthActions.listAvailableModels);
  const probeModelCapability = useAction(api.healthActions.probeModelCapability);
  const runAiDiagnostics = useAction(api.healthActions.runAiDiagnostics);
  const capabilities = useQuery(api.app.listAiModelCapabilities);

  const clientEnvironment = getClientSettleEaseEnvironment();
  const configuredConvexUrl = getConvexUrl();
  const configuredConvexHost = getHostFromUrl(configuredConvexUrl);
  const expectedConvexHost = getExpectedConvexHost(clientEnvironment);

  const [selectedTheme, setSelectedTheme] = useState(
    theme || userProfile?.theme_preference || "light",
  );
  const [selectedFont, setSelectedFont] = useState<FontPreference>(
    userProfile?.font_preference || "google-sans",
  );
  const [defaultView, setDefaultView] = useState<ActiveView>(
    userProfile?.last_active_view || "dashboard",
  );
  const [selectedAiModel, setSelectedAiModel] = useState<AiModelCode>(
    DEFAULT_AI_MODEL_CODE,
  );
  const [fallbackOne, setFallbackOne] = useState<AiModelCode | "none">("none");
  const [fallbackTwo, setFallbackTwo] = useState<AiModelCode | "none">("none");
  const [dynamicModelOptions, setDynamicModelOptions] = useState<DynamicModelMetadata[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState<BudgetBackfillResult | null>(null);
  const [includeSummaries, setIncludeSummaries] = useState(true);
  const [includeRedactions, setIncludeRedactions] = useState(true);
  const [usageDatePreset, setUsageDatePreset] = useState<UsageAnalyticsPreset>("30d");
  const [usageSurface, setUsageSurface] = useState("all");
  const [usageStatus, setUsageStatus] = useState("all");
  const [usageRole, setUsageRole] = useState("all");
  const [usageEventGroup, setUsageEventGroup] = useState("all");
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [productionDangerUnlocked, setProductionDangerUnlocked] = useState(false);
  const [productionUnlockDialogOpen, setProductionUnlockDialogOpen] = useState(false);

  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsStep, setDiagnosticsStep] = useState(0);
  const [diagnosticsResult, setDiagnosticsResult] = useState<{
    success: boolean;
    promotedModel: string | null;
    fallbacks: string[];
    log: string[];
  } | null>(null);

  const handleRunDiagnostics = async () => {
    setDiagnosticsRunning(true);
    setDiagnosticsStep(1);
    setDiagnosticsResult(null);

    const t1 = setTimeout(() => setDiagnosticsStep(2), 700);
    const t2 = setTimeout(() => setDiagnosticsStep(3), 1400);
    const t3 = setTimeout(() => setDiagnosticsStep(4), 2100);
    const t4 = setTimeout(() => setDiagnosticsStep(5), 2800);

    try {
      const res = await runAiDiagnostics({});
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setDiagnosticsStep(5);
      setDiagnosticsResult(res);
      toast({
        title: "Diagnostics Completed",
        description: res.success ? `Successfully promoted ${res.promotedModel}` : "Failed to run diagnostics.",
      });
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setDiagnosticsStep(0);
      toast({
        title: "Diagnostics Failed",
        description: err?.message || "Failed to execute diagnostics.",
        variant: "destructive",
      });
    } finally {
      setDiagnosticsRunning(false);
    }
  };

  const handlePromoteModel = async (code: string) => {
    try {
      const otherVerified = capabilities
        ?.filter((c) => c.verified && c.modelCode !== code)
        .map((c) => c.modelCode) || [];
      const fallbacks = otherVerified.slice(0, 2);

      await updateAiConfig({
        expectedEnvironment: clientEnvironment,
        modelCode: code,
        fallbackModelCodes: fallbacks,
      });
      toast({
        title: "Model Promoted",
        description: `Successfully promoted ${code} to primary.`,
      });
    } catch (err: any) {
      toast({
        title: "Promotion Failed",
        description: err?.message || "Failed to update configuration.",
        variant: "destructive",
      });
    }
  };

  // Announcement composition form states
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementDescription, setAnnouncementDescription] = useState("");
  const [announcementTone, setAnnouncementTone] = useState<'default' | 'success' | 'warning' | 'danger' | 'brand'>("default");
  const [announcementIcon, setAnnouncementIcon] = useState("Megaphone");
  const [announcementFrequency, setAnnouncementFrequency] = useState<'once' | 'everytime'>("once");
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  
  // Icon Picker modal control
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  
  // Preview Modal control
  const [previewAnnouncement, setPreviewAnnouncement] = useState<Announcement | null>(null);
  
  // Loading state for announcement CRUD actions
  const [isAnnouncementActionLoading, setIsAnnouncementActionLoading] = useState(false);

  // Model Capability Probing States and Effects
  const [probeResults, setProbeResults] = useState<Record<string, {
    loading: boolean;
    success?: boolean;
    error?: string | null;
    features?: {
      textGeneration: boolean;
      structuredOutput: boolean;
    };
    latencyMs?: number;
  }>>({});

  const runCapabilityProbe = async (modelCode: string) => {
    if (!modelCode || modelCode === "none") return;
    setProbeResults((prev) => ({
      ...prev,
      [modelCode]: { loading: true },
    }));
    try {
      const res = await probeModelCapability({ modelCode });
      setProbeResults((prev) => ({
        ...prev,
        [modelCode]: {
          loading: false,
          success: res.success,
          error: res.error,
          features: res.features,
          latencyMs: res.latencyMs,
        },
      }));
    } catch (err: any) {
      setProbeResults((prev) => ({
        ...prev,
        [modelCode]: {
          loading: false,
          success: false,
          error: err?.message || "Failed to contact Convex action",
          features: { textGeneration: false, structuredOutput: false },
          latencyMs: 0,
        },
      }));
    }
  };

  useEffect(() => {
    if (userRole !== "admin") return;
    const modelsToProbe = [selectedAiModel, fallbackOne, fallbackTwo].filter(
      (m): m is string => !!m && m !== "none"
    );
    modelsToProbe.forEach((m) => {
      setProbeResults((prev) => {
        if (prev[m]) return prev;
        // Trigger the probe asynchronously
        void (async () => {
          try {
            const res = await probeModelCapability({ modelCode: m });
            setProbeResults((current) => ({
              ...current,
              [m]: {
                loading: false,
                success: res.success,
                error: res.error,
                features: res.features,
                latencyMs: res.latencyMs,
              },
            }));
          } catch (err: any) {
            setProbeResults((current) => ({
              ...current,
              [m]: {
                loading: false,
                success: false,
                error: err?.message || "Failed to contact Convex action",
                features: { textGeneration: false, structuredOutput: false },
                latencyMs: 0,
              },
            }));
          }
        })();
        return {
          ...prev,
          [m]: { loading: true },
        };
      });
    });
  }, [selectedAiModel, fallbackOne, fallbackTwo, userRole]);

  useEffect(() => {
    setSelectedTheme(theme || userProfile?.theme_preference || "light");
  }, [theme, userProfile?.theme_preference]);

  useEffect(() => {
    setSelectedFont(userProfile?.font_preference || "google-sans");
  }, [userProfile?.font_preference]);

  useEffect(() => {
    setDefaultView(userProfile?.last_active_view || "dashboard");
  }, [userProfile?.last_active_view]);

  useEffect(() => {
    if (!snapshot?.aiConfig) return;
    setSelectedAiModel(snapshot.aiConfig.modelCode || DEFAULT_AI_MODEL_CODE);
    setFallbackOne(snapshot.aiConfig.fallbackModelCodes?.[0] || "none");
    setFallbackTwo(snapshot.aiConfig.fallbackModelCodes?.[1] || "none");
  }, [snapshot?.aiConfig]);

  useEffect(() => {
    let active = true;
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const fetched = await listAvailableModels();
        if (active) {
          setDynamicModelOptions(fetched);
        }
      } catch (error) {
        console.error("Failed to fetch available Gemini models:", error);
      } finally {
        if (active) {
          setIsLoadingModels(false);
        }
      }
    };
    if (userRole === "admin") {
      void fetchModels();
    }
    return () => {
      active = false;
    };
  }, [listAvailableModels, userRole]);

  const modelOptions = useMemo<ModelUIProps[]>(() => {
    const optionsMap = new Map<string, ModelUIProps>();
    
    // Process local static fallback options
    AI_MODEL_OPTIONS.forEach((opt) => {
      optionsMap.set(opt.code, analyzeModelHeuristically({
        code: opt.code,
        displayName: opt.displayName,
        description: opt.recommendedFor,
        inputTokenLimit: 1048576,
        outputTokenLimit: 8192
      }));
    });

    // Process dynamically discovered models with live descriptions and token limits
    dynamicModelOptions.forEach((opt) => {
      optionsMap.set(opt.code, analyzeModelHeuristically(opt));
    });
    
    // Ensure selected models are not omitted
    if (selectedAiModel && !optionsMap.has(selectedAiModel)) {
      optionsMap.set(selectedAiModel, analyzeModelHeuristically({ code: selectedAiModel }));
    }
    if (fallbackOne && fallbackOne !== "none" && !optionsMap.has(fallbackOne)) {
      optionsMap.set(fallbackOne, analyzeModelHeuristically({ code: fallbackOne }));
    }
    if (fallbackTwo && fallbackTwo !== "none" && !optionsMap.has(fallbackTwo)) {
      optionsMap.set(fallbackTwo, analyzeModelHeuristically({ code: fallbackTwo }));
    }

    return Array.from(optionsMap.values()).sort((a, b) => {
      // 1. Sort by suitability grade (Excellent > Good > Caution > Unsuitable)
      const rank = { Excellent: 4, Good: 3, Caution: 2, Unsuitable: 1 };
      const aRank = rank[a.suitability] || 0;
      const bRank = rank[b.suitability] || 0;
      if (bRank !== aRank) {
        return bRank - aRank;
      }
      
      // 2. Sort by version descending
      const aVerMatch = a.code.match(/(\d+(?:\.\d+)?)/);
      const bVerMatch = b.code.match(/(\d+(?:\.\d+)?)/);
      const aVer = aVerMatch ? parseFloat(aVerMatch[1]) : 0;
      const bVer = bVerMatch ? parseFloat(bVerMatch[1]) : 0;
      if (bVer !== aVer) {
        return bVer - aVer;
      }
      return a.displayName.localeCompare(b.displayName);
    });
  }, [dynamicModelOptions, selectedAiModel, fallbackOne, fallbackTwo]);

  const appUsageAnalytics = useQuery(api.app.getAppUsageAnalytics, {
    datePreset: usageDatePreset,
    surface: usageSurface,
    status: usageStatus,
    role: usageRole,
    eventGroup: usageEventGroup,
  }) as UsageAnalytics | undefined;

  const fallbackCounts = useMemo(() => {
    const activeManualOverrides = manualOverrides.filter((override) => override.is_active).length;
    return {
      people: people.length,
      categories: categories.length,
      expenses: expenses.length,
      settlementPayments: settlementPayments.length,
      manualOverrides: manualOverrides.length,
      activeManualOverrides,
      budgetItems: 0,
      budgetDrafts: 0,
      userProfiles: userRole ? 1 : 0,
      reportGenerationEvents: 0,
      appUsageEvents: 0,
      usageDailyRollups: 0,
      usageDailyTouches: 0,
      aiSummaries: 0,
      aiRedactions: 0,
      aiPrompts: 0,
    };
  }, [categories.length, expenses.length, manualOverrides, people.length, settlementPayments.length, userRole]);

  const counts = snapshot?.counts || fallbackCounts;
  const serverEnvironment = snapshot?.environment.environment;
  const hostMatches = configuredConvexHost === expectedConvexHost;
  const serverMatches = !!snapshot && serverEnvironment === clientEnvironment;
  const devAuthMatches =
    clientEnvironment !== "development" || snapshot?.environment.authDisabled === true;
  const environmentSafe = !!snapshot && hostMatches && serverMatches && devAuthMatches;
  const canMutate = environmentSafe && !workingAction;
  const productionDangerRequiresUnlock =
    clientEnvironment === "production" &&
    snapshot?.environment.requiresDangerZoneUnlock === true;
  const dangerServerAvailable =
    canMutate && !!snapshot?.environment.destructiveActionsEnabled;
  const dangerAllowed =
    dangerServerAvailable &&
    (!productionDangerRequiresUnlock || productionDangerUnlocked);
  const dangerControlDisabled = !dangerServerAvailable;
  const dangerZoneUnlockConfirmation =
    clientEnvironment === "production" && productionDangerUnlocked
      ? PRODUCTION_DANGER_UNLOCK_CONFIRMATION
      : undefined;

  const buildDangerMutationArgs = (confirmation: string) => ({
    expectedEnvironment: clientEnvironment,
    confirmation,
    ...(dangerZoneUnlockConfirmation ? { dangerZoneUnlockConfirmation } : {}),
  });

  useEffect(() => {
    if (clientEnvironment !== "production" || !environmentSafe) {
      setProductionDangerUnlocked(false);
    }
  }, [clientEnvironment, environmentSafe]);

  const mismatchReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!hostMatches) {
      reasons.push(
        `Client Convex host is ${configuredConvexHost || "unknown"}, expected ${expectedConvexHost}.`,
      );
    }
    if (snapshot && !serverMatches) {
      reasons.push(
        `Convex server reports ${serverEnvironment}, while the client is ${clientEnvironment}.`,
      );
    }
    if (clientEnvironment === "development" && snapshot && !snapshot.environment.authDisabled) {
      reasons.push("Development danger controls require SETTLEEASE_DISABLE_AUTH=true on Convex.");
    }
    return reasons;
  }, [
    clientEnvironment,
    configuredConvexHost,
    expectedConvexHost,
    hostMatches,
    serverEnvironment,
    serverMatches,
    snapshot,
  ]);

  const runAction = async (
    id: string,
    title: string,
    action: () => Promise<unknown>,
    successDescription: string,
  ) => {
    if (workingAction) return;
    setWorkingAction(id);
    try {
      await action();
      toast({ title, description: successDescription });
    } catch (error: any) {
      toast({
        title: `${title} failed`,
        description: error?.message || "The admin action could not be completed.",
        variant: "destructive",
      });
    } finally {
      setWorkingAction(null);
    }
  };

  const updateProfileSetting = async (updates: Partial<UserProfile>) => {
    const success = await onUpdateUserProfile(updates);
    if (!success) {
      throw new Error("Profile update was rejected.");
    }
    usageAnalytics.track({
      eventName: "settings.preference_saved",
      surface: "settings",
      metadata: {
        feature: Object.keys(updates)[0] || "profile",
      },
    });
  };

  // Announcement System CRUD & Preview Handlers
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and description are required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsAnnouncementActionLoading(true);
    try {
      if (editingAnnouncementId) {
        const currentAnn = allAnnouncements?.find((a: any) => a.id === editingAnnouncementId);
        await updateAnnouncementMutation({
          id: editingAnnouncementId,
          title: announcementTitle.trim(),
          description: announcementDescription.trim(),
          tone: announcementTone,
          iconName: announcementIcon,
          displayFrequency: announcementFrequency,
          isActive: currentAnn?.is_active ?? true,
        });
        toast({
          title: "Announcement Updated",
          description: "The global announcement has been updated successfully.",
        });
      } else {
        await createAnnouncement({
          title: announcementTitle.trim(),
          description: announcementDescription.trim(),
          tone: announcementTone,
          iconName: announcementIcon,
          displayFrequency: announcementFrequency,
          isActive: true,
        });
        toast({
          title: "Announcement Created",
          description: "The global announcement has been created successfully.",
        });
      }
      
      // Reset form
      setAnnouncementTitle("");
      setAnnouncementDescription("");
      setAnnouncementTone("default");
      setAnnouncementIcon("Megaphone");
      setAnnouncementFrequency("once");
      setEditingAnnouncementId(null);
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error?.message || "Failed to save the announcement.",
        variant: "destructive",
      });
    } finally {
      setIsAnnouncementActionLoading(false);
    }
  };

  const handleEditAnnouncement = (ann: Announcement) => {
    setAnnouncementTitle(ann.title);
    setAnnouncementDescription(ann.description);
    setAnnouncementTone(ann.tone);
    setAnnouncementIcon(ann.icon_name);
    setAnnouncementFrequency(ann.display_frequency);
    setEditingAnnouncementId(ann.id);
  };

  const handleCancelEditAnnouncement = () => {
    setAnnouncementTitle("");
    setAnnouncementDescription("");
    setAnnouncementTone("default");
    setAnnouncementIcon("Megaphone");
    setAnnouncementFrequency("once");
    setEditingAnnouncementId(null);
  };

  const handleToggleAnnouncementActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleAnnouncementActive({ id, isActive: !currentStatus });
      toast({
        title: !currentStatus ? "Announcement Activated" : "Announcement Deactivated",
        description: `Announcement is now ${!currentStatus ? "active" : "inactive"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Toggle Failed",
        description: error?.message || "Failed to toggle announcement status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement({ id });
      toast({
        title: "Announcement Deleted",
        description: "The global announcement has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error?.message || "Failed to delete the announcement.",
        variant: "destructive",
      });
    }
  };

  const handlePreviewAnnouncementForm = () => {
    if (!announcementTitle.trim() || !announcementDescription.trim()) {
      toast({
        title: "Preview Error",
        description: "Please enter a title and description to preview.",
        variant: "destructive",
      });
      return;
    }
    
    // Construct transient Announcement object
    const transientAnn: Announcement = {
      id: "preview-temp-id",
      title: announcementTitle.trim(),
      description: announcementDescription.trim(),
      tone: announcementTone,
      icon_name: announcementIcon,
      display_frequency: announcementFrequency,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setPreviewAnnouncement(transientAnn);
  };

  const runDangerAction = async (
    id: string,
    title: string,
    action: (confirmation: string) => Promise<unknown>,
    successDescription: string,
    confirmation: string,
  ) => {
    setWorkingAction(id);
    try {
      await action(confirmation);
      toast({ title, description: successDescription });
      setDangerAction(null);
    } catch (error: any) {
      toast({
        title: `${title} failed`,
        description: error?.message || "The destructive action was blocked.",
        variant: "destructive",
      });
    } finally {
      setWorkingAction(null);
    }
  };

  const normalizedFallbacks = [fallbackOne, fallbackTwo].filter(
    (code, index, all): code is AiModelCode =>
      code !== "none" && code !== selectedAiModel && all.indexOf(code) === index,
  );

  const openDangerAction = (action: DangerAction) => {
    if (productionDangerRequiresUnlock && !productionDangerUnlocked) {
      setProductionUnlockDialogOpen(true);
      return;
    }
    if (!dangerAllowed) return;
    setDangerAction(action);
  };

  const dangerEnvironmentLabel =
    clientEnvironment === "development" ? "Development" : "Production";

  return (
    <Card className="flex h-full min-h-0 w-full flex-col rounded-lg shadow-lg">
      <CardHeader className="shrink-0 border-b px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <CardTitle className="flex min-w-0 items-center gap-2 text-2xl font-semibold sm:text-3xl">
                <Settings2 className="h-6 w-6 shrink-0" />
                <span className="truncate">Settings</span>
              </CardTitle>
              <EnvironmentBadge
                environmentSafe={environmentSafe}
                clientEnvironment={clientEnvironment}
                snapshot={snapshot}
              />
            </div>
            <CardDescription className="mt-2 text-sm leading-6">
              Admin controls, app preferences, environment status, and data maintenance.
            </CardDescription>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:min-w-[420px]">
            <div className="rounded-lg border bg-card/40 px-3 py-2">
              <span className="block font-medium text-foreground">Client target</span>
              <span className="block truncate">{configuredConvexHost || "Unknown"}</span>
            </div>
            <div className="rounded-lg border bg-card/40 px-3 py-2">
              <span className="block font-medium text-foreground">Server target</span>
              <span className="block truncate">
                {snapshot?.environment.deploymentLabel || "Checking"}
              </span>
            </div>
          </div>
        </div>

        {!environmentSafe && snapshot ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">Settings is read-only because the environment checks failed.</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-destructive/90">
                  {mismatchReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <Tabs defaultValue="overview" className="min-w-0 space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            {userRole === "admin" && <TabsTrigger value="ai">AI Config</TabsTrigger>}
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="appAnalytics">App Analytics</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="People" value={counts.people} description="Participants" icon={Users} />
              <MetricTile label="Expenses" value={counts.expenses} description="Expense records" icon={FileDown} />
              <MetricTile label="Settlements" value={counts.settlementPayments} description="Recorded payments" icon={HandCoins} />
              <MetricTile label="Usage Events" value={counts.appUsageEvents} description="Tracked app analytics" icon={ChartColumn} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SettingsSection
                icon={ShieldCheck}
                title="Admin Identity"
                description="Current operator and access state for this Settings session."
              >
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="truncate font-medium">{displayName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Email</span>
                    <span className="truncate font-medium">{currentUserEmail || "Development user"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Role</span>
                    <Badge variant={userRole === "admin" ? "default" : "outline"}>
                      {userRole || "Unknown"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">User ID</span>
                    <span className="truncate font-mono text-xs">{currentUserId || "Not available"}</span>
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                icon={Server}
                title="Environment Contract"
                description="Client and Convex must agree before mutations are enabled."
              >
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Client environment</span>
                    <span className="font-medium capitalize">{clientEnvironment}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Server environment</span>
                    <span className="font-medium capitalize">{snapshot?.environment.environment || "Checking"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Auth mode</span>
                    <span className="font-medium">{snapshot?.environment.authMode || "Checking"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Danger actions</span>
                    <Badge variant={dangerAllowed ? "destructive" : "outline"}>
                      {dangerAllowed
                        ? "Unlocked"
                        : productionDangerRequiresUnlock && dangerServerAvailable
                          ? "Unlock required"
                          : snapshot?.environment.destructiveActionsEnabled
                            ? "Available"
                            : "Locked"}
                    </Badge>
                  </div>
                </div>
              </SettingsSection>
            </div>

            <SettingsSection
              icon={ExternalLink}
              title="Admin Shortcuts"
              description="Jump to the operational areas that Settings supervises."
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button variant="outline" onClick={() => onNavigate("exportExpense")} className="justify-between gap-2">
                  <FileDown className="mr-2 h-4 w-4" />
                  <span className="mr-auto">Export</span>
                  <ShortcutHint shortcutId="action.exportExpense" />
                </Button>
                <Button variant="outline" onClick={() => onNavigate("managePeople")} className="justify-between gap-2">
                  <Users className="mr-2 h-4 w-4" />
                  <span className="mr-auto">People</span>
                  <ShortcutHint shortcutId="nav.managePeople" />
                </Button>
                <Button variant="outline" onClick={() => onNavigate("manageCategories")} className="justify-between gap-2">
                  <Tags className="mr-2 h-4 w-4" />
                  <span className="mr-auto">Categories</span>
                  <ShortcutHint shortcutId="nav.manageCategories" />
                </Button>
                <Button variant="outline" onClick={() => onNavigate("manageSettlements")} className="justify-between gap-2">
                  <HandCoins className="mr-2 h-4 w-4" />
                  <span className="mr-auto">Settlements</span>
                  <ShortcutHint shortcutId="nav.manageSettlements" />
                </Button>
              </div>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <SettingsSection
                icon={Brush}
                title="Appearance"
                description="Theme and font preferences for the current admin profile."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="theme-select">Theme</Label>
                    <Select
                      value={selectedTheme}
                      onValueChange={(value) => {
                        setSelectedTheme(value);
                        setTheme(value);
                        void runAction(
                          "theme",
                          "Theme saved",
                          () => updateProfileSetting({ theme_preference: value }),
                          `${value} theme is now selected.`,
                        );
                      }}
                      disabled={!canMutate}
                    >
                      <SelectTrigger id="theme-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THEME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="font-select">Font</Label>
                    <Select
                      value={selectedFont}
                      onValueChange={(value) => {
                        const font = value as FontPreference;
                        setSelectedFont(font);
                        applyFontPreference(font);
                        void runAction(
                          "font",
                          "Font saved",
                          () => updateProfileSetting({ font_preference: font }),
                          `${FONT_OPTIONS.find((option) => option.value === font)?.label || font} is now selected.`,
                        );
                      }}
                      disabled={!canMutate}
                    >
                      <SelectTrigger id="font-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                icon={UserCog}
                title="Profile Defaults"
                description="Admin profile preferences stored with the current user."
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="landing-view">Default landing tab</Label>
                    <Select
                      value={defaultView}
                      onValueChange={(value) => {
                        const view = value as ActiveView;
                        setDefaultView(view);
                        void runAction(
                          "landing-view",
                          "Landing tab saved",
                          () => updateProfileSetting({ last_active_view: view }),
                          "Your default landing tab was updated.",
                        );
                      }}
                      disabled={!canMutate}
                    >
                      <SelectTrigger id="landing-view">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANDING_VIEW_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={onEditProfileName}
                      disabled={!canMutate}
                      className="sm:w-auto"
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Edit Name
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!canMutate}
                      onClick={() =>
                        void runAction(
                          "welcome-toast",
                          "Welcome toast reset",
                          () =>
                            updateProfileSetting({
                              has_seen_welcome_toast: false,
                              should_show_welcome_toast: true,
                            }),
                          "The welcome toast will show again on the next eligible visit.",
                        )
                      }
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Reset Welcome
                    </Button>
                  </div>
                </div>
              </SettingsSection>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div className="grid gap-4">
              <SettingsSection
                icon={Brain}
                title="AI Autopilot Diagnostics"
                description="Monitor AI system health, run structured schema validations, and automatically optimize model fallbacks."
                action={
                  <Badge variant="outline">
                    {snapshot?.aiConfig?.updatedAt ? `Self-Optimized ${formatDateTime(snapshot.aiConfig.updatedAt)}` : "Default config"}
                  </Badge>
                }
              >
                <div className="grid gap-6">
                  {/* Current Active Config Card */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm backdrop-blur-md">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Brain className="h-4.5 w-4.5" />
                      Active Model Configuration
                    </h4>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg bg-background/60 p-3 border border-border">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Primary Model</span>
                        <p className="mt-1 text-sm font-semibold text-foreground truncate">{snapshot?.aiConfig?.modelCode || DEFAULT_AI_MODEL_CODE}</p>
                      </div>
                      <div className="rounded-lg bg-background/60 p-3 border border-border">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Fallback 1</span>
                        <p className="mt-1 text-sm font-semibold text-foreground truncate">{snapshot?.aiConfig?.fallbackModelCodes?.[0] || "None"}</p>
                      </div>
                      <div className="rounded-lg bg-background/60 p-3 border border-border">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Fallback 2</span>
                        <p className="mt-1 text-sm font-semibold text-foreground truncate">{snapshot?.aiConfig?.fallbackModelCodes?.[1] || "None"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Run Diagnostics Controls */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Optimization Diagnostics</p>
                      <p className="text-xs text-muted-foreground">Probes API status, response latency, and structured schema integrity for all available models.</p>
                    </div>
                    <Button
                      disabled={diagnosticsRunning || !canMutate}
                      onClick={handleRunDiagnostics}
                      className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      {diagnosticsRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running Optimizer...
                        </>
                      ) : (
                        <>
                          <Activity className="mr-2 h-4 w-4" />
                          Optimize AI Configuration
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Checklist & Results */}
                  {(diagnosticsRunning || diagnosticsResult) && (
                    <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Checklist Status</h4>
                      
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          { step: 1, label: "Google AI API connection check" },
                          { step: 2, label: "Primary Model check" },
                          { step: 3, label: "JSON Schema structure check" },
                          { step: 4, label: "Latency verification (< 1.5s)" },
                          { step: 5, label: "Fallback chain integrity resolution" }
                        ].map((s) => {
                          const isDone = diagnosticsStep > s.step || (diagnosticsStep === 5 && !diagnosticsRunning);
                          const isActive = diagnosticsRunning && diagnosticsStep === s.step;
                          return (
                            <div key={s.step} className="flex items-center gap-3 text-sm">
                              {isDone ? (
                                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                              ) : isActive ? (
                                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                              ) : (
                                <div className="h-5 w-5 rounded-full border border-muted-foreground/30 shrink-0" />
                              )}
                              <span className={cn(
                                "transition-colors",
                                isDone ? "text-foreground font-medium" : isActive ? "text-primary font-semibold" : "text-muted-foreground"
                              )}>
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Log Console Output */}
                      {diagnosticsResult && (
                        <div className="mt-4 rounded-lg bg-black/90 p-4 font-mono text-[10px] text-zinc-300 space-y-1 max-h-48 overflow-y-auto border border-zinc-800 shadow-inner">
                          <p className="text-zinc-500 border-b border-zinc-800 pb-1 mb-2">Optimizer Console Logs</p>
                          {diagnosticsResult.log.map((line, idx) => (
                            <p key={idx} className={cn(
                              line.includes("✅") ? "text-emerald-400" : line.includes("❌") ? "text-rose-400" : "text-zinc-300"
                            )}>{line}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model Directory Table */}
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Server className="h-4.5 w-4.5" />
                      Model Capabilities Directory
                    </h4>
                    <p className="text-xs text-muted-foreground">Verified capability records stored in database. You can manually promote any validated model to primary.</p>
                    
                    <div className="overflow-x-auto rounded-lg border border-border bg-card">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
                          <tr>
                            <th className="p-3">Model Code</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Tested Latency</th>
                            <th className="p-3">Checked At</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {capabilities && capabilities.length > 0 ? (
                            capabilities.map((c) => {
                              const modelMeta = AI_MODEL_OPTIONS.find((opt) => opt.code === c.modelCode) || { displayName: c.modelCode };
                              return (
                                <tr key={c._id} className="hover:bg-muted/20 transition-colors">
                                  <td className="p-3 font-medium text-foreground">
                                    <div className="flex flex-col">
                                      <span>{modelMeta.displayName}</span>
                                      <span className="font-mono text-[10px] text-muted-foreground">{c.modelCode}</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {c.verified ? (
                                      <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60 font-semibold gap-1">
                                        <ShieldCheck className="h-3.5 w-3.5" /> Verified
                                      </Badge>
                                    ) : (
                                      <div className="flex flex-col gap-0.5">
                                        <Badge variant="destructive" className="font-semibold gap-1 shrink-0">
                                          <ShieldAlert className="h-3.5 w-3.5" /> Failed
                                        </Badge>
                                        {c.errorDetails && (
                                          <span className="text-[10px] text-rose-500/80 max-w-xs line-clamp-1 truncate" title={c.errorDetails}>
                                            {c.errorDetails}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono text-xs">
                                    {c.latencyMs ? `${c.latencyMs}ms` : "--"}
                                  </td>
                                  <td className="p-3 text-xs text-muted-foreground">
                                    {formatDateTime(c.checkedAt)}
                                  </td>
                                  <td className="p-3 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!c.verified || !canMutate || snapshot?.aiConfig?.modelCode === c.modelCode}
                                      onClick={() => handlePromoteModel(c.modelCode)}
                                      className="h-8 text-xs font-medium"
                                    >
                                      {snapshot?.aiConfig?.modelCode === c.modelCode ? "Active Primary" : "Promote to Primary"}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                                No verified capabilities records found. Click 'Optimize AI Configuration' to discover and test models.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </SettingsSection>
            </div>

            <SettingsSection
              icon={Trash2}
              title="Usage and AI Cache Cleanup"
              description="Clear generated aggregate analytics and cached AI outputs for the current deployment."
            >
              <div className="grid gap-3 xl:grid-cols-2">
                <ActionRow
                  title="Clear usage analytics"
                  description={`${formatNumber(counts.appUsageEvents)} usage events, ${formatNumber(counts.usageDailyRollups)} rollups, and ${formatNumber(counts.reportGenerationEvents)} legacy report events are stored on this deployment.`}
                  destructive
                >
                  <Button
                    variant="destructive"
                    disabled={dangerControlDisabled}
                    onClick={() =>
                      openDangerAction({
                        id: "clear-usage-analytics",
                        title: `Clear ${dangerEnvironmentLabel} usage analytics`,
                        description: "This deletes app usage analytics, aggregate rollups, session touches, and legacy report event history for the connected deployment.",
                        phrase: buildDangerPhrase(clientEnvironment, "clearUsageAnalytics"),
                        buttonLabel: "Clear Analytics",
                        targetSummary: [
                          { label: "Environment", value: dangerEnvironmentLabel },
                          { label: "Usage events", value: counts.appUsageEvents },
                          { label: "Rollups", value: counts.usageDailyRollups },
                          { label: "Legacy report events", value: counts.reportGenerationEvents },
                        ],
                        run: (confirmation) =>
                          runDangerAction(
                            "clear-usage-analytics",
                            "Usage analytics cleared",
                            (phrase) =>
                              clearAppUsageAnalytics(buildDangerMutationArgs(phrase)),
                            "Usage analytics and legacy report logs were deleted.",
                            confirmation,
                          ),
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Analytics
                  </Button>
                </ActionRow>

                <ActionRow
                  title="Clear AI caches"
                  description={`${formatNumber(counts.aiSummaries + counts.aiRedactions)} AI cache records are stored on this deployment.`}
                  destructive
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-summaries"
                      checked={includeSummaries}
                      onCheckedChange={(value) => setIncludeSummaries(value === true)}
                      disabled={dangerControlDisabled}
                    />
                    <Label htmlFor="include-summaries" className="text-xs">Summaries</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-redactions"
                      checked={includeRedactions}
                      onCheckedChange={(value) => setIncludeRedactions(value === true)}
                      disabled={dangerControlDisabled}
                    />
                    <Label htmlFor="include-redactions" className="text-xs">Redactions</Label>
                  </div>
                  <Button
                    variant="destructive"
                    disabled={dangerControlDisabled || (!includeSummaries && !includeRedactions)}
                    onClick={() =>
                      openDangerAction({
                        id: "clear-ai-caches",
                        title: `Clear ${dangerEnvironmentLabel} AI caches`,
                        description: "This deletes cached AI summaries and/or redactions for the connected deployment.",
                        phrase: buildDangerPhrase(clientEnvironment, "clearAiCaches"),
                        buttonLabel: "Clear Caches",
                        targetSummary: [
                          { label: "Environment", value: dangerEnvironmentLabel },
                          { label: "Summaries", value: includeSummaries ? counts.aiSummaries : "Skipped" },
                          { label: "Redactions", value: includeRedactions ? counts.aiRedactions : "Skipped" },
                        ],
                        run: (confirmation) =>
                          runDangerAction(
                            "clear-ai-caches",
                            "AI caches cleared",
                            (phrase) =>
                              clearAiCaches({
                                ...buildDangerMutationArgs(phrase),
                                includeSummaries,
                                includeRedactions,
                              }),
                            "Selected AI cache records were deleted.",
                            confirmation,
                          ),
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Caches
                  </Button>
                </ActionRow>
              </div>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4">
            <SettingsSection
              icon={LucideIcons.Megaphone}
              title="Announcements Management"
              description="Create and manage global announcements displayed to all users upon sign-in."
            >
              <div className="grid gap-6 lg:grid-cols-12 mt-4">
                {/* Left Side: Alert Composition Form */}
                <div className="lg:col-span-5 space-y-4">
                  <Card className="border-muted bg-muted/15 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">
                        {editingAnnouncementId ? "Edit Announcement" : "Create Announcement"}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {editingAnnouncementId 
                          ? "Modify this active or inactive global system alert." 
                          : "Compose a new system alert to push globally to all users."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <form onSubmit={handleSaveAnnouncement} className="space-y-4">
                        {/* Title Input */}
                        <div className="space-y-1.5">
                          <Label htmlFor="announcement-title" className="text-xs font-semibold">
                            Title
                          </Label>
                          <Input
                            id="announcement-title"
                            value={announcementTitle}
                            onChange={(e) => setAnnouncementTitle(e.target.value)}
                            placeholder="e.g. Scheduled System Maintenance"
                            className="h-10 text-sm rounded-lg"
                            required
                          />
                        </div>

                        {/* Description Textarea */}
                        <div className="space-y-1.5">
                          <Label htmlFor="announcement-desc" className="text-xs font-semibold">
                            Message
                          </Label>
                          <textarea
                            id="announcement-desc"
                            value={announcementDescription}
                            onChange={(e) => setAnnouncementDescription(e.target.value)}
                            placeholder="Compose detailed announcement content here..."
                            rows={4}
                            className="w-full text-sm rounded-lg border border-input bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            required
                          />
                        </div>

                        {/* Tone and Frequency Fields */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="announcement-tone" className="text-xs font-semibold">
                              Tone Style
                            </Label>
                            <Select
                              value={announcementTone}
                              onValueChange={(val: any) => setAnnouncementTone(val)}
                            >
                              <SelectTrigger id="announcement-tone" className="h-10 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default" className="text-xs">Default (Muted)</SelectItem>
                                <SelectItem value="brand" className="text-xs">Brand (SettleEase Purple)</SelectItem>
                                <SelectItem value="success" className="text-xs">Success (Green)</SelectItem>
                                <SelectItem value="warning" className="text-xs">Warning (Amber)</SelectItem>
                                <SelectItem value="danger" className="text-xs">Danger (Red)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="announcement-frequency" className="text-xs font-semibold">
                              Show Frequency
                            </Label>
                            <Select
                              value={announcementFrequency}
                              onValueChange={(val: any) => setAnnouncementFrequency(val)}
                            >
                              <SelectTrigger id="announcement-frequency" className="h-10 text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="once" className="text-xs">Show Once</SelectItem>
                                <SelectItem value="everytime" className="text-xs">Every Session</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Icon Picker Trigger */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Alert Icon</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIconPickerOpen(true)}
                              className="h-10 rounded-lg flex-1 justify-start gap-2 border-dashed border-muted-foreground/30 hover:border-primary/50 text-xs text-foreground font-medium"
                            >
                              {(() => {
                                const PickerIcon = (LucideIcons as any)[announcementIcon] || LucideIcons.Megaphone;
                                return <PickerIcon className="h-4 w-4 text-primary shrink-0" />;
                              })()}
                              <span className="truncate">{announcementIcon}</span>
                            </Button>
                            <span className="text-xs text-muted-foreground shrink-0 italic">Select icon</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handlePreviewAnnouncementForm}
                            className="flex-1 h-10 rounded-lg text-xs"
                          >
                            <LucideIcons.Eye className="mr-1.5 h-3.5 w-3.5" />
                            Preview
                          </Button>
                          <Button
                            type="submit"
                            disabled={isAnnouncementActionLoading}
                            className="flex-1 h-10 rounded-lg text-xs"
                          >
                            {isAnnouncementActionLoading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : editingAnnouncementId ? (
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                            ) : (
                              <LucideIcons.Plus className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {editingAnnouncementId ? "Save Changes" : "Create Alert"}
                          </Button>
                        </div>

                        {editingAnnouncementId && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancelEditAnnouncement}
                            className="w-full h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            Cancel Editing
                          </Button>
                        )}
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side: Announcements Dashboard List */}
                <div className="lg:col-span-7 space-y-4">
                  <Card className="border-muted bg-muted/15 shadow-sm h-full flex flex-col">
                    <CardHeader className="pb-3 shrink-0">
                      <CardTitle className="text-base font-semibold">Active Announcements</CardTitle>
                      <CardDescription className="text-xs">
                        View, toggle status, edit, or delete existing system announcements.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto min-h-0 space-y-3 p-6 pt-0">
                      {!allAnnouncements ? (
                        <div className="space-y-3 py-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex items-center space-x-3 rounded-lg border p-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-2/3" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : allAnnouncements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-muted/80 bg-background/40">
                          <div className="rounded-full bg-secondary/50 p-3 mb-3 text-muted-foreground">
                            <LucideIcons.Megaphone className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">No Announcements Found</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                            Create your first announcement using the form to publish a system-wide notice.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {allAnnouncements.map((ann) => {
                            const AnnIcon = (LucideIcons as any)[ann.icon_name] || LucideIcons.Megaphone;
                            
                            // Tone background and border color classes
                            let toneBgClass = "bg-muted/50 border-muted text-foreground/80";
                            let toneIconClass = "text-muted-foreground bg-muted";
                            if (ann.tone === "brand") {
                              toneBgClass = "bg-purple-500/5 border-purple-500/10 dark:bg-purple-500/10 dark:border-purple-500/20";
                              toneIconClass = "text-purple-500 bg-purple-500/10 dark:bg-purple-500/25";
                            } else if (ann.tone === "success") {
                              toneBgClass = "bg-green-500/5 border-green-500/10 dark:bg-green-500/10 dark:border-green-500/20";
                              toneIconClass = "text-green-500 bg-green-500/10 dark:bg-green-500/25";
                            } else if (ann.tone === "warning") {
                              toneBgClass = "bg-amber-500/5 border-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/20";
                              toneIconClass = "text-amber-500 bg-amber-500/10 dark:bg-amber-500/25";
                            } else if (ann.tone === "danger") {
                              toneBgClass = "bg-red-500/5 border-red-500/10 dark:bg-red-500/10 dark:border-red-500/20";
                              toneIconClass = "text-red-500 bg-red-500/10 dark:bg-red-500/25";
                            }

                            return (
                              <div
                                key={ann.id}
                                className={cn(
                                  "group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
                                  ann.is_active ? toneBgClass : "bg-card/45 border-muted/50 opacity-75"
                                )}
                              >
                                <div className="flex gap-3 items-start min-w-0">
                                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-sm border", toneIconClass)}>
                                    <AnnIcon className="h-4.5 w-4.5" />
                                  </div>
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-xs">
                                        {ann.title}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "px-1.5 py-0.5 text-[10px] uppercase font-bold rounded-md shrink-0 tracking-wider",
                                          ann.display_frequency === "once" 
                                            ? "border-blue-500/20 text-blue-500 bg-blue-500/5" 
                                            : "border-purple-500/20 text-purple-500 bg-purple-500/5"
                                        )}
                                      >
                                        {ann.display_frequency}
                                      </Badge>
                                      {!ann.is_active && (
                                        <Badge
                                          variant="secondary"
                                          className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded-md shrink-0 tracking-wider border-dashed text-muted-foreground"
                                        >
                                          Inactive
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap">
                                      {ann.description}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2.5 md:pt-0 border-dashed border-muted-foreground/10 justify-end w-full md:w-auto">
                                  {/* Toggle Active Switch */}
                                  <div className="flex items-center gap-2 mr-2">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                      {ann.is_active ? "Active" : "Inactive"}
                                    </span>
                                    <Switch
                                      checked={ann.is_active}
                                      onCheckedChange={() => handleToggleAnnouncementActive(ann.id, ann.is_active)}
                                      className="scale-90"
                                    />
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setPreviewAnnouncement(ann)}
                                      title="Preview Dialog"
                                      className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    >
                                      <LucideIcons.Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleEditAnnouncement(ann)}
                                      title="Edit Announcement"
                                      className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    >
                                      <LucideIcons.Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteAnnouncement(ann.id)}
                                      title="Delete Announcement"
                                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="appAnalytics" className="space-y-4">
            <SettingsSection
              icon={ChartColumn}
              title="Usage Analytics"
              description="Aggregate app usage, workflow, report, and AI activity."
            >
              {appUsageAnalytics ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-5">
                    <Select value={usageDatePreset} onValueChange={(value) => setUsageDatePreset(value as UsageAnalyticsPreset)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 hours</SelectItem>
                        <SelectItem value="7d">7 days</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="90d">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={usageSurface} onValueChange={setUsageSurface}>
                      <SelectTrigger>
                        <SelectValue placeholder="Surface" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All surfaces</SelectItem>
                        {USAGE_SURFACE_FILTERS.map((surface) => (
                          <SelectItem key={surface} value={surface}>
                            {formatUsageLabel(surface)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={usageStatus} onValueChange={setUsageStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failure">Failure</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={usageRole} onValueChange={setUsageRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All roles</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="user">Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={usageEventGroup} onValueChange={setUsageEventGroup}>
                      <SelectTrigger>
                        <SelectValue placeholder="Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All groups</SelectItem>
                        {USAGE_EVENT_GROUP_FILTERS.map((eventGroup) => (
                          <SelectItem key={eventGroup} value={eventGroup}>
                            {formatUsageLabel(eventGroup)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Active Users" value={appUsageAnalytics.cards.activeUsers} icon={Users} />
                    <MetricTile label="Sessions" value={appUsageAnalytics.cards.sessions} icon={Activity} />
                    <MetricTile label="Events" value={appUsageAnalytics.cards.totalEvents} icon={ChartColumn} />
                    <MetricTile label="Failure Rate" value={formatPercent(appUsageAnalytics.cards.failureRate)} icon={AlertTriangle} />
                    <MetricTile label="Top Surface" value={formatUsageLabel(appUsageAnalytics.cards.topSurface)} icon={Sparkles} />
                    <MetricTile label="Expense Saves" value={appUsageAnalytics.cards.expenseSaves} icon={FileDown} />
                    <MetricTile label="Scan Success" value={formatPercent(appUsageAnalytics.cards.scanSuccessRate)} icon={Activity} />
                    <MetricTile label="Settlements" value={appUsageAnalytics.cards.settlementActions} icon={HandCoins} />
                    <MetricTile label="Downloads" value={appUsageAnalytics.cards.reportDownloads} icon={FileDown} />
                    <MetricTile label="AI Cache Rate" value={formatPercent(appUsageAnalytics.cards.aiCacheRate)} icon={Brain} />
                    <MetricTile label="AI Fallbacks" value={formatPercent(appUsageAnalytics.cards.aiFallbackFailureRate)} icon={AlertTriangle} />
                    <MetricTile label="Success Events" value={appUsageAnalytics.totals.success} icon={ShieldCheck} />
                  </div>

                  {appUsageAnalytics.cards.totalEvents > 0 ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <UsageList title="Activity Over Time" rows={appUsageAnalytics.activityByDate.map((row) => ({ key: row.dateKey, count: row.count }))} />
                      <UsageList title="Feature Adoption" rows={appUsageAnalytics.featureAdoption} />
                      <UsageList title="Workflow Funnel" rows={appUsageAnalytics.workflowFunnel} />
                      <UsageList title="AI and Report Health" rows={appUsageAnalytics.aiReportHealth} />
                      <UsageList title="Event Groups" rows={appUsageAnalytics.eventGroups} />
                      <UsageList title="Top Aggregate Actions" rows={appUsageAnalytics.topActions} />
                    </div>
                  ) : (
                    <AppEmptyState
                      icon={ChartColumn}
                      title="No usage activity"
                      description="Usage analytics will appear here after users interact with the app."
                      size="compact"
                    />
                  )}
                </div>
              ) : (
                <SkeletonToolbar count={4} />
              )}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <SettingsSection
              icon={Wrench}
              title="Safe Maintenance"
              description="Setup and sync tools that operate only against the connected deployment."
            >
              <div className="grid gap-3">
                <ActionRow
                  title="Seed default people"
                  description="Adds Alice, Bob, and Charlie only if the people table is empty."
                >
                  <Button
                    variant="outline"
                    disabled={!canMutate}
                    onClick={() =>
                      void runAction(
                        "seed-people",
                        "Default people checked",
                        () => ensureDefaultPeople({ expectedEnvironment: clientEnvironment }),
                        "Default people were added if the table was empty.",
                      )
                    }
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Seed People
                  </Button>
                </ActionRow>

                <ActionRow
                  title="Seed default categories"
                  description="Adds missing starter categories without replacing existing categories."
                >
                  <Button
                    variant="outline"
                    disabled={!canMutate}
                    onClick={() =>
                      void runAction(
                        "seed-categories",
                        "Default categories checked",
                        () => seedDefaultCategories({ expectedEnvironment: clientEnvironment }),
                        "Missing starter categories were added.",
                      )
                    }
                  >
                    <Tags className="mr-2 h-4 w-4" />
                    Seed Categories
                  </Button>
                </ActionRow>

                <ActionRow
                  title="Budget catalog backfill"
                  description="Builds or refreshes budget item suggestions from historical itemized expenses."
                >
                  <Button
                    variant="outline"
                    disabled={!canMutate}
                    onClick={() =>
                      void runAction(
                        "backfill-dry-run",
                        "Backfill preview ready",
                        async () => {
                          const result = await backfillBudgetItemsFromExpenses({
                            dryRun: true,
                            expectedEnvironment: clientEnvironment,
                          });
                          setBackfillPreview(result as BudgetBackfillResult);
                        },
                        "Review the preview counts before applying.",
                      )
                    }
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Dry Run
                  </Button>
                  <Button
                    disabled={!canMutate || !backfillPreview}
                    onClick={() =>
                      void runAction(
                        "backfill-apply",
                        "Budget catalog updated",
                        () =>
                          backfillBudgetItemsFromExpenses({
                            dryRun: false,
                            expectedEnvironment: clientEnvironment,
                          }),
                        "Budget item suggestions were synchronized.",
                      )
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Apply
                  </Button>
                </ActionRow>

                {backfillPreview ? (
                  <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Observations" value={backfillPreview.validObservationCount} icon={Activity} />
                    <MetricTile label="Skipped" value={backfillPreview.skippedObservationCount} icon={AlertTriangle} />
                    <MetricTile label="Insertions" value={backfillPreview.rowsToInsert} icon={Sparkles} />
                    <MetricTile label="Updates" value={backfillPreview.rowsToUpdate} icon={RefreshCw} />
                  </div>
                ) : null}
              </div>
            </SettingsSection>

            <SettingsSection
              icon={HandCoins}
              title="Settlement Maintenance"
              description="Clear settlement-only state for the connected deployment."
            >
              <div className="grid gap-3 xl:grid-cols-2">
                <ActionRow
                  title="Clear active manual overrides"
                  description={`${formatNumber(counts.activeManualOverrides)} active override paths are currently influencing settlement calculations.`}
                  destructive
                >
                  <Button
                    variant="destructive"
                    disabled={dangerControlDisabled}
                    onClick={() =>
                      openDangerAction({
                        id: "clear-active-overrides",
                        title: `Clear ${dangerEnvironmentLabel} active overrides`,
                        description: "This deactivates active manual settlement overrides without deleting recorded payments.",
                        phrase: buildDangerPhrase(clientEnvironment, "clearActiveOverrides"),
                        buttonLabel: "Clear Overrides",
                        targetSummary: [
                          { label: "Environment", value: dangerEnvironmentLabel },
                          { label: "Active overrides", value: counts.activeManualOverrides },
                        ],
                        run: (confirmation) =>
                          runDangerAction(
                            "clear-active-overrides",
                            "Active overrides cleared",
                            (phrase) =>
                              clearSettlementRecords({
                                ...buildDangerMutationArgs(phrase),
                                scope: "activeManualOverrides",
                              }),
                            "Active manual settlement overrides were deactivated.",
                            confirmation,
                          ),
                      })
                    }
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Clear Active
                  </Button>
                </ActionRow>

                <ActionRow
                  title="Clear settlement records"
                  description={`${formatNumber(counts.settlementPayments)} payments and ${formatNumber(counts.manualOverrides)} manual override records are stored.`}
                  destructive
                >
                  <Button
                    variant="destructive"
                    disabled={dangerControlDisabled}
                    onClick={() =>
                      openDangerAction({
                        id: "clear-settlement-records",
                        title: `Clear ${dangerEnvironmentLabel} settlement records`,
                        description: "This deletes recorded payments and manual override records for the connected deployment.",
                        phrase: buildDangerPhrase(clientEnvironment, "clearSettlementRecords"),
                        buttonLabel: "Clear Records",
                        targetSummary: [
                          { label: "Environment", value: dangerEnvironmentLabel },
                          { label: "Recorded payments", value: counts.settlementPayments },
                          { label: "Manual overrides", value: counts.manualOverrides },
                        ],
                        run: (confirmation) =>
                          runDangerAction(
                            "clear-settlement-records",
                            "Settlement records cleared",
                            (phrase) =>
                              clearSettlementRecords({
                                ...buildDangerMutationArgs(phrase),
                                scope: "allSettlementRecords",
                              }),
                            "Settlement payment and manual override records were deleted.",
                            confirmation,
                          ),
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Records
                  </Button>
                </ActionRow>
              </div>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="experiments" className="space-y-4">
            <SettingsSection
              icon={Sparkles}
              title="Experiments"
              description="Profile-scoped feature flags. Changes sync live to active sessions through Convex."
            >
              {adminProfiles ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricTile label="Profiles" value={adminProfiles.length} icon={Users} />
                    <MetricTile
                      label="Windows Experience"
                      value={adminProfiles.filter((profile) => profile.windows_experience_enabled).length}
                      description="Enabled profiles"
                      icon={Sparkles}
                    />
                  </div>

                  <div className="space-y-2">
                    {adminProfiles.map((profile) => {
                      const profileName = getAdminProfileDisplayName(profile);
                      const isCurrentUser = profile.user_id === currentUserId;
                      const actionId = `windows-experience-${profile.user_id}`;
                      const isWorking = workingAction === actionId;

                      return (
                        <div
                          key={profile.user_id}
                          className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h4 className="truncate text-sm font-semibold text-foreground">
                                {profileName}
                              </h4>
                              <Badge variant={profile.role === "admin" ? "default" : "outline"}>
                                {profile.role}
                              </Badge>
                              {isCurrentUser ? (
                                <Badge variant="outline">Current user</Badge>
                              ) : null}
                            </div>
                            <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                              <span className="truncate">{profile.email || "No email"}</span>
                              <span className="truncate">Last sign-in: {formatDateTime(profile.last_sign_in_at)}</span>
                            </div>
                            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                              {profile.user_id}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                            <Label htmlFor={`windows-experience-${profile.user_id}`} className="text-sm">
                              Windows Experience
                            </Label>
                            <Switch
                              id={`windows-experience-${profile.user_id}`}
                              checked={profile.windows_experience_enabled}
                              disabled={!canMutate || isWorking}
                              data-windows-experience-safe="true"
                              onCheckedChange={(value) => {
                                const enabled = value === true;
                                void runAction(
                                  actionId,
                                  enabled ? "Windows Experience enabled" : "Windows Experience disabled",
                                  () =>
                                    setUserWindowsExperience({
                                      expectedEnvironment: clientEnvironment,
                                      supabaseUserId: profile.user_id,
                                      enabled,
                                    }),
                                  `${profileName} ${enabled ? "now has" : "no longer has"} the Windows Experience.`,
                                );
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <SkeletonToolbar count={4} />
              )}
            </SettingsSection>
          </TabsContent>

          <TabsContent value="danger" className="space-y-4">
            <SettingsSection
              icon={ShieldAlert}
              title="Danger Zone"
              description="High-impact controls are isolated to the connected environment and require server-side confirmation."
              action={
                <Badge variant={dangerAllowed ? "destructive" : "outline"}>
                  {dangerAllowed
                    ? "Danger unlocked"
                    : productionDangerRequiresUnlock && dangerServerAvailable
                      ? "Unlock required"
                      : "Danger locked"}
                </Badge>
              }
              className="border-destructive/30"
            >
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                  <p className="font-medium text-foreground">
                    Target: {dangerEnvironmentLabel} / {configuredConvexHost || "Unknown host"}
                  </p>
                  <p className="mt-1">
                    {snapshot?.environment.destructiveActionsReason ||
                      "Waiting for the Convex environment snapshot."}
                  </p>
                  {productionDangerRequiresUnlock && dangerServerAvailable ? (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        variant={productionDangerUnlocked ? "outline" : "destructive"}
                        onClick={() => {
                          if (productionDangerUnlocked) {
                            setProductionDangerUnlocked(false);
                            toast({
                              title: "Production danger zone locked",
                              description: "Production destructive controls are locked again for this session.",
                            });
                            return;
                          }
                          setProductionUnlockDialogOpen(true);
                        }}
                      >
                        {productionDangerUnlocked ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Unlock className="mr-2 h-4 w-4" />
                        )}
                        {productionDangerUnlocked ? "Lock Production Danger Zone" : "Unlock Production Danger Zone"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Unlocking is session-only. Each destructive action still requires its own phrase.
                      </p>
                    </div>
                  ) : null}
                  {clientEnvironment === "development" && configuredConvexHost !== DEVELOPMENT_CONVEX_HOST ? (
                    <p className="mt-2 text-destructive">
                      Development reset controls only unlock for {DEVELOPMENT_CONVEX_HOST}.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <ActionRow
                    title="Reset operational data"
                    description="Deletes expenses, settlements, budget items, report logs, and AI caches. People and categories stay."
                    destructive
                  >
                    <Button
                      variant="destructive"
                      disabled={dangerControlDisabled}
                      onClick={() =>
                        openDangerAction({
                          id: "reset-operational",
                          title: `Reset ${dangerEnvironmentLabel} operational data`,
                          description: "This clears working expense data while preserving people, categories, profiles, AI prompts, and AI config.",
                          phrase: buildDangerPhrase(clientEnvironment, "resetOperational"),
                          buttonLabel: "Reset Data",
                          targetSummary: [
                            { label: "Environment", value: dangerEnvironmentLabel },
                            { label: "Expenses", value: counts.expenses },
                            { label: "Settlement payments", value: counts.settlementPayments },
                            { label: "Manual overrides", value: counts.manualOverrides },
                            { label: "Budget items", value: counts.budgetItems },
                            { label: "Report events", value: counts.reportGenerationEvents },
                            { label: "AI caches", value: counts.aiSummaries + counts.aiRedactions },
                          ],
                          run: (confirmation) =>
                            runDangerAction(
                              "reset-operational",
                              "Operational data reset",
                              (phrase) =>
                                resetSettleEaseData({
                                  ...buildDangerMutationArgs(phrase),
                                  mode: "operational",
                                }),
                              "Operational data was deleted for the connected deployment.",
                              confirmation,
                            ),
                        })
                      }
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Data
                    </Button>
                  </ActionRow>

                  <ActionRow
                    title="Factory reset SettleEase"
                    description="Deletes operational data plus people and categories. Profiles, auth, AI prompts, and AI config stay."
                    destructive
                  >
                    <Button
                      variant="destructive"
                      disabled={dangerControlDisabled}
                      onClick={() =>
                        openDangerAction({
                          id: "factory-reset",
                          title: `Factory reset ${dangerEnvironmentLabel}`,
                          description: "This deletes all SettleEase group data for the connected deployment except profiles, auth, AI prompts, and AI config.",
                          phrase: buildDangerPhrase(clientEnvironment, "factoryReset"),
                          buttonLabel: "Factory Reset",
                          targetSummary: [
                            { label: "Environment", value: dangerEnvironmentLabel },
                            { label: "People", value: counts.people },
                            { label: "Categories", value: counts.categories },
                            { label: "Expenses", value: counts.expenses },
                            { label: "Settlement records", value: counts.settlementPayments + counts.manualOverrides },
                            { label: "Budget items", value: counts.budgetItems },
                            { label: "Report and AI records", value: counts.reportGenerationEvents + counts.aiSummaries + counts.aiRedactions },
                          ],
                          run: (confirmation) =>
                            runDangerAction(
                              "factory-reset",
                              "Factory reset complete",
                              (phrase) =>
                                resetSettleEaseData({
                                  ...buildDangerMutationArgs(phrase),
                                  mode: "factory",
                                }),
                              "Factory reset finished for the connected deployment.",
                              confirmation,
                            ),
                        })
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Factory Reset
                    </Button>
                  </ActionRow>
                </div>

                {isDevelopmentEnvironment ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    Local development is only allowed to unlock danger actions against the development Convex host.
                  </div>
                ) : null}
              </div>
            </SettingsSection>
          </TabsContent>
        </Tabs>
      </CardContent>

      <DangerActionDialog
        action={dangerAction}
        open={!!dangerAction}
        working={!!workingAction}
        onOpenChange={(open) => {
          if (!open && !workingAction) setDangerAction(null);
        }}
      />
      <ProductionDangerUnlockDialog
        open={productionUnlockDialogOpen}
        onOpenChange={setProductionUnlockDialogOpen}
        onUnlock={() => {
          setProductionDangerUnlocked(true);
          toast({
            title: "Production danger zone unlocked",
            description: "Destructive production controls are unlocked for this browser session.",
            variant: "destructive",
          });
        }}
      />

      {previewAnnouncement && (
        <AnnouncementModal
          announcement={previewAnnouncement}
          isOpen={!!previewAnnouncement}
          onDismiss={() => setPreviewAnnouncement(null)}
        />
      )}

      {iconPickerOpen && (
        <IconPickerModal
          open={iconPickerOpen}
          onClose={() => setIconPickerOpen(false)}
          onSelect={(iconName) => {
            setAnnouncementIcon(iconName);
            setIconPickerOpen(false);
          }}
        />
      )}
    </Card>
  );
}
