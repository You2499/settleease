"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BlobProvider, type DocumentProps } from "@react-pdf/renderer";
import {
  Calendar,
  ChevronRight,
  Download,
  EyeOff,
  FileDown,
  FileText,
  Loader2,
  Printer,
  ShieldCheck,
  Users,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FixedCalendar } from "@/components/ui/fixed-calendar";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/settleease/utils";

import {
  DATE_PRESETS,
  buildExportDateRange,
  buildGroupSummaryReportModel,
  buildPersonalStatementReportModel,
  sanitizeReportFileName,
  type DatePreset,
  type ExportExpenseTabProps,
  type ExportMode,
  type ExportReportModel,
} from "./export-tab";
import ExportPdfDocument from "./export-tab/components/ExportPdfDocument";

function getReportFileName(model: ExportReportModel): string {
  const suffix = model.kind === "group" ? "Group_Summary" : "Personal_Statement";
  return `${sanitizeReportFileName(model.title)}_${suffix}.pdf`;
}

function ModeButton({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-lg border p-4 text-left transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-muted/50"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg border",
          active ? "border-primary/30 bg-primary/10" : "border-border bg-muted/40"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className={cn("mt-1 text-xs", active ? "text-primary/80" : "text-muted-foreground")}>{description}</p>
        </div>
      </div>
    </button>
  );
}

function MetricPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-background p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PdfPreview({
  model,
  documentNode,
}: {
  model: ExportReportModel;
  documentNode: React.ReactElement<DocumentProps>;
}) {
  const fileName = getReportFileName(model);

  const handlePrint = (url: string | null) => {
    if (!url) return;
    const printWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    });
  };

  return (
    <BlobProvider document={documentNode}>
      {({ url, loading, error }) => (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">PDF output</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{fileName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                variant="outline"
                className="h-11 min-w-0 overflow-hidden rounded-lg px-3"
                disabled={loading || !url}
                onClick={() => handlePrint(url)}
              >
                {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Printer className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 truncate">Print</span>
              </Button>
              <Button asChild className={cn("h-11 min-w-0 overflow-hidden rounded-lg px-3", (loading || !url) && "pointer-events-none opacity-50")}>
                <a href={url || "#"} download={fileName}>
                  {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Download className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0 truncate">Download PDF</span>
                </a>
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              PDF generation failed. Please adjust the report filters and try again.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-white">
              {loading || !url ? (
                <div className="flex h-[420px] items-center justify-center gap-3 text-sm text-muted-foreground sm:h-[700px]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing PDF preview...
                </div>
              ) : (
                <iframe
                  src={url}
                  title="PDF Preview"
                  className="h-[420px] w-full border-0 sm:h-[700px]"
                />
              )}
            </div>
          )}
        </div>
      )}
    </BlobProvider>
  );
}

export default function ExportExpenseTab({
  expenses,
  settlementPayments,
  people,
  categories,
  manualOverrides,
  peopleMap,
}: ExportExpenseTabProps) {
  const [exportMode, setExportMode] = useState<ExportMode>("group");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id || null);
  const [reportName, setReportName] = useState("");
  const [isRedacted, setIsRedacted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("allTime");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  useEffect(() => {
    if (!selectedPersonId && people.length > 0) {
      setSelectedPersonId(people[0].id);
    }
  }, [people, selectedPersonId]);

  const handlePresetSelect = (preset: DatePreset) => {
    setSelectedPreset(preset);
    const presetConfig = DATE_PRESETS.find((item) => item.id === preset);
    const range = presetConfig?.getRange();
    setStartDate(range?.start);
    setEndDate(range?.end);
  };

  const dateRange = useMemo(
    () => buildExportDateRange(selectedPreset, startDate, endDate),
    [selectedPreset, startDate, endDate]
  );

  const isRangeReady = dateRange.isAllTime || Boolean(dateRange.startDate && dateRange.endDate);

  const reportModel = useMemo(() => {
    if (!isRangeReady) return null;

    if (exportMode === "personal") {
      return buildPersonalStatementReportModel({
        people,
        expenses,
        settlementPayments,
        manualOverrides,
        peopleMap,
        dateRange,
        reportName,
        selectedPersonId,
        redacted: isRedacted,
      });
    }

    return buildGroupSummaryReportModel({
      people,
      expenses,
      settlementPayments,
      manualOverrides,
      peopleMap,
      categories,
      dateRange,
      reportName,
    });
  }, [
    categories,
    dateRange,
    exportMode,
    expenses,
    isRangeReady,
    isRedacted,
    manualOverrides,
    people,
    peopleMap,
    reportName,
    selectedPersonId,
    settlementPayments,
  ]);

  const pdfDocument = useMemo(
    () => reportModel ? <ExportPdfDocument model={reportModel} /> : null,
    [reportModel]
  ) as React.ReactElement<DocumentProps> | null;

  const reportExpenseCount = reportModel?.kind === "group"
    ? reportModel.expenses.length
    : reportModel?.expenses.length || 0;
  const reportSettlementCount = reportModel?.settlements.length || 0;
  const remainingMetric = reportModel?.kind === "group"
    ? reportModel.metrics.find((metric) => metric.label === "Remaining")?.value || formatCurrency(0)
    : reportModel?.metrics.find((metric) => metric.label === "Net Position")?.value || formatCurrency(0);

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-lg border shadow-xl">
      <CardHeader className="border-b p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-primary">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10">
                <FileDown className="h-5 w-5" />
              </span>
              Export Report
            </CardTitle>
            <CardDescription className="mt-2 text-sm">
              Generate enterprise-grade PDF statements from settlement, expense, and payment data.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Real PDF output
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Report type</p>
              <div className="mt-3 grid gap-2">
                <ModeButton
                  active={exportMode === "group"}
                  icon={FileText}
                  title="Group Summary"
                  description="Settlement actions, balances, spending drivers"
                  onClick={() => setExportMode("group")}
                />
                <ModeButton
                  active={exportMode === "personal"}
                  icon={Users}
                  title="Personal Statement"
                  description="Participant ledger and counterparty balances"
                  onClick={() => setExportMode("personal")}
                />
              </div>
            </section>

            <section className="rounded-lg border bg-background p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                Date range
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DATE_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetSelect(preset.id)}
                      className="h-12 min-w-0 overflow-hidden rounded-lg px-2"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate text-xs">{preset.label}</span>
                    </Button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid gap-2">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-11 min-w-0 justify-start overflow-hidden rounded-lg px-3", !startDate && "text-muted-foreground")}
                      >
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{startDate ? format(startDate, "MMM d, yyyy") : "Start date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <FixedCalendar
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          setSelectedPreset("custom");
                          setStartCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <ChevronRight className="mx-auto hidden h-4 w-4 rotate-90 text-muted-foreground sm:block" />

                <div className="grid gap-2">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("h-11 min-w-0 justify-start overflow-hidden rounded-lg px-3", !endDate && "text-muted-foreground")}
                      >
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{endDate ? format(endDate, "MMM d, yyyy") : "End date"}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <FixedCalendar
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setSelectedPreset("custom");
                          setEndCalendarOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-background p-4">
              <p className="text-sm font-semibold">Report details</p>
              <div className="mt-3 space-y-3">
                <Input
                  value={reportName}
                  onChange={(event) => setReportName(event.target.value)}
                  placeholder="Optional report name"
                  className="h-11"
                />

                {exportMode === "personal" && (
                  <>
                    <div className="grid gap-2">
                      <p className="text-xs text-muted-foreground">Participant</p>
                      <div className="flex flex-wrap gap-2">
                        {people.map((person) => (
                          <Button
                            key={person.id}
                            variant={selectedPersonId === person.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedPersonId(person.id)}
                            className="h-9 min-w-0 overflow-hidden rounded-lg px-3"
                          >
                            <span className="min-w-0 truncate">{person.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant={isRedacted ? "default" : "outline"}
                      onClick={() => setIsRedacted((value) => !value)}
                      className="h-11 w-full min-w-0 overflow-hidden rounded-lg px-3"
                    >
                      <EyeOff className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{isRedacted ? "Redaction On" : "Redaction Off"}</span>
                    </Button>
                  </>
                )}
              </div>
            </section>
          </aside>

          <main className="min-w-0 space-y-4">
            {reportModel && (
              <div className="grid gap-3 sm:grid-cols-3">
                <MetricPreview label={exportMode === "group" ? "Included Expenses" : "Personal Expenses"} value={String(reportExpenseCount)} />
                <MetricPreview label="Settlement Payments" value={String(reportSettlementCount)} />
                <MetricPreview label={exportMode === "group" ? "Remaining" : "Net Position"} value={remainingMetric} />
              </div>
            )}

            {!isRangeReady ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border bg-muted/20 p-6 text-center">
                <Calendar className="h-10 w-10 text-primary/60" />
                <h3 className="mt-4 text-lg font-semibold">Select a complete date range</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Choose All Time or provide both custom dates before generating the PDF.
                </p>
              </div>
            ) : reportModel && pdfDocument ? (
              <PdfPreview model={reportModel} documentNode={pdfDocument} />
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
                Preparing report model...
              </div>
            )}
          </main>
        </div>
      </CardContent>
    </Card>
  );
}
