"use client";

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Calculator,
  ChevronDown,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useUsageAnalytics } from "@/hooks/useUsageAnalytics";
import {
  BUDGET_ITEM_TAX_RATE,
  getBudgetAlcoholVatRate,
  type BudgetVatInputItem,
} from "@/lib/settleease/budgetVat";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  BudgetDraft,
  BudgetFees,
  BudgetItem,
  BudgetVatClassification,
  Category,
  SelectedBudgetLine,
  UserRole,
} from "@/lib/settleease/types";
import SettleEaseDialog, {
  SettleEaseModalHeader,
} from "./SettleEaseDialog";

const ALL_CATEGORIES_VALUE = "__all__";
const UNCATEGORIZED_CATEGORY = "Uncategorized";

interface CreateBudgetModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  getCategoryIconFromName: (
    categoryName: string
  ) => React.FC<React.SVGProps<SVGSVGElement>>;
  userRole: UserRole;
}

function toNonNegativeNumber(value: string) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function makeCustomLineId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type BudgetEstimateTotals = {
  subtotal: number;
  taxableSubtotal: number;
  alcoholSubtotal: number;
  taxAmount: number;
  alcoholVatAmount: number;
  otherCharge: number;
  discount: number;
  finalTotal: number;
};

type EstimateReceiptLine = {
  name: string;
  quantity: string;
  amount: string;
};

type EstimateReceiptSection = {
  title: string;
  lines: EstimateReceiptLine[];
  totalLabel: string;
  totalValue: string;
};

type EstimateReceiptModel = {
  sections: EstimateReceiptSection[];
  subtotal: string;
  taxTotal: string;
  vatTotal: string;
  otherCharge: string | null;
  discount: string | null;
  grandTotal: string;
  isTaxCalculationCurrent: boolean;
};

function formatCopyCell(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function formatCopyAmount(value: number) {
  return formatCurrency(roundMoney(value));
}

function toReceiptLine(line: SelectedBudgetLine): EstimateReceiptLine {
  return {
    name: formatCopyCell(line.name),
    quantity: String(line.quantity),
    amount: formatCopyAmount(line.unit_price * line.quantity),
  };
}

function buildEstimateReceiptModel({
  selectedLines,
  isTaxCalculationCurrent,
  getLineVatClassification,
  totals,
}: {
  selectedLines: SelectedBudgetLine[];
  isTaxCalculationCurrent: boolean;
  getLineVatClassification: (
    line: SelectedBudgetLine
  ) => BudgetVatClassification | null;
  totals: BudgetEstimateTotals;
}): EstimateReceiptModel {
  const foodLines: EstimateReceiptLine[] = [];
  const alcoholLines: EstimateReceiptLine[] = [];

  selectedLines.forEach((line) => {
    const classification = isTaxCalculationCurrent
      ? getLineVatClassification(line)
      : null;

    if (classification?.vat_class === "alcohol") {
      alcoholLines.push(toReceiptLine(line));
    } else {
      foodLines.push(toReceiptLine(line));
    }
  });

  const taxTotal = isTaxCalculationCurrent
    ? formatCurrency(totals.taxAmount)
    : "Pending";
  const vatTotal = isTaxCalculationCurrent
    ? formatCurrency(totals.alcoholVatAmount)
    : "Pending";
  const grandTotal = isTaxCalculationCurrent
    ? formatCurrency(totals.finalTotal)
    : "Pending";

  return {
    sections: [
      {
        title: "Food",
        lines: foodLines,
        totalLabel: "Total Tax",
        totalValue: taxTotal,
      },
      {
        title: "ALCOHOL",
        lines: alcoholLines,
        totalLabel: "Total VAT",
        totalValue: vatTotal,
      },
    ],
    subtotal: formatCurrency(totals.subtotal),
    taxTotal,
    vatTotal,
    otherCharge:
      totals.otherCharge > 0 ? formatCurrency(totals.otherCharge) : null,
    discount:
      totals.discount > 0 ? `-${formatCurrency(totals.discount)}` : null,
    grandTotal,
    isTaxCalculationCurrent,
  };
}

function appendEstimateCopySection(rows: string[], section: EstimateReceiptSection) {
  rows.push(section.title);

  if (section.lines.length === 0) {
    rows.push(`No items\t-\t${formatCurrency(0)}`);
  } else {
    section.lines.forEach((line) => {
      rows.push(`${line.name}\t${line.quantity}\t${line.amount}`);
    });
  }

  rows.push(`${section.totalLabel}\t\t${section.totalValue}`);
}

function buildEstimateCopyText(model: EstimateReceiptModel) {
  const rows = ["Bill Estimate", "", "Item Name\tQTY\tAMOUNT", ""];

  appendEstimateCopySection(rows, model.sections[0]);
  rows.push("");
  appendEstimateCopySection(rows, model.sections[1]);

  rows.push("", `Total Tax\t${model.taxTotal}`, `Total VAT\t${model.vatTotal}`);

  if (model.otherCharge) {
    rows.push(`Other Charge\t${model.otherCharge}`);
  }

  if (model.discount) {
    rows.push(`Discount\t${model.discount}`);
  }

  rows.push(`GRAND TOTAL\t${model.grandTotal}`);

  return rows.join("\n");
}

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function wrapReceiptText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
      return;
    }

    let chunk = "";
    Array.from(word).forEach((character) => {
      const nextChunk = `${chunk}${character}`;
      if (chunk && ctx.measureText(nextChunk).width > maxWidth) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk = nextChunk;
      }
    });
    currentLine = chunk;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not render receipt image."));
      }
    }, "image/png");
  });
}

function loadReceiptLogo() {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/icon.svg";
  });
}

async function buildEstimateReceiptImage(model: EstimateReceiptModel) {
  const baseWidth = 760;
  const scale = 2;
  const paperX = 30;
  const paperY = 30;
  const contentPadding = 34;
  const scratchCanvas = document.createElement("canvas");
  const scratch = scratchCanvas.getContext("2d");

  if (!scratch) {
    throw new Error("Could not render receipt image.");
  }

  scratch.font = "400 20px ui-sans-serif, system-ui, sans-serif";
  const basePaperWidth = baseWidth - paperX * 2;
  const baseContentX = paperX + contentPadding;
  const baseContentWidth = basePaperWidth - contentPadding * 2;
  const baseQtyX = baseContentX + 430;
  const baseNameWidth = baseQtyX - baseContentX - 18;
  const sectionMetrics = model.sections.map((section) => ({
    section,
    lineHeights:
      section.lines.length > 0
        ? section.lines.map((line) => {
            const wrapped = wrapReceiptText(scratch, line.name, baseNameWidth);
            return Math.max(38, wrapped.length * 22 + 14);
          })
        : [38],
  }));
  const tableHeight = sectionMetrics.reduce((sum, sectionMetric) => {
    return (
      sum +
      42 +
      sectionMetric.lineHeights.reduce((lineSum, height) => lineSum + height, 0) +
      42 +
      14
    );
  }, 0);
  const summaryRowCount =
    3 + (model.otherCharge ? 1 : 0) + (model.discount ? 1 : 0);
  const pendingNoteHeight = model.isTaxCalculationCurrent ? 0 : 42;
  const requiredHeight =
    paperY * 2 +
    150 +
    42 +
    tableHeight +
    summaryRowCount * 34 +
    74 +
    pendingNoteHeight +
    44;
  const height = Math.max(
    Math.round((baseWidth * 5) / 4),
    Math.ceil(requiredHeight / 5) * 5
  );
  const width = Math.round((height * 4) / 5);
  const paperWidth = width - paperX * 2;
  const contentX = paperX + contentPadding;
  const contentWidth = paperWidth - contentPadding * 2;
  const qtyX = contentX + Math.min(430, Math.round(contentWidth * 0.68));
  const amountRightX = contentX + contentWidth;
  const nameWidth = qtyX - contentX - 18;
  const logo = await loadReceiptLogo();
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not render receipt image.");
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = "#eef7f3";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = "rgba(18, 38, 33, 0.16)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  drawRoundRect(ctx, paperX, paperY, paperWidth, height - paperY * 2, 14);
  ctx.fillStyle = "#fffdf8";
  ctx.fill();
  ctx.restore();

  drawRoundRect(ctx, paperX, paperY, paperWidth, height - paperY * 2, 14);
  ctx.strokeStyle = "#d8e5dd";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "#cad9d2";
  ctx.beginPath();
  ctx.moveTo(contentX, paperY + 24);
  ctx.lineTo(amountRightX, paperY + 24);
  ctx.moveTo(contentX, height - paperY - 24);
  ctx.lineTo(amountRightX, height - paperY - 24);
  ctx.stroke();
  ctx.setLineDash([]);

  let y = paperY + 60;
  drawRoundRect(ctx, contentX, y, 50, 50, 12);
  ctx.fillStyle = "#ecfdf7";
  ctx.fill();
  ctx.strokeStyle = "#b8ead8";
  ctx.lineWidth = 1;
  ctx.stroke();
  if (logo) {
    ctx.drawImage(logo, contentX + 8, y + 8, 34, 34);
  } else {
    ctx.fillStyle = "#0f8f71";
    ctx.font = "800 18px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SE", contentX + 25, y + 25);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#172621";
  ctx.font = "800 28px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("SettleEase", contentX + 64, y + 21);
  ctx.fillStyle = "#66756e";
  ctx.font = "500 14px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Bill estimate receipt", contentX + 64, y + 44);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0f8f71";
  ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("RECEIPT", amountRightX, y + 18);
  ctx.fillStyle = "#66756e";
  ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(new Date().toLocaleString(), amountRightX, y + 41);

  y += 92;
  ctx.strokeStyle = "#e0ebe5";
  ctx.beginPath();
  ctx.moveTo(contentX, y);
  ctx.lineTo(amountRightX, y);
  ctx.stroke();

  y += 34;
  ctx.fillStyle = "#6b7972";
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "left";
  ctx.fillText("ITEM NAME", contentX, y);
  ctx.textAlign = "center";
  ctx.fillText("QTY", qtyX + 18, y);
  ctx.textAlign = "right";
  ctx.fillText("AMOUNT", amountRightX, y);

  y += 18;
  sectionMetrics.forEach(({ section, lineHeights }) => {
    y += 18;
    ctx.fillStyle = section.title === "ALCOHOL" ? "#fff5df" : "#e9f7f1";
    drawRoundRect(ctx, contentX - 10, y - 22, contentWidth + 20, 30, 8);
    ctx.fill();
    ctx.fillStyle = section.title === "ALCOHOL" ? "#8a5a00" : "#0f765f";
    ctx.font = "800 14px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(section.title, contentX, y);

    y += 24;
    const lines =
      section.lines.length > 0
        ? section.lines
        : [{ name: "No items", quantity: "-", amount: formatCurrency(0) }];

    lines.forEach((line, index) => {
      const rowHeight = lineHeights[index] ?? 38;
      ctx.font = "500 20px ui-sans-serif, system-ui, sans-serif";
      const wrappedName = wrapReceiptText(ctx, line.name, nameWidth);
      const rowTop = y - 11;

      ctx.fillStyle = index % 2 === 0 ? "#fbfaf5" : "#ffffff";
      drawRoundRect(ctx, contentX - 10, rowTop, contentWidth + 20, rowHeight, 7);
      ctx.fill();

      ctx.fillStyle = "#20312b";
      ctx.textAlign = "left";
      wrappedName.forEach((nameLine, lineIndex) => {
        ctx.fillText(nameLine, contentX, y + lineIndex * 22 + 13);
      });

      ctx.fillStyle = "#53645c";
      ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(line.quantity, qtyX + 18, y + 13);
      ctx.textAlign = "right";
      ctx.fillText(line.amount, amountRightX, y + 13);
      y += rowHeight;
    });

    y += 12;
    ctx.strokeStyle = "#e3eee8";
    ctx.beginPath();
    ctx.moveTo(contentX, y);
    ctx.lineTo(amountRightX, y);
    ctx.stroke();
    y += 28;
    ctx.fillStyle = "#4d5d56";
    ctx.font = "700 16px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(section.totalLabel, contentX, y);
    ctx.textAlign = "right";
    ctx.fillText(section.totalValue, amountRightX, y);
    y += 14;
  });

  y += 20;
  const summaryRows: Array<[string, string]> = [
    ["Subtotal", model.subtotal],
    ["Total Tax", model.taxTotal],
    ["Total VAT", model.vatTotal],
  ];
  if (model.otherCharge) summaryRows.push(["Other Charge", model.otherCharge]);
  if (model.discount) summaryRows.push(["Discount", model.discount]);

  summaryRows.forEach(([label, value]) => {
    ctx.fillStyle = "#66756e";
    ctx.font = "600 17px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(label, contentX, y);
    ctx.fillStyle = "#20312b";
    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "right";
    ctx.fillText(value, amountRightX, y);
    y += 34;
  });

  y += 8;
  ctx.fillStyle = "#0f8f71";
  drawRoundRect(ctx, contentX - 12, y - 26, contentWidth + 24, 58, 10);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 17px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("GRAND TOTAL", contentX, y + 8);
  ctx.font = "900 28px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(model.grandTotal, amountRightX, y + 10);
  y += 72;

  if (!model.isTaxCalculationCurrent) {
    ctx.fillStyle = "#8a5a00";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "Tax and VAT are pending. Run Calculate Taxes for final amounts.",
      width / 2,
      y
    );
    y += 36;
  }

  return canvasToPngBlob(canvas);
}

async function writeReceiptImageToClipboard(model: EstimateReceiptModel) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("Image clipboard is not supported in this browser.");
  }

  const blob = await buildEstimateReceiptImage(model);
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

function toSavedBudgetLines(lines: SelectedBudgetLine[]) {
  return lines.map((line) => ({
    id: line.id,
    budgetItemId: line.budget_item_id,
    name: line.name,
    categoryName: line.category_name,
    unitPrice: line.unit_price,
    quantity: line.quantity,
    source: line.source,
  }));
}

function toSavedVatClassifications(
  classifications: Record<string, BudgetVatClassification>
) {
  return Object.values(classifications).map((classification) => ({
    key: classification.key,
    vatClass: classification.vat_class,
    confidence: classification.confidence,
    rationale: classification.rationale,
    source: classification.source,
  }));
}

export default function CreateBudgetModal({
  isOpen,
  onOpenChange,
  categories,
  getCategoryIconFromName,
  userRole,
}: CreateBudgetModalProps) {
  const usageAnalytics = useUsageAnalytics({ surface: "dashboard" });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [selectedLines, setSelectedLines] = useState<SelectedBudgetLine[]>([]);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCategory, setCustomCategory] = useState(UNCATEGORIZED_CATEGORY);
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [vatClassifications, setVatClassifications] = useState<
    Record<string, BudgetVatClassification>
  >({});
  const [vatStatus, setVatStatus] = useState<
    "idle" | "loading" | "ai" | "error"
  >("idle");
  const [vatModelName, setVatModelName] = useState("");
  const [vatClassifiedSignature, setVatClassifiedSignature] = useState("");
  const [fees, setFees] = useState<BudgetFees>({
    other_charge: "",
    discount: "",
  });
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [isCopyOptionsOpen, setIsCopyOptionsOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<"text" | "image" | null>(null);

  const isAdmin = userRole === "admin";
  const categoryOptions = useMemo(() => {
    const names = categories.map((category) => category.name);
    if (!names.includes(UNCATEGORIZED_CATEGORY)) {
      names.push(UNCATEGORIZED_CATEGORY);
    }
    return names;
  }, [categories]);

  useEffect(() => {
    if (isOpen && !categoryOptions.includes(customCategory)) {
      setCustomCategory(categoryOptions[0] ?? UNCATEGORIZED_CATEGORY);
    }
  }, [categoryOptions, customCategory, isOpen]);

  useEffect(() => {
    if (!isAdmin && saveCustomToCatalog) {
      setSaveCustomToCatalog(false);
    }
  }, [isAdmin, saveCustomToCatalog]);

  const budgetItems = useQuery(
    api.app.listBudgetItems,
    isOpen
      ? {
          search: deferredSearch.trim(),
          categoryName:
            categoryFilter === ALL_CATEGORIES_VALUE ? null : categoryFilter,
          limit: 80,
        }
      : "skip"
  ) as BudgetItem[] | undefined;
  const budgetDraft = useQuery(
    api.app.getBudgetDraft,
    isOpen ? {} : "skip"
  ) as BudgetDraft | null | undefined;
  const isBudgetDraftLoaded = budgetDraft !== undefined;
  const upsertCustomBudgetItem = useMutation(api.app.upsertCustomBudgetItem);
  const backfillBudgetItemsFromExpenses = useMutation(
    api.app.backfillBudgetItemsFromExpenses
  );
  const saveBudgetDraft = useMutation(api.app.saveBudgetDraft);
  const clearSavedBudgetDraft = useMutation(api.app.clearBudgetDraft);

  useEffect(() => {
    if (!isOpen) {
      setIsDraftHydrated(false);
      return;
    }

    if (budgetDraft === undefined || isDraftHydrated) {
      return;
    }

    setSelectedLines(budgetDraft?.selected_lines ?? []);
    setFees(
      budgetDraft?.fees ?? {
        other_charge: "",
        discount: "",
      }
    );
    setVatClassifications(budgetDraft?.vat_classifications ?? {});
    setVatStatus(
      budgetDraft?.vat_status === "loading"
        ? "idle"
        : budgetDraft?.vat_status ?? "idle"
    );
    setVatModelName(budgetDraft?.vat_model_name ?? "");
    setVatClassifiedSignature(
      budgetDraft?.vat_classified_signature ?? ""
    );
    setIsDraftHydrated(true);
  }, [budgetDraft, isDraftHydrated, isOpen]);

  const vatInputItems = useMemo<BudgetVatInputItem[]>(() => {
    return selectedLines.map((line) => ({
      key: line.id,
      name: line.name,
      categoryName: line.category_name,
    }));
  }, [selectedLines]);

  const vatInputSignature = useMemo(
    () => JSON.stringify(vatInputItems),
    [vatInputItems]
  );

  useEffect(() => {
    if (!isOpen || (isDraftHydrated && selectedLines.length === 0)) {
      setVatClassifications({});
      setVatStatus("idle");
      setVatModelName("");
      setVatClassifiedSignature("");
    }
  }, [isDraftHydrated, isOpen, selectedLines.length]);

  const isTaxCalculationCurrent =
    selectedLines.length > 0 &&
    vatStatus === "ai" &&
    vatClassifiedSignature === vatInputSignature;

  const needsTaxCalculation =
    selectedLines.length > 0 && !isTaxCalculationCurrent;

  useEffect(() => {
    if (!isOpen || !isDraftHydrated || !isBudgetDraftLoaded) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      if (selectedLines.length === 0) {
        void clearSavedBudgetDraft().catch((error) => {
          console.warn("Budget draft clear failed:", error);
        });
        return;
      }

      void saveBudgetDraft({
        selectedLines: toSavedBudgetLines(selectedLines),
        fees: {
          otherCharge: fees.other_charge,
          discount: fees.discount,
        },
        vatClassifications: toSavedVatClassifications(vatClassifications),
        vatStatus,
        vatModelName,
        vatClassifiedSignature,
      }).catch((error) => {
        console.warn("Budget draft save failed:", error);
      });
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [
    clearSavedBudgetDraft,
    fees.discount,
    fees.other_charge,
    isBudgetDraftLoaded,
    isDraftHydrated,
    isOpen,
    saveBudgetDraft,
    selectedLines,
    vatClassifications,
    vatClassifiedSignature,
    vatModelName,
    vatStatus,
  ]);

  const getLineVatClassification = useCallback(
    (line: SelectedBudgetLine) => vatClassifications[line.id] ?? null,
    [vatClassifications]
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let taxableSubtotal = 0;
    let alcoholSubtotal = 0;
    let alcoholVatAmount = 0;

    selectedLines.forEach((line) => {
      const lineTotal = line.unit_price * line.quantity;
      subtotal += lineTotal;

      if (!isTaxCalculationCurrent) {
        return;
      }

      const classification = getLineVatClassification(line);
      if (!classification) {
        return;
      }

      const vatAmount =
        lineTotal * getBudgetAlcoholVatRate(classification.vat_class);

      if (classification.vat_class === "alcohol") {
        alcoholSubtotal += lineTotal;
        alcoholVatAmount += vatAmount;
      } else {
        taxableSubtotal += lineTotal;
      }
    });

    subtotal = roundMoney(subtotal);
    taxableSubtotal = roundMoney(taxableSubtotal);
    alcoholSubtotal = roundMoney(alcoholSubtotal);
    const taxAmount = roundMoney(taxableSubtotal * BUDGET_ITEM_TAX_RATE);
    alcoholVatAmount = roundMoney(alcoholVatAmount);
    const otherCharge = roundMoney(toNonNegativeNumber(fees.other_charge));
    const discount = roundMoney(toNonNegativeNumber(fees.discount));
    const finalTotal = roundMoney(
      Math.max(
        0,
        subtotal + taxAmount + alcoholVatAmount + otherCharge - discount
      )
    );

    return {
      subtotal,
      taxableSubtotal,
      alcoholSubtotal,
      taxAmount,
      alcoholVatAmount,
      otherCharge,
      discount,
      finalTotal,
    };
  }, [fees, getLineVatClassification, isTaxCalculationCurrent, selectedLines]);

  const estimateReceiptModel = useMemo(
    () =>
      buildEstimateReceiptModel({
        selectedLines,
        isTaxCalculationCurrent,
        getLineVatClassification,
        totals,
      }),
    [getLineVatClassification, isTaxCalculationCurrent, selectedLines, totals]
  );
  const estimateCopyText = useMemo(
    () => buildEstimateCopyText(estimateReceiptModel),
    [estimateReceiptModel]
  );

  const taxStatusLabel =
    selectedLines.length === 0
      ? "Add items"
      : vatStatus === "loading"
      ? "AI calculating"
      : isTaxCalculationCurrent
      ? vatModelName || "AI taxes ready"
      : vatStatus === "error"
      ? "AI failed"
      : vatStatus === "ai"
      ? "Needs recalculation"
      : "Calculate taxes";

  const calculateTaxesButtonLabel =
    vatStatus === "loading"
      ? "Calculating"
      : isTaxCalculationCurrent
      ? "Recalculate Taxes"
      : "Calculate Taxes";

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find((entry) => entry.name === categoryName);
    return getCategoryIconFromName(category?.icon_name || "") || Settings2;
  };

  const addCatalogItem = (item: BudgetItem) => {
    setSelectedLines((current) => {
      const existingLine = current.find((line) => line.budget_item_id === item.id);
      if (existingLine) {
        return current.map((line) =>
          line.id === existingLine.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }

      return [
        ...current,
        {
          id: `catalog-${item.id}`,
          budget_item_id: item.id,
          name: item.name,
          category_name: item.category_name,
          unit_price: Number(item.default_price),
          quantity: 1,
          source: "catalog",
        },
      ];
    });
  };

  const updateLineQuantity = (lineId: string, delta: number) => {
    setSelectedLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? { ...line, quantity: Math.max(1, line.quantity + delta) }
          : line
      )
    );
  };

  const removeLine = (lineId: string) => {
    setSelectedLines((current) => current.filter((line) => line.id !== lineId));
  };

  const clearEstimate = () => {
    setSelectedLines([]);
    setFees({
      other_charge: "",
      discount: "",
    });
    setVatClassifications({});
    setVatStatus("idle");
    setVatModelName("");
    setVatClassifiedSignature("");
    void clearSavedBudgetDraft().catch((error) => {
      console.warn("Budget draft clear failed:", error);
    });
  };

  const handleFeeChange = (field: keyof BudgetFees, value: string) => {
    setFees((current) => ({ ...current, [field]: value }));
  };

  const handleCopyEstimateText = useCallback(async () => {
    if (selectedLines.length === 0) {
      toast({
        title: "Add items first",
        description: "Select at least one item before copying the estimate.",
        variant: "destructive",
      });
      return;
    }

    setCopyMode("text");
    try {
      await writeClipboardText(estimateCopyText);
      setIsCopyOptionsOpen(false);
      toast({
        title: "Estimate copied",
        description: needsTaxCalculation
          ? "Copied with pending Tax and VAT. Run Calculate Taxes to include final amounts."
          : "Food, alcohol, Tax, VAT, and grand total are on your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "The browser could not copy the estimate.",
        variant: "destructive",
      });
    } finally {
      setCopyMode(null);
    }
  }, [estimateCopyText, needsTaxCalculation, selectedLines.length]);

  const handleCopyEstimateImage = useCallback(async () => {
    if (selectedLines.length === 0) {
      toast({
        title: "Add items first",
        description: "Select at least one item before copying the receipt image.",
        variant: "destructive",
      });
      return;
    }

    setCopyMode("image");
    try {
      await writeReceiptImageToClipboard(estimateReceiptModel);
      setIsCopyOptionsOpen(false);
      toast({
        title: "Receipt image copied",
        description: needsTaxCalculation
          ? "Copied as an image with pending Tax and VAT."
          : "The branded receipt image is on your clipboard.",
      });
    } catch (error: any) {
      toast({
        title: "Image copy failed",
        description:
          error?.message || "The browser could not copy the receipt image.",
        variant: "destructive",
      });
    } finally {
      setCopyMode(null);
    }
  }, [estimateReceiptModel, needsTaxCalculation, selectedLines.length]);

  const handleCalculateTaxes = useCallback(async () => {
    if (selectedLines.length === 0) {
      toast({
        title: "Add items first",
        description: "Select at least one item before calculating taxes.",
        variant: "destructive",
      });
      return;
    }

    const currentSignature = vatInputSignature;
    const currentItems = vatInputItems;
    const finishTimer = usageAnalytics.startTimer();

    setVatStatus("loading");
    setVatModelName("");
    setVatClassifiedSignature("");

    try {
      const response = await fetch("/api/classify-budget-vat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: currentItems }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "AI tax calculation failed.");
      }

      const rows = Array.isArray(data.classifications)
        ? (data.classifications as BudgetVatClassification[])
        : [];
      const expectedKeys = new Set(currentItems.map((item) => item.key));
      const classifiedKeys = new Set(rows.map((row) => row.key));
      const hasEveryItem = currentItems.every((item) =>
        classifiedKeys.has(item.key)
      );

      if (rows.length !== expectedKeys.size || !hasEveryItem) {
        throw new Error("AI did not classify every selected item.");
      }

      setVatClassifications(
        Object.fromEntries(rows.map((row) => [row.key, row]))
      );
      setVatStatus("ai");
      setVatClassifiedSignature(currentSignature);
      setVatModelName(data.modelDisplayName || "");
      finishTimer({
        eventName: "budget.vat_classification_generated",
        surface: "dashboard",
        metadata: {
          itemCount: rows.length,
          aiModelName: data.modelName || data.modelDisplayName || undefined,
        },
      });
    } catch (error: any) {
      console.warn("Budget tax calculation failed:", error);
      setVatClassifications({});
      setVatStatus("error");
      setVatModelName("");
      setVatClassifiedSignature("");
      finishTimer({
        eventName: "budget.vat_classification_failed",
        surface: "dashboard",
        status: "failure",
        metadata: { itemCount: currentItems.length },
      });
      toast({
        title: "Tax calculation failed",
        description:
          error?.message || "AI could not calculate tax and VAT for this estimate.",
        variant: "destructive",
      });
    }
  }, [selectedLines.length, usageAnalytics, vatInputItems, vatInputSignature]);

  const handleAddCustomItem = async () => {
    const name = customName.trim().replace(/\s+/g, " ");
    const price = toNonNegativeNumber(customPrice);

    if (!name || price <= 0) {
      toast({
        title: "Custom item needs details",
        description: "Add a name and a positive price.",
        variant: "destructive",
      });
      return;
    }

    let savedItem: BudgetItem | null = null;
    if (isAdmin && saveCustomToCatalog) {
      setIsSavingCustom(true);
      try {
        savedItem = (await upsertCustomBudgetItem({
          name,
          categoryName: customCategory,
          price,
        })) as BudgetItem;
        toast({
          title: "Budget item saved",
          description: `${name} is available in the catalog.`,
        });
      } catch (error: any) {
        toast({
          title: "Save failed",
          description: error?.message || "Could not save the budget item.",
          variant: "destructive",
        });
        setIsSavingCustom(false);
        return;
      }
      setIsSavingCustom(false);
    }

    setSelectedLines((current) => {
      if (savedItem) {
        const existingLine = current.find(
          (line) => line.budget_item_id === savedItem.id
        );
        if (existingLine) {
          return current.map((line) =>
            line.id === existingLine.id
              ? { ...line, quantity: line.quantity + 1 }
              : line
          );
        }
      }

      return [
        ...current,
        {
          id: savedItem ? `catalog-${savedItem.id}` : makeCustomLineId(),
          budget_item_id: savedItem?.id,
          name,
          category_name: customCategory,
          unit_price: price,
          quantity: 1,
          source: savedItem ? "catalog" : "custom",
        },
      ];
    });
    setCustomName("");
    setCustomPrice("");
  };

  const handleSyncExistingPrices = async () => {
    if (!isAdmin || isBackfilling) return;

    setIsBackfilling(true);
    try {
      const result = (await backfillBudgetItemsFromExpenses({
        dryRun: false,
      })) as {
        validObservationCount: number;
        rowsToInsert: number;
        rowsToUpdate: number;
      };
      toast({
        title: "Budget catalog synced",
        description: `${result.validObservationCount} item prices merged into ${result.rowsToInsert + result.rowsToUpdate} catalog rows.`,
      });
    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error?.message || "Could not sync existing item prices.",
        variant: "destructive",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const renderCatalogItem = (item: BudgetItem) => {
    const CategoryIcon = getCategoryIcon(item.category_name);
    const observationCount =
      item.historical_observation_count + item.custom_observation_count;
    const hasRange = Math.abs(item.max_price - item.min_price) > 0.009;

    return (
      <div
        key={item.id}
        className="min-w-0 rounded-md border bg-background p-3 shadow-sm"
      >
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p
                className="min-w-0 break-words text-sm font-semibold leading-snug sm:truncate"
                title={item.name}
              >
                {item.name}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-md">
                {item.category_name}
              </Badge>
              <span>{observationCount} seen</span>
              <span className="min-w-0 break-words">
                Latest {formatCurrency(item.latest_price)}
              </span>
              {hasRange && (
                <span className="min-w-0 break-words">
                  {formatCurrency(item.min_price)}-{formatCurrency(item.max_price)}
                </span>
              )}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:block lg:shrink-0 lg:text-right">
            <p className="min-w-0 break-words text-base font-bold text-primary lg:max-w-40">
              {formatCurrency(item.default_price)}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-md px-2 text-xs lg:mt-2"
              onClick={() => addCatalogItem(item)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCatalogSkeletonRows = () => (
    <div
      className="min-w-0 space-y-2"
      role="status"
      aria-label="Loading item catalog"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="min-w-0 rounded-md border bg-background p-3 shadow-sm"
        >
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <Skeleton className="h-4 w-3/4 max-w-[260px]" />
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:block lg:shrink-0 lg:text-right">
              <Skeleton className="h-5 w-20 lg:ml-auto" />
              <Skeleton className="h-8 w-14 rounded-md lg:ml-auto lg:mt-2" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading catalog items</span>
    </div>
  );

  return (
    <SettleEaseDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      className="h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] lg:h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-2rem)] lg:max-w-[1400px] xl:max-w-[1500px]"
    >
        <div className="flex h-full min-h-0 flex-col">
          <SettleEaseModalHeader
            icon={Calculator}
            title="Create Your Budget"
            description="Build a rough bill estimate from catalog items, fees, tax, and VAT."
          />

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5 lg:overflow-hidden">
            <div className="grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] xl:grid-cols-[minmax(0,1fr)_minmax(430px,520px)]">
              <div className="min-w-0 space-y-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto] lg:space-y-0 lg:gap-4">
                <Card className="min-w-0 overflow-hidden lg:flex lg:min-h-0 lg:flex-col">
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="flex min-w-0 items-center text-lg font-semibold tracking-normal sm:text-xl">
                        <ReceiptText className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 truncate">Item Catalog</span>
                      </CardTitle>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-full rounded-md px-2 text-xs sm:w-auto"
                          onClick={handleSyncExistingPrices}
                          disabled={isBackfilling}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {isBackfilling ? "Syncing" : "Sync Prices"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative min-w-0">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search items"
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger className="h-10 min-w-0">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_CATEGORIES_VALUE}>
                            All categories
                          </SelectItem>
                          {categoryOptions.map((categoryName) => (
                            <SelectItem key={categoryName} value={categoryName}>
                              {categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-72 min-w-0 rounded-md border bg-muted/20 p-2 sm:h-80 md:h-96 lg:h-auto lg:min-h-0 lg:flex-1">
                      <div className="min-w-0 space-y-2 pr-1 sm:pr-2">
                        {budgetItems === undefined && renderCatalogSkeletonRows()}
                        {budgetItems &&
                          budgetItems.length > 0 &&
                          budgetItems.map(renderCatalogItem)}
                        {budgetItems && budgetItems.length === 0 && (
                          <div className="flex h-40 items-center justify-center rounded-md bg-background text-center text-sm text-muted-foreground">
                            No catalog items found.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex min-w-0 items-center text-lg font-semibold tracking-normal sm:text-xl">
                      <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 truncate">Custom Item</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0">
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Name
                        </Label>
                        <Input
                          value={customName}
                          onChange={(event) => setCustomName(event.target.value)}
                          placeholder="Item name"
                          className="min-w-0"
                        />
                      </div>
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Price
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={customPrice}
                          onChange={(event) =>
                            setCustomPrice(event.target.value)
                          }
                          placeholder="0.00"
                          className="min-w-0 text-right font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Category
                        </Label>
                        <Select
                          value={customCategory}
                          onValueChange={setCustomCategory}
                        >
                          <SelectTrigger className="h-10 min-w-0">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map((categoryName) => (
                              <SelectItem key={categoryName} value={categoryName}>
                                {categoryName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="h-10 w-full rounded-md px-3 md:w-auto"
                        onClick={handleAddCustomItem}
                        disabled={isSavingCustom}
                      >
                        {isSavingCustom ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saveCustomToCatalog && isAdmin ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Add Item
                      </Button>
                    </div>
                    {isAdmin && (
                      <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm">
                        <Checkbox
                          checked={saveCustomToCatalog}
                          onCheckedChange={(checked) =>
                            setSaveCustomToCatalog(checked === true)
                          }
                        />
                        <span>Save to catalog</span>
                      </label>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="min-w-0 space-y-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:space-y-0 lg:gap-4">
                <Card className="min-w-0 overflow-hidden lg:flex lg:min-h-0 lg:flex-col">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex min-w-0 items-center justify-between gap-3 text-lg font-semibold tracking-normal sm:text-xl">
                      <span className="flex min-w-0 items-center">
                        <Calculator className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 truncate">Estimate</span>
                      </span>
                      {selectedLines.length > 0 && (
                        <span className="flex shrink-0 items-center gap-1">
                          <Popover
                            open={isCopyOptionsOpen}
                            onOpenChange={setIsCopyOptionsOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-md px-2 text-xs"
                                disabled={copyMode !== null}
                              >
                                {copyMode ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                Copy
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              sideOffset={6}
                              className="z-[60] w-64 rounded-md p-2"
                            >
                              <div className="space-y-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-auto w-full justify-start rounded-md px-2 py-2 text-left"
                                  onClick={handleCopyEstimateImage}
                                  disabled={copyMode !== null}
                                >
                                  {copyMode === "image" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4" />
                                  )}
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold">
                                      Receipt image
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                      Branded PNG for sharing
                                    </span>
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-auto w-full justify-start rounded-md px-2 py-2 text-left"
                                  onClick={handleCopyEstimateText}
                                  disabled={copyMode !== null}
                                >
                                  {copyMode === "text" ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold">
                                      Normal text
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                      Current itemized format
                                    </span>
                                  </span>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-md px-2 text-xs"
                            onClick={clearEstimate}
                          >
                            Clear
                          </Button>
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <ScrollArea className="h-64 min-w-0 rounded-md border bg-muted/20 p-2 sm:h-72 lg:h-auto lg:min-h-0 lg:flex-1">
                      <div className="min-w-0 space-y-2 pr-1 sm:pr-2">
                        {selectedLines.length === 0 && (
                          <div className="flex h-32 items-center justify-center rounded-md bg-background text-center text-sm text-muted-foreground">
                            Select items to start estimating.
                          </div>
                        )}
                        {selectedLines.map((line) => {
                          const CategoryIcon = getCategoryIcon(line.category_name);
                          const vatClassification = isTaxCalculationCurrent
                            ? getLineVatClassification(line)
                            : null;
                          const hasAlcoholVat =
                            vatClassification?.vat_class === "alcohol";
                          return (
                            <div
                              key={line.id}
                              className="min-w-0 rounded-md border bg-background p-3"
                            >
                              <div className="min-w-0 space-y-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CategoryIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <p
                                      className="min-w-0 break-words text-sm font-semibold leading-snug sm:truncate"
                                      title={line.name}
                                    >
                                      {line.name}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatCurrency(line.unit_price)} each
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                      variant={hasAlcoholVat ? "default" : "outline"}
                                      className="rounded-md"
                                    >
                                      {vatClassification
                                        ? hasAlcoholVat
                                          ? "VAT 10%"
                                          : "Tax 5%"
                                        : "Tax pending"}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                      {vatClassification
                                        ? "AI tax check"
                                        : "Run Calculate Taxes"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                                  <p className="min-w-0 break-words font-bold text-primary">
                                    {formatCurrency(
                                      line.unit_price * line.quantity
                                    )}
                                  </p>
                                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 rounded-md"
                                      onClick={() =>
                                        updateLineQuantity(line.id, -1)
                                      }
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <span className="grid h-7 min-w-8 place-items-center rounded-md border bg-muted/30 px-2 text-xs font-semibold">
                                      {line.quantity}
                                    </span>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 rounded-md"
                                      onClick={() =>
                                        updateLineQuantity(line.id, 1)
                                      }
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 rounded-md text-destructive"
                                      onClick={() => removeLine(line.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-lg font-semibold tracking-normal sm:text-xl">
                      <span className="flex min-w-0 items-center">
                        <Sparkles className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 truncate">Smart Fees</span>
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge
                          variant={isTaxCalculationCurrent ? "default" : "outline"}
                          className="max-w-full rounded-md text-[11px]"
                        >
                          <span className="truncate">{taxStatusLabel}</span>
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-md px-2 text-xs"
                          onClick={handleCalculateTaxes}
                          disabled={
                            selectedLines.length === 0 ||
                            vatStatus === "loading"
                          }
                        >
                          {vatStatus === "loading" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {calculateTaxesButtonLabel}
                        </Button>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-0">
                    {needsTaxCalculation && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                        Run Calculate Taxes once your estimate items are ready.
                        AI will apply 5% Tax to standard items and 10% VAT to
                        alcohol items.
                      </div>
                    )}
                    <div className="grid min-w-0 gap-2 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="min-w-0 rounded-md border bg-muted/20 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Tax 5%
                          </span>
                          <span className="break-words text-right font-semibold">
                            {isTaxCalculationCurrent
                              ? formatCurrency(totals.taxAmount)
                              : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isTaxCalculationCurrent
                            ? `On ${formatCurrency(totals.taxableSubtotal)}`
                            : "Calculated by AI"}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-md border bg-muted/20 p-3">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">
                            Alcohol VAT 10%
                          </span>
                          <span className="break-words text-right font-semibold">
                            {isTaxCalculationCurrent
                              ? formatCurrency(totals.alcoholVatAmount)
                              : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isTaxCalculationCurrent
                            ? `On ${formatCurrency(totals.alcoholSubtotal)}`
                            : "Calculated by AI"}
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Other charge
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={fees.other_charge}
                          onChange={(event) =>
                            handleFeeChange("other_charge", event.target.value)
                          }
                          placeholder="0.00"
                          className="min-w-0 text-right font-mono"
                        />
                      </div>
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-muted-foreground">
                          Discount
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={fees.discount}
                          onChange={(event) =>
                            handleFeeChange("discount", event.target.value)
                          }
                          placeholder="0.00"
                          className="min-w-0 text-right font-mono"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 overflow-hidden border-primary/20 bg-primary/5">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="break-words text-right font-semibold">
                        {formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="break-words text-right">
                        {isTaxCalculationCurrent
                          ? formatCurrency(totals.taxAmount)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="break-words text-right">
                        {isTaxCalculationCurrent
                          ? formatCurrency(totals.alcoholVatAmount)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Other</span>
                      <span className="break-words text-right">
                        {formatCurrency(totals.otherCharge)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="break-words text-right">
                        -{formatCurrency(totals.discount)}
                      </span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Rough final bill
                        </span>
                        <span className="break-words text-2xl font-bold text-primary sm:text-right">
                          {formatCurrency(totals.finalTotal)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
    </SettleEaseDialog>
  );
}
