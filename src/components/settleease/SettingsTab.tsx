"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
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
  type AiModelCode,
} from "@/lib/settleease/aiModels";
import {
  LoadingRegion,
  SkeletonCardHeader,
  SkeletonMetricTile,
  SkeletonPanel,
  SkeletonToolbar,
} from "./SkeletonLayouts";
import ShortcutHint from "./ShortcutHint";
import AppEmptyState from "./AppEmptyState";

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
    userProfiles: number;
    reportGenerationEvents: number;
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

type ReportAnalytics = {
  sampledEventCount: number;
  actions: {
    previews: number;
    prints: number;
    downloads: number;
  };
  redaction: {
    enabledEvents: number;
    cacheHits: number;
    generated: number;
    fallbacks: number;
  };
  recentEvents: Array<{
    eventType: string;
    reportMode: string;
    dateRangeLabel: string;
    redacted: boolean;
    expenseCount: number;
    settlementCount: number;
    participantCount: number;
    createdAt: string;
  }>;
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
  { value: "inter", label: "Inter" },
  { value: "google-sans", label: "Google Sans" },
  { value: "geist", label: "Geist" },
  { value: "system", label: "System" },
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

function formatDateTime(value?: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString();
}

function buildDangerPhrase(
  environment: SettleEaseEnvironment,
  action:
    | "clearReportLogs"
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-lg">
        {action ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {action.title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6">
                {action.description}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="grid gap-2 rounded-lg border bg-destructive/5 p-3">
                {action.targetSummary.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="danger-confirmation">Confirmation phrase</Label>
                <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
                  {action.phrase}
                </div>
                <Input
                  id="danger-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={action.phrase}
                  autoComplete="off"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={!canConfirm}
                onClick={() => {
                  if (!action || !canConfirm) return;
                  void action.run(confirmation);
                }}
              >
                {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {action.buttonLabel}
              </Button>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Unlock Production Danger Zone
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6">
            This unlocks production-only destructive controls for this browser session. Each destructive action will still require its own exact confirmation phrase.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-destructive/5 p-3">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="production-danger-unlock">Unlock phrase</Label>
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
              {PRODUCTION_DANGER_UNLOCK_CONFIRMATION}
            </div>
            <Input
              id="production-danger-unlock"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={PRODUCTION_DANGER_UNLOCK_CONFIRMATION}
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
  const snapshot = useQuery(api.app.getAdminSettingsSnapshot, {}) as
    | AdminSettingsSnapshot
    | undefined;
  const reportAnalytics = useQuery(api.app.getReportGenerationAnalytics, {
    limit: 500,
  }) as ReportAnalytics | undefined;

  const ensureDefaultPeople = useMutation(api.app.ensureDefaultPeople);
  const seedDefaultCategories = useMutation(api.app.seedDefaultCategories);
  const updateAiConfig = useMutation(api.app.updateAiConfig);
  const backfillBudgetItemsFromExpenses = useMutation(api.app.backfillBudgetItemsFromExpenses);
  const clearReportGenerationEvents = useMutation(api.app.clearReportGenerationEvents);
  const clearAiCaches = useMutation(api.app.clearAiCaches);
  const clearSettlementRecords = useMutation(api.app.clearSettlementRecords);
  const resetSettleEaseData = useMutation(api.app.resetSettleEaseData);

  const clientEnvironment = getClientSettleEaseEnvironment();
  const configuredConvexUrl = getConvexUrl();
  const configuredConvexHost = getHostFromUrl(configuredConvexUrl);
  const expectedConvexHost = getExpectedConvexHost(clientEnvironment);

  const [selectedTheme, setSelectedTheme] = useState(
    theme || userProfile?.theme_preference || "light",
  );
  const [selectedFont, setSelectedFont] = useState<FontPreference>(
    userProfile?.font_preference || "inter",
  );
  const [defaultView, setDefaultView] = useState<ActiveView>(
    userProfile?.last_active_view || "dashboard",
  );
  const [selectedAiModel, setSelectedAiModel] = useState<AiModelCode>(
    DEFAULT_AI_MODEL_CODE,
  );
  const [fallbackOne, setFallbackOne] = useState<AiModelCode | "none">("none");
  const [fallbackTwo, setFallbackTwo] = useState<AiModelCode | "none">("none");
  const [backfillPreview, setBackfillPreview] = useState<BudgetBackfillResult | null>(null);
  const [includeSummaries, setIncludeSummaries] = useState(true);
  const [includeRedactions, setIncludeRedactions] = useState(true);
  const [workingAction, setWorkingAction] = useState<string | null>(null);
  const [dangerAction, setDangerAction] = useState<DangerAction | null>(null);
  const [productionDangerUnlocked, setProductionDangerUnlocked] = useState(false);
  const [productionUnlockDialogOpen, setProductionUnlockDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedTheme(theme || userProfile?.theme_preference || "light");
  }, [theme, userProfile?.theme_preference]);

  useEffect(() => {
    setSelectedFont(userProfile?.font_preference || "inter");
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
      userProfiles: userRole ? 1 : 0,
      reportGenerationEvents: 0,
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
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="ai">AI & Reports</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile label="People" value={counts.people} description="Participants" icon={Users} />
              <MetricTile label="Expenses" value={counts.expenses} description="Expense records" icon={FileDown} />
              <MetricTile label="Settlements" value={counts.settlementPayments} description="Recorded payments" icon={HandCoins} />
              <MetricTile label="Reports" value={counts.reportGenerationEvents} description="Tracked report events" icon={ChartColumn} />
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
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <SettingsSection
                icon={Brain}
                title="AI Model Configuration"
                description="Controls the active model used by report redaction, summaries, and AI-assisted tools."
                action={
                  <Badge variant="outline">
                    {snapshot?.aiConfig.updatedAt ? `Updated ${formatDateTime(snapshot.aiConfig.updatedAt)}` : "Default config"}
                  </Badge>
                }
              >
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ai-model">Primary model</Label>
                    <Select
                      value={selectedAiModel}
                      onValueChange={(value) => setSelectedAiModel(value as AiModelCode)}
                      disabled={!canMutate}
                    >
                      <SelectTrigger id="ai-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODEL_OPTIONS.map((option) => (
                          <SelectItem key={option.code} value={option.code}>
                            {option.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fallback-one">Fallback 1</Label>
                      <Select
                        value={fallbackOne}
                        onValueChange={(value) => setFallbackOne(value as AiModelCode | "none")}
                        disabled={!canMutate}
                      >
                        <SelectTrigger id="fallback-one">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {AI_MODEL_OPTIONS.filter((option) => option.code !== selectedAiModel).map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fallback-two">Fallback 2</Label>
                      <Select
                        value={fallbackTwo}
                        onValueChange={(value) => setFallbackTwo(value as AiModelCode | "none")}
                        disabled={!canMutate}
                      >
                        <SelectTrigger id="fallback-two">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {AI_MODEL_OPTIONS.filter((option) => option.code !== selectedAiModel).map((option) => (
                            <SelectItem key={option.code} value={option.code}>
                              {option.shortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                    {AI_MODEL_OPTIONS.find((option) => option.code === selectedAiModel)?.recommendedFor}
                  </div>

                  <Button
                    disabled={!canMutate}
                    onClick={() =>
                      void runAction(
                        "save-ai-config",
                        "AI config saved",
                        () =>
                          updateAiConfig({
                            expectedEnvironment: clientEnvironment,
                            modelCode: selectedAiModel,
                            fallbackModelCodes: normalizedFallbacks,
                          }),
                        "The active AI model configuration was updated.",
                      )
                    }
                  >
                    {workingAction === "save-ai-config" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save AI Config
                  </Button>
                </div>
              </SettingsSection>

              <SettingsSection
                icon={ChartColumn}
                title="Report Analytics"
                description="Recent export, print, preview, and redaction activity."
              >
                {reportAnalytics ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricTile label="Previews" value={reportAnalytics.actions.previews} icon={Activity} />
                      <MetricTile label="Downloads" value={reportAnalytics.actions.downloads} icon={FileDown} />
                      <MetricTile label="Cache Hits" value={reportAnalytics.redaction.cacheHits} icon={Brain} />
                      <MetricTile label="Fallbacks" value={reportAnalytics.redaction.fallbacks} icon={AlertTriangle} />
                    </div>
                    {reportAnalytics.recentEvents.length > 0 ? (
                      <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                        {reportAnalytics.recentEvents.slice(0, 8).map((event, index) => (
                          <div key={`${event.createdAt}-${index}`} className="rounded-lg border bg-card/30 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">{event.eventType.replaceAll("_", " ")}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {event.reportMode} / {event.dateRangeLabel} / {event.expenseCount} expenses
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AppEmptyState
                        icon={ChartColumn}
                        title="No report activity"
                        description="Report analytics will appear here after exports, prints, or previews."
                        size="compact"
                      />
                    )}
                  </div>
                ) : (
                  <SkeletonToolbar count={4} />
                )}
              </SettingsSection>
            </div>

            <SettingsSection
              icon={Trash2}
              title="Report and AI Cache Cleanup"
              description="Clear generated operational logs and cached AI outputs for the current deployment."
            >
              <div className="grid gap-3 xl:grid-cols-2">
                <ActionRow
                  title="Clear report logs"
                  description={`${formatNumber(counts.reportGenerationEvents)} report events are stored on this deployment.`}
                  destructive
                >
                  <Button
                    variant="destructive"
                    disabled={dangerControlDisabled}
                    onClick={() =>
                      openDangerAction({
                        id: "clear-report-logs",
                        title: `Clear ${dangerEnvironmentLabel} report logs`,
                        description: "This deletes report generation event history for the connected deployment.",
                        phrase: buildDangerPhrase(clientEnvironment, "clearReportLogs"),
                        buttonLabel: "Clear Logs",
                        targetSummary: [
                          { label: "Environment", value: dangerEnvironmentLabel },
                          { label: "Report events", value: counts.reportGenerationEvents },
                        ],
                        run: (confirmation) =>
                          runDangerAction(
                            "clear-report-logs",
                            "Report logs cleared",
                            (phrase) =>
                              clearReportGenerationEvents(buildDangerMutationArgs(phrase)),
                            "Report generation logs were deleted.",
                            confirmation,
                          ),
                      })
                    }
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Logs
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
    </Card>
  );
}
