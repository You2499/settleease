"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  AlertTriangle,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { getAiModelOption } from "@/lib/settleease/aiModels";
import {
  STRUCTURED_SUMMARY_SECTION_ORDER,
  STRUCTURED_SUMMARY_SECTION_TITLES,
  buildSummarizeRequestPayload,
  normalizeStructuredSummary,
  parseStructuredSummaryText,
  structuredSummaryToMarkdown,
  type StructuredSettlementSummary,
  type StructuredSummarySectionKey,
} from "@/lib/settleease/aiSummarization";
import {
  buildBalanceBars,
  buildCategoryBars,
  buildPaymentRows,
  buildSettlementProgress,
  buildSummaryMetricCards,
  getDataQualityMessages,
} from "@/lib/settleease/aiSummaryViewModel";
import { formatCurrency } from "@/lib/settleease/utils";

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jsonData: any;
  hash: string;
  promptVersion?: number;
  modelCode?: string;
  currentUserId: string;
}

type SummarySource = "cached" | "generated" | "loading";

function parseCachedSummary(value: string | null | undefined): StructuredSettlementSummary | null {
  if (!value) return null;
  return parseStructuredSummaryText(value);
}

function SectionList({
  sectionKey,
  summary,
  dataQualityMessages,
}: {
  sectionKey: StructuredSummarySectionKey;
  summary: StructuredSettlementSummary;
  dataQualityMessages: string[];
}) {
  const title = STRUCTURED_SUMMARY_SECTION_TITLES[sectionKey];
  const items = sectionKey === "dataQuality" ? dataQualityMessages : summary[sectionKey];
  const ListTag =
    sectionKey === "recommendedSettlementActions" || sectionKey === "nextBestActions" ? "ol" : "ul";

  return (
    <section className="space-y-2 rounded-lg border bg-background p-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ListTag className={ListTag === "ol" ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {items.map((item, index) => (
          <li key={`${sectionKey}-${index}`} className="text-sm leading-relaxed text-muted-foreground">
            {item}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function AISummaryDialog({
  open,
  onOpenChange,
  jsonData,
  hash,
  promptVersion,
  modelCode,
  currentUserId,
}: AISummaryDialogProps) {
  const [summary, setSummary] = useState<StructuredSettlementSummary | null>(null);
  const [source, setSource] = useState<SummarySource>("loading");
  const [modelName, setModelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedHash, setLoadedHash] = useState("");

  const cachedSummary = useQuery(
    api.app.getAiSummaryByHash,
    open && hash ? { dataHash: hash } : "skip",
  ) as { summary: string; model_name?: string | null } | null | undefined;
  const storeAiSummary = useMutation(api.app.storeAiSummary);

  const metricCards = useMemo(() => buildSummaryMetricCards(jsonData), [jsonData]);
  const progress = useMemo(() => buildSettlementProgress(jsonData), [jsonData]);
  const paymentRows = useMemo(() => buildPaymentRows(jsonData), [jsonData]);
  const balanceBars = useMemo(() => buildBalanceBars(jsonData), [jsonData]);
  const categoryBars = useMemo(() => buildCategoryBars(jsonData), [jsonData]);
  const dataQualityMessages = useMemo(() => getDataQualityMessages(jsonData), [jsonData]);
  const hasDataQualityWarnings = dataQualityMessages.some(
    (message) => !message.toLowerCase().includes("no material data-quality issues"),
  );

  const activeModelDisplayName = modelName || getAiModelOption(modelCode).displayName;

  const storeSummary = useCallback(
    async (summaryData: StructuredSettlementSummary, dataHash: string, usedModelName: string) => {
      if (!currentUserId || !dataHash) return;

      try {
        await storeAiSummary({
          userId: currentUserId,
          dataHash,
          summary: JSON.stringify(summaryData),
          modelName: usedModelName || null,
        });
      } catch (storeError) {
        console.error("Error storing AI summary:", storeError);
      }
    },
    [currentUserId, storeAiSummary],
  );

  const fetchSummary = useCallback(async () => {
    if (!jsonData || !hash || isLoading) return;

    setIsLoading(true);
    setSource("loading");
    setError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildSummarizeRequestPayload(jsonData, hash, promptVersion, modelCode)),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      const structured = normalizeStructuredSummary(data.summary);
      setSummary(structured);
      setModelName(data.modelDisplayName || getAiModelOption(data.model).displayName);
      setSource("generated");
      setLoadedHash(hash);
      await storeSummary(structured, hash, data.model || "");
    } catch (summaryError: any) {
      const message = summaryError?.message || "Failed to generate summary";
      setError(message);
      setLoadedHash(hash);
      toast({
        title: "Summary unavailable",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hash, isLoading, jsonData, modelCode, promptVersion, storeSummary]);

  useEffect(() => {
    if (!open) {
      setSummary(null);
      setSource("loading");
      setModelName("");
      setError(null);
      setLoadedHash("");
      setIsLoading(false);
      return;
    }

    if (!hash || !jsonData || loadedHash === hash || isLoading || cachedSummary === undefined) {
      return;
    }

    const cached = parseCachedSummary(cachedSummary?.summary);
    if (cached) {
      setSummary(cached);
      setSource("cached");
      setModelName(cachedSummary?.model_name ? getAiModelOption(cachedSummary.model_name).displayName : "");
      setLoadedHash(hash);
      return;
    }

    fetchSummary();
  }, [cachedSummary, fetchSummary, hash, isLoading, jsonData, loadedHash, open]);

  const handleCopyMarkdown = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(structuredSummaryToMarkdown(summary));
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
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-6xl overflow-hidden p-0" hideCloseButton={false}>
        <div className="flex max-h-[92vh] flex-col">
          <DialogHeader className="border-b px-4 py-4 pr-14 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Settlement Summary
                </DialogTitle>
                <DialogDescription>
                  {activeModelDisplayName}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={source === "cached" ? "outline" : "secondary"}>
                  {source === "loading" ? "Loading" : source === "cached" ? "Cached" : "Generated"}
                </Badge>
                {summary && (
                  <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copy Markdown
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {error && !summary ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : !summary ? (
              <LoadingState />
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {metricCards.map((metric) => (
                    <div key={metric.label} className="rounded-lg border bg-background p-3">
                      <div className="text-xs font-medium text-muted-foreground">{metric.label}</div>
                      <div className="mt-1 text-xl font-semibold text-foreground">{metric.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                  <div className="space-y-4">
                    <section className="rounded-lg border bg-background p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">Settlement Progress</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(progress.alreadySettled)} settled of {formatCurrency(progress.totalSettlement)}
                          </p>
                        </div>
                        <Badge variant="outline">{progress.percentSettled}% settled</Badge>
                      </div>
                      <Progress value={progress.percentSettled} className="h-2" />
                      <div className="mt-3 text-xs text-muted-foreground">
                        Remaining: {formatCurrency(progress.remaining)}
                      </div>
                    </section>

                    <section className="rounded-lg border bg-background p-4">
                      <h3 className="mb-3 text-sm font-semibold">Balance Pressure</h3>
                      <div className="space-y-3">
                        {balanceBars.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No active balances.</p>
                        ) : (
                          balanceBars.map((row) => (
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
                    </section>

                    <section className="rounded-lg border bg-background p-4">
                      <h3 className="mb-3 text-sm font-semibold">Spending Mix</h3>
                      <div className="space-y-3">
                        {categoryBars.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Not available in input data.</p>
                        ) : (
                          categoryBars.map((category) => (
                            <div key={category.name} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate font-medium">{category.name}</span>
                                <span className="shrink-0 text-muted-foreground">
                                  {formatCurrency(category.amount)} ({category.share}%)
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${Math.min(100, Math.max(0, category.share))}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-lg border bg-background p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <ReceiptText className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Payment Actions</h3>
                      </div>
                      {paymentRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No outstanding payments.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Payer</TableHead>
                              <TableHead>Receiver</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentRows.map((payment, index) => (
                              <TableRow key={`${payment.from}-${payment.to}-${index}`}>
                                <TableCell className="font-medium">{payment.from}</TableCell>
                                <TableCell>{payment.to}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payment.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </section>

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
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        {dataQualityMessages.map((message, index) => (
                          <li key={index}>{message}</li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {STRUCTURED_SUMMARY_SECTION_ORDER.map((sectionKey) => (
                    <SectionList
                      key={sectionKey}
                      sectionKey={sectionKey}
                      summary={summary}
                      dataQualityMessages={dataQualityMessages}
                    />
                  ))}
                </div>
              </div>
            )}

            {isLoading && summary && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing summary...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
