"use client";

import React, { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  ReceiptText,
  Sparkles,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  type StructuredSettlementSummary,
} from "@/lib/settleease/aiSummarization";
import {
  buildBalanceBars,
  buildCategoryBars,
  buildPaymentRows,
  buildSettlementProgress,
  buildSummaryMetricCards,
  getDataQualityMessages,
  type BalanceBarRow,
  type CategoryBarRow,
  type PaymentActionRow,
  type SummaryMetricCard,
} from "@/lib/settleease/aiSummaryViewModel";
import { formatCurrency } from "@/lib/settleease/utils";
import {
  LoadingRegion,
  SkeletonMetricTile,
  SkeletonSectionHeader,
} from "../SkeletonLayouts";

export interface AISummaryActionResult {
  source: "cached" | "generated";
  hash: string;
  cacheKeyVersion: number;
  promptVersion: number;
  modelCode: string;
  modelName?: string | null;
  modelDisplayName?: string | null;
  modelConfigFingerprint?: string | null;
  payload: any;
  summary: StructuredSettlementSummary;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: AISummaryActionResult | null;
  isLoading: boolean;
  error: string | null;
}

type SummarySource = "cached" | "generated" | "loading";

const BAR_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-rose-500",
];

function normalizeForDedupe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[0-9.,₹$%]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueItems(items: string[] | undefined, max: number, existing: string[] = []): string[] {
  const seen = new Set(existing.map(normalizeForDedupe).filter(Boolean));
  const result: string[] = [];

  for (const item of items || []) {
    const trimmed = String(item || "").trim();
    const key = normalizeForDedupe(trimmed);
    if (!trimmed || !key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }

  return result;
}

function isNoExceptionText(items: string[]): boolean {
  if (items.length === 0) return true;
  return items.every((item) => {
    const text = item.toLowerCase();
    return (
      text.includes("no manual") ||
      text.includes("none active") ||
      text.includes("no exceptions") ||
      text.includes("not available in input data")
    );
  });
}

function buildCompactMarkdown({
  summary,
  metricCards,
  paymentRows,
  categoryBars,
  balanceBars,
  dataQualityMessages,
}: {
  summary: StructuredSettlementSummary;
  metricCards: SummaryMetricCard[];
  paymentRows: PaymentActionRow[];
  categoryBars: CategoryBarRow[];
  balanceBars: BalanceBarRow[];
  dataQualityMessages: string[];
}) {
  const lines: string[] = ["# AI Settlement Summary", ""];

  lines.push("## Settlement Snapshot");
  uniqueItems(summary.settlementSnapshot, 3).forEach((item) => lines.push(`- ${item}`));
  lines.push("");

  lines.push("## Key Numbers");
  metricCards.forEach((metric) => lines.push(`- ${metric.label}: ${metric.value}`));
  lines.push("");

  lines.push("## Payment Actions");
  if (paymentRows.length === 0) {
    lines.push("- No outstanding payments.");
  } else {
    paymentRows.forEach((payment) => {
      lines.push(`- ${payment.from} to ${payment.to}: ${formatCurrency(payment.amount)} (${payment.status})`);
    });
  }
  lines.push("");

  lines.push("## Spending Mix");
  if (categoryBars.length === 0) {
    lines.push("- Not available in input data.");
  } else {
    categoryBars.forEach((category) => {
      lines.push(`- ${category.name}: ${formatCurrency(category.amount)} (${category.share}%)`);
    });
  }
  lines.push("");

  lines.push("## Balance Pressure");
  if (balanceBars.length === 0) {
    lines.push("- No active balances.");
  } else {
    balanceBars.forEach((balance) => {
      lines.push(`- ${balance.name}: ${balance.direction} ${formatCurrency(balance.amount)}`);
    });
  }
  lines.push("");

  lines.push("## Data Quality");
  dataQualityMessages.forEach((message) => lines.push(`- ${message}`));
  lines.push("");

  lines.push("## Next Best Actions");
  uniqueItems(summary.nextBestActions, 4, summary.settlementSnapshot).forEach((item) => lines.push(`- ${item}`));

  return lines.join("\n").trim();
}

function LoadingState() {
  return (
    <LoadingRegion label="Loading AI settlement summary" className="space-y-4 pt-2">
      <section className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <ul className="mt-3 space-y-2">
          {[0, 1].map((item) => (
            <li key={item} className="flex gap-2">
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <SkeletonSectionHeader width="w-28" />
        <div className="divide-y rounded-lg border bg-background">
          {[0, 1].map((item) => (
            <div key={item} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 shrink-0 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <Skeleton className="h-5 w-20 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((item) => (
          <SkeletonMetricTile key={item} />
        ))}
      </section>

      <section className="rounded-lg border bg-background p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <div className="mt-5 space-y-4">
          {[0, 1].map((group) => (
            <div key={group} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              {[0, 1, 2].map((row) => (
                <div key={row} className="space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </LoadingRegion>
  );
}

function SettlementDonut({ percent }: { percent: number }) {
  const degrees = Math.max(0, Math.min(100, percent)) * 3.6;

  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${degrees}deg, hsl(var(--muted)) 0deg)`,
        }}
        aria-label={`${percent}% settled`}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-background">
          <span className="text-lg font-semibold text-foreground">{percent}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Settlement progress</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Track what has already moved against what is still open.
        </p>
      </div>
    </div>
  );
}

export default function AISummaryDialog({
  open,
  onOpenChange,
  result,
  isLoading,
  error,
}: AISummaryDialogProps) {
  const summary = result?.summary ?? null;
  const jsonData = result?.payload ?? null;
  const source: SummarySource = isLoading ? "loading" : result?.source ?? "loading";

  const metricCards = useMemo(() => buildSummaryMetricCards(jsonData), [jsonData]);
  const progress = useMemo(() => buildSettlementProgress(jsonData), [jsonData]);
  const paymentRows = useMemo(() => buildPaymentRows(jsonData), [jsonData]);
  const balanceBars = useMemo(() => buildBalanceBars(jsonData), [jsonData]);
  const categoryBars = useMemo(() => buildCategoryBars(jsonData), [jsonData]);
  const dataQualityMessages = useMemo(() => getDataQualityMessages(jsonData), [jsonData]);
  const hasDataQualityWarnings = dataQualityMessages.some(
    (message) => !message.toLowerCase().includes("no material data-quality issues"),
  );
  const activeManualOverrides = Number(jsonData?.analysis?.totals?.activeManualOverrides || 0);

  const activeModelDisplayName = result?.modelDisplayName || result?.modelName || result?.modelCode || "SettleEase AI";
  const sourceLabel = source === "loading" ? "Loading" : source === "cached" ? "Cached" : "Generated";

  const snapshotItems = useMemo(
    () => uniqueItems(summary?.settlementSnapshot, 2),
    [summary],
  );
  const nextActions = useMemo(
    () => uniqueItems(summary?.nextBestActions, 3, snapshotItems),
    [snapshotItems, summary],
  );
  const exceptionItems = useMemo(() => {
    const items = uniqueItems(summary?.manualOverridesAndExceptions, 2, [
      ...snapshotItems,
      ...nextActions,
    ]);
    return activeManualOverrides > 0 || !isNoExceptionText(items) ? items : [];
  }, [activeManualOverrides, nextActions, snapshotItems, summary]);

  const handleCopyMarkdown = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(buildCompactMarkdown({
        summary,
        metricCards,
        paymentRows,
        categoryBars,
        balanceBars,
        dataQualityMessages,
      }));
      toast({
        title: "Copied",
        description: "Summary copied as Markdown.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "The browser could not copy the summary.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader className="border-b pb-3 pr-8">
          <DialogTitle className="flex items-center gap-2 text-xl text-primary sm:text-2xl">
            <Sparkles className="h-5 w-5 shrink-0" />
            AI Settlement Summary
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1 text-left">
            <span>{activeModelDisplayName}</span>
            <Badge variant={source === "cached" ? "outline" : "secondary"} className="h-5 rounded">
              {sourceLabel}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
          {error && !summary ? (
            <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : !summary ? (
            <LoadingState />
          ) : (
            <div className="space-y-4 pt-2 sm:space-y-6">
              <section className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">What needs attention</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A concise readout for closing the current settlement.
                    </p>
                  </div>
                  <Badge variant={paymentRows.length > 0 ? "secondary" : "outline"} className="shrink-0 rounded">
                    {paymentRows.length > 0 ? `${paymentRows.length} open` : "Clear"}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-2">
                  {(snapshotItems.length > 0 ? snapshotItems : ["Not available in input data."]).map((item, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Settle next</h3>
                </div>

                {paymentRows.length === 0 ? (
                  <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                    No outstanding payments.
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border bg-background">
                    {paymentRows.map((payment, index) => (
                      <div key={`${payment.from}-${payment.to}-${index}`} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                              <span className="truncate">{payment.from}</span>
                              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{payment.to}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{payment.status}</p>
                          </div>
                          <div className="shrink-0 text-right text-base font-semibold">
                            {formatCurrency(payment.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-2 gap-2">
                {metricCards.map((metric) => (
                  <div key={metric.label} className="min-w-0 rounded-lg border bg-background p-3">
                    <p className="text-[11px] font-medium leading-snug text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 break-words text-base font-semibold leading-tight text-foreground">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="rounded-lg border bg-background p-4">
                <SettlementDonut percent={progress.percentSettled} />

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Settled</p>
                    <p className="font-semibold">{formatCurrency(progress.alreadySettled)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Remaining</p>
                    <p className="font-semibold">{formatCurrency(progress.remaining)}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold">Spending mix</h4>
                      <span className="text-xs text-muted-foreground">Top categories</span>
                    </div>
                    <div className="space-y-2">
                      {categoryBars.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Not available in input data.</p>
                      ) : (
                        categoryBars.slice(0, 4).map((category, index) => (
                          <div key={category.name} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate font-medium">{category.name}</span>
                              <span className="shrink-0 text-muted-foreground">
                                {formatCurrency(category.amount)} ({category.share}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                                style={{ width: `${Math.min(100, Math.max(0, category.share))}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold">Balance pressure</h4>
                      <span className="text-xs text-muted-foreground">Who is exposed</span>
                    </div>
                    <div className="space-y-2">
                      {balanceBars.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active balances.</p>
                      ) : (
                        balanceBars.slice(0, 4).map((row) => (
                          <div key={`${row.direction}-${row.name}`} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="truncate font-medium">{row.name}</span>
                              <span className="shrink-0 text-muted-foreground">
                                {row.direction} {formatCurrency(row.amount)}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={
                                  row.direction === "Receives"
                                    ? "h-full rounded-full bg-emerald-500"
                                    : "h-full rounded-full bg-rose-500"
                                }
                                style={{ width: `${row.width}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {(nextActions.length > 0 || exceptionItems.length > 0) && (
                <section className="rounded-lg border bg-background p-4">
                  {nextActions.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold text-foreground">Next best actions</h3>
                      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {nextActions.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ol>
                    </>
                  )}

                  {exceptionItems.length > 0 && (
                    <div className={nextActions.length > 0 ? "mt-4 border-t pt-3" : ""}>
                      <h3 className="text-sm font-semibold text-foreground">Exceptions</h3>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {exceptionItems.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              <section
                className={
                  hasDataQualityWarnings
                    ? "rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100"
                    : "rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100"
                }
              >
                <div className="mb-2 flex items-center gap-2">
                  {hasDataQualityWarnings ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <h3 className="text-sm font-semibold">Data Quality</h3>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                  {dataQualityMessages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </section>

              <Button variant="outline" onClick={handleCopyMarkdown} className="h-10 w-full gap-2">
                <Copy className="h-4 w-4" />
                Copy Markdown
              </Button>
            </div>
          )}

          {isLoading && summary && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing summary...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
