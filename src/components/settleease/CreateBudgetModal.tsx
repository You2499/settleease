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
  Store,
  Info,
  Check,
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
import { useAutomaticCatalogSync } from "@/hooks/settleease/useAutomaticCatalogSync";
import { BackgroundSyncStatus } from "@/components/settleease/BackgroundSyncStatus";
import {
  BUDGET_ITEM_TAX_RATE,
  getBudgetAlcoholVatRate,
  type BudgetVatInputItem,
} from "@/lib/settleease/budgetVat";
import { formatCurrency } from "@/lib/settleease/utils";
import { cn } from "@/lib/utils";
import type {
  BudgetDraft,
  BudgetFees,
  BudgetItem,
  BudgetVatClassification,
  Category,
  SelectedBudgetLine,
  UserRole,
  Expense,
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
  chargeKind: "tax" | "vat";
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

function getBudgetLineCategoryName(line: SelectedBudgetLine) {
  return formatCopyCell(line.category_name) || UNCATEGORIZED_CATEGORY;
}

function getBudgetLineChargeKind({
  line,
  classification,
}: {
  line: SelectedBudgetLine;
  classification: BudgetVatClassification | null;
}): "tax" | "vat" {
  if (classification?.vat_class === "alcohol") {
    return "vat";
  }

  if (!classification) {
    const categoryName = getBudgetLineCategoryName(line).toLowerCase();
    return categoryName.includes("alcohol") ? "vat" : "tax";
  }

  return "tax";
}

function createEstimateSection(
  title: string,
  chargeKind: "tax" | "vat",
  totalValue: string
): EstimateReceiptSection {
  return {
    title,
    chargeKind,
    lines: [],
    totalLabel: chargeKind === "vat" ? "Total VAT" : "Total Tax",
    totalValue,
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
  const taxTotal = isTaxCalculationCurrent
    ? formatCurrency(totals.taxAmount)
    : "Pending";
  const vatTotal = isTaxCalculationCurrent
    ? formatCurrency(totals.alcoholVatAmount)
    : "Pending";
  const grandTotal = isTaxCalculationCurrent
    ? formatCurrency(totals.finalTotal)
    : "Pending";
  const sections: EstimateReceiptSection[] = [];
  const sectionLineTotals = new Map<string, number>();

  selectedLines.forEach((line) => {
    const classification = isTaxCalculationCurrent
      ? getLineVatClassification(line)
      : null;
    const chargeKind = getBudgetLineChargeKind({ line, classification });
    const categoryName = getBudgetLineCategoryName(line);
    const sectionKey = `${chargeKind}:${categoryName.toLowerCase()}`;
    let section = sections.find(
      (entry) =>
        entry.title.toLowerCase() === categoryName.toLowerCase() &&
        entry.chargeKind === chargeKind
    );

    if (!section) {
      section = createEstimateSection(
        categoryName,
        chargeKind,
        isTaxCalculationCurrent ? formatCurrency(0) : "Pending"
      );
      sections.push(section);
    }

    section.lines.push(toReceiptLine(line));
    sectionLineTotals.set(
      sectionKey,
      (sectionLineTotals.get(sectionKey) ?? 0) +
        line.unit_price * line.quantity
    );
  });

  sections.forEach((section) => {
    if (!isTaxCalculationCurrent) {
      section.totalValue = "Pending";
      return;
    }

    const sectionKey = `${section.chargeKind}:${section.title.toLowerCase()}`;
    const sectionSubtotal = sectionLineTotals.get(sectionKey) ?? 0;
    section.totalValue = formatCurrency(
      roundMoney(
        section.chargeKind === "vat"
          ? sectionSubtotal * getBudgetAlcoholVatRate("alcohol")
          : sectionSubtotal * BUDGET_ITEM_TAX_RATE
      )
    );
  });

  return {
    sections,
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

  model.sections.forEach((section, index) => {
    if (index > 0) {
      rows.push("");
    }
    appendEstimateCopySection(rows, section);
  });

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
    ctx.fillStyle = section.chargeKind === "vat" ? "#fff5df" : "#e9f7f1";
    drawRoundRect(ctx, contentX - 10, y - 22, contentWidth + 20, 30, 8);
    ctx.fill();
    ctx.fillStyle = section.chargeKind === "vat" ? "#8a5a00" : "#0f765f";
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

function isMobileDevice() {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return isTouchDevice && isSmallScreen;
}

async function downloadReceiptImage(model: EstimateReceiptModel) {
  const blob = await buildEstimateReceiptImage(model);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `settleease-budget-${new Date().toISOString().split('T')[0]}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    venue: line.venue ?? undefined,
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
  const [isMobile, setIsMobile] = useState(false);

  // Quiet Sync & Conflict State
  const [lastSavedHash, setLastSavedHash] = useState<string>("");
  const [hasConflict, setHasConflict] = useState<boolean>(false);

  // Selection states for dynamic multi-restaurant pricing
  const [selectedCatalogPrices, setSelectedCatalogPrices] = useState<
    Record<string, { price: number; venue?: string }>
  >({});

  // Query expenses to fetch real historical observations dynamically
  const expenses = useQuery(api.app.listExpenses, isOpen ? {} : "skip") as Expense[] | undefined;

  useEffect(() => {
    const checkMobile = () => setIsMobile(isMobileDevice());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  const saveBudgetDraft = useMutation(api.app.saveBudgetDraft);
  const clearSavedBudgetDraft = useMutation(api.app.clearBudgetDraft);

  const {
    status: autoSyncStatus,
    error: autoSyncError,
    stats: autoSyncStats,
    isOutOfSync: isAutoSyncOutOfSync,
    triggerSync: autoTriggerSync,
  } = useAutomaticCatalogSync(isOpen);

  const isCatalogLoadingOrSyncing = budgetItems === undefined;

  // Reconcile selectedLines, selectedCatalogPrices, and vatClassifications on successful catalog sync
  useEffect(() => {
    if (autoSyncStatus === "success" && autoSyncStats?.idMap) {
      const idMap = autoSyncStats.idMap;
      if (Object.keys(idMap).length === 0) return;

      setSelectedLines((prevLines) => {
        let changed = false;
        const lineIdUpdates: Record<string, string> = {};

        const newLines = prevLines.map((line) => {
          const lookupKey = line.budget_item_id || line.id;
          if (lookupKey && idMap[lookupKey]) {
            const newBudgetItemId = idMap[lookupKey];
            changed = true;

            let newId = line.id;
            if (line.id.startsWith("catalog-")) {
              newId = `catalog-${newBudgetItemId}-${line.unit_price}-${line.venue || "default"}`;
              lineIdUpdates[line.id] = newId;
            }
            return {
              ...line,
              id: newId,
              budget_item_id: newBudgetItemId,
            };
          }
          return line;
        });

        if (Object.keys(lineIdUpdates).length > 0) {
          setVatClassifications((prevVats) => {
            const nextVats = { ...prevVats };
            let vatChanged = false;
            for (const [oldLineId, newLineId] of Object.entries(lineIdUpdates)) {
              if (nextVats[oldLineId]) {
                nextVats[newLineId] = {
                  ...nextVats[oldLineId],
                  key: newLineId,
                };
                delete nextVats[oldLineId];
                vatChanged = true;
              }
            }
            return vatChanged ? nextVats : prevVats;
          });
        }

        return changed ? newLines : prevLines;
      });

      setSelectedCatalogPrices((prevPrices) => {
        let changed = false;
        const newPrices = { ...prevPrices };
        for (const [oldId, newId] of Object.entries(idMap)) {
          if (newPrices[oldId]) {
            newPrices[newId] = newPrices[oldId];
            delete newPrices[oldId];
            changed = true;
          }
        }
        return changed ? newPrices : prevPrices;
      });
    }
  }, [autoSyncStatus, autoSyncStats]);

  // Group historical restaurant observations for unique items in catalog selection
  const itemObservationsMap = useMemo(() => {
    if (!expenses) return {};
    const mapping: Record<string, Array<{ venue: string; price: number; date?: string }>> = {};

    expenses.forEach((expense) => {
      if (!Array.isArray(expense.items)) return;
      expense.items.forEach((item) => {
        const cleanedName = item.name.trim().replace(/\s+/g, " ");
        const normName = cleanedName.toLowerCase();
        
        const quantity = item.quantity || 1;
        const priceVal = typeof item.unitPrice === "number"
          ? item.unitPrice
          : typeof item.price === "number"
            ? item.price / quantity
            : typeof item.price === "string"
              ? Number(item.price) / quantity
              : 0;

        if (priceVal <= 0) return;

        if (!mapping[normName]) {
          mapping[normName] = [];
        }

        const venueName = expense.description.trim() || "Receipt Entry";
        const isDuplicate = mapping[normName].some(
          (obs) => obs.venue.toLowerCase() === venueName.toLowerCase() && Math.abs(obs.price - priceVal) < 0.009
        );

        if (!isDuplicate) {
          mapping[normName].push({
            venue: venueName,
            price: roundMoney(priceVal),
            date: expense.created_at || expense.updated_at,
          });
        }
      });
    });

    return mapping;
  }, [expenses]);

  // CDC (Clean-Dirty-Conflict) Sync Hash
  const localState = useMemo(() => ({
    selectedLines,
    fees,
    vatClassifications,
    vatStatus,
    vatModelName,
    vatClassifiedSignature,
  }), [selectedLines, fees, vatClassifications, vatStatus, vatModelName, vatClassifiedSignature]);

  const localStateHash = useMemo(() => JSON.stringify(localState), [localState]);

  const handleUpdateSaveHash = useCallback((draftPayload: any) => {
    const hash = JSON.stringify({
      selectedLines: draftPayload.selected_lines ?? [],
      fees: draftPayload.fees ?? { other_charge: "", discount: "" },
      vatClassifications: draftPayload.vat_classifications ?? {},
      vatStatus: draftPayload.vat_status ?? "idle",
      vatModelName: draftPayload.vat_model_name ?? "",
      vatClassifiedSignature: draftPayload.vat_classified_signature ?? "",
    });
    setLastSavedHash(hash);
  }, []);

  // Non-destructive Hydration State Merge
  useEffect(() => {
    if (!isOpen || budgetDraft === undefined || isDraftHydrated) {
      return;
    }

    setSelectedLines((localLines) => {
      const remoteLines = budgetDraft?.selected_lines ?? [];
      if (localLines.length === 0) return remoteLines;

      const localItemIds = new Set(localLines.map((l) => l.budget_item_id).filter(Boolean));
      const localCustomNames = new Set(
        localLines.filter((l) => l.source === "custom").map((l) => l.name.toLowerCase())
      );

      const nonCollidingRemoteLines = remoteLines.filter((remoteLine) => {
        if (remoteLine.budget_item_id) {
          return !localItemIds.has(remoteLine.budget_item_id);
        }
        return !localCustomNames.has(remoteLine.name.toLowerCase());
      });

      return [...localLines, ...nonCollidingRemoteLines];
    });

    setFees((localFees) => {
      const remoteFees = budgetDraft?.fees ?? { other_charge: "", discount: "" };
      if (localFees.other_charge === "" && localFees.discount === "") {
        return remoteFees;
      }
      return localFees;
    });

    setVatClassifications((localVats) => ({
      ...budgetDraft?.vat_classifications,
      ...localVats,
    }));

    setVatStatus(budgetDraft?.vat_status === "loading" ? "idle" : budgetDraft?.vat_status ?? "idle");
    setVatModelName(budgetDraft?.vat_model_name ?? "");
    setVatClassifiedSignature(budgetDraft?.vat_classified_signature ?? "");

    handleUpdateSaveHash(budgetDraft ?? { selected_lines: [], fees: { other_charge: "", discount: "" }, vat_classifications: {}, vat_status: "idle", vat_model_name: "", vat_classified_signature: "" });
    setIsDraftHydrated(true);
  }, [budgetDraft, isDraftHydrated, isOpen, handleUpdateSaveHash]);

  // Real-time tab sync and conflict detector
  useEffect(() => {
    if (!isOpen || !isDraftHydrated || !budgetDraft) return;

    const remoteHash = JSON.stringify({
      selectedLines: budgetDraft.selected_lines ?? [],
      fees: budgetDraft.fees ?? { other_charge: "", discount: "" },
      vatClassifications: budgetDraft.vat_classifications ?? {},
      vatStatus: budgetDraft.vat_status ?? "idle",
      vatModelName: budgetDraft.vat_model_name ?? "",
      vatClassifiedSignature: budgetDraft.vat_classified_signature ?? "",
    });

    if (remoteHash === lastSavedHash) {
      return;
    }

    const isLocalDirty = localStateHash !== lastSavedHash;

    if (!isLocalDirty) {
      // Quiet sync remote updates
      setSelectedLines(budgetDraft.selected_lines ?? []);
      setFees(budgetDraft.fees ?? { other_charge: "", discount: "" });
      setVatClassifications(budgetDraft.vat_classifications ?? {});
      setVatStatus(budgetDraft.vat_status ?? "idle");
      setVatModelName(budgetDraft.vat_model_name ?? "");
      setVatClassifiedSignature(budgetDraft.vat_classified_signature ?? "");
      setLastSavedHash(remoteHash);
      setHasConflict(false);
    } else {
      setHasConflict(true);
    }
  }, [budgetDraft, isOpen, isDraftHydrated, lastSavedHash, localStateHash]);

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

  // Auto-saver for draft changes
  useEffect(() => {
    if (!isOpen || !isDraftHydrated || !isBudgetDraftLoaded || hasConflict) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      if (selectedLines.length === 0) {
        void clearSavedBudgetDraft().catch((error) => {
          console.warn("Budget draft clear failed:", error);
        });
        return;
      }

      const payload = {
        selectedLines: toSavedBudgetLines(selectedLines),
        fees: {
          otherCharge: fees.other_charge,
          discount: fees.discount,
        },
        vatClassifications: toSavedVatClassifications(vatClassifications),
        vatStatus,
        vatModelName,
        vatClassifiedSignature,
      };

      void saveBudgetDraft(payload).then(() => {
        handleUpdateSaveHash({
          selected_lines: selectedLines,
          fees: { other_charge: fees.other_charge, discount: fees.discount },
          vat_classifications: vatClassifications,
          vat_status: vatStatus,
          vat_model_name: vatModelName,
          vat_classified_signature: vatClassifiedSignature
        });
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
    hasConflict,
    handleUpdateSaveHash,
  ]);

  const getLineVatClassification = useCallback(
    (line: SelectedBudgetLine) => vatClassifications[line.id] ?? null,
    [vatClassifications]
  );

  // Optimistic Totals Calculation
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxableSubtotal = 0;
    let alcoholSubtotal = 0;
    let alcoholVatAmount = 0;

    selectedLines.forEach((line) => {
      const lineTotal = line.unit_price * line.quantity;
      subtotal += lineTotal;

      const classification = getLineVatClassification(line);
      if (!classification) {
        // Optimistic guess: Alcohol in name/category matches VAT, others match Tax
        const isOptimisticAlcohol = line.name.toLowerCase().includes("beer") ||
                                    line.name.toLowerCase().includes("wine") ||
                                    line.category_name.toLowerCase().includes("alcohol");
        if (isOptimisticAlcohol) {
          alcoholSubtotal += lineTotal;
          alcoholVatAmount += lineTotal * 0.10;
        } else {
          taxableSubtotal += lineTotal;
        }
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
  }, [fees, getLineVatClassification, selectedLines]);

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
    const selection = selectedCatalogPrices[item.id] || { price: Number(item.default_price) };
    const price = selection.price;
    const venue = selection.venue;

    const displayName = venue ? `${item.name} (${venue})` : item.name;

    setSelectedLines((current) => {
      // Find if line already exists with SAME catalog ID AND unit price
      const existingLine = current.find(
        (line) => line.budget_item_id === item.id && Math.abs(line.unit_price - price) < 0.009
      );
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
          id: `catalog-${item.id}-${price}-${venue || 'default'}`,
          budget_item_id: item.id,
          name: displayName,
          category_name: item.category_name,
          unit_price: price,
          quantity: 1,
          source: "catalog",
          venue: venue ?? undefined,
        },
      ];
    });

    toast({
      title: "Added to estimate",
      description: `${displayName} added at ${formatCurrency(price)}.`,
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
      if (isMobile) {
        await downloadReceiptImage(estimateReceiptModel);
        setIsCopyOptionsOpen(false);
        toast({
          title: "Receipt image downloaded",
          description: needsTaxCalculation
            ? "Downloaded as an image with pending Tax and VAT."
            : "The branded receipt image has been downloaded.",
        });
      } else {
        await writeReceiptImageToClipboard(estimateReceiptModel);
        setIsCopyOptionsOpen(false);
        toast({
          title: "Receipt image copied",
          description: needsTaxCalculation
            ? "Copied as an image with pending Tax and VAT."
            : "The branded receipt image is on your clipboard.",
        });
      }
    } catch (error: any) {
      toast({
        title: isMobile ? "Image download failed" : "Image copy failed",
        description:
          error?.message || (isMobile 
            ? "The browser could not download the receipt image."
            : "The browser could not copy the receipt image."),
        variant: "destructive",
      });
    } finally {
      setCopyMode(null);
    }
  }, [estimateReceiptModel, needsTaxCalculation, selectedLines.length, isMobile]);

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



  const renderCatalogItem = (item: BudgetItem) => {
    const CategoryIcon = getCategoryIcon(item.category_name);
    const observationCount =
      item.historical_observation_count + item.custom_observation_count;
    const hasRange = Math.abs(item.max_price - item.min_price) > 0.009;

    // Fetch unique observations mapped in client map
    const observations = item.observations || [];

    // Synthesize interactive pricing selections
    const pricingOptions = (() => {
      const options: Array<{ label: string; price: number; venue?: string; type: 'latest' | 'average' | 'venue' }> = [];
      
      // Default / Average pricing option
      options.push({
        label: "Avg Price",
        price: Number(item.default_price),
        type: 'average'
      });

      // Latest observation option
      if (item.latest_price && Math.abs(item.latest_price - item.default_price) > 0.009) {
        options.push({
          label: "Latest",
          price: Number(item.latest_price),
          type: 'latest'
        });
      }

      // Unique historical venues option
      observations.forEach((obs) => {
        const isDuplicate = options.some(
          (opt) => opt.type === 'venue' && opt.label.toLowerCase() === obs.venue.toLowerCase() && Math.abs(opt.price - obs.price) < 0.009
        );
        if (!isDuplicate) {
          options.push({
            label: obs.venue,
            price: obs.price,
            venue: obs.venue,
            type: 'venue'
          });
        }
      });

      return options;
    })();

    // Resolve current selected price
    const currentPriceSelection = selectedCatalogPrices[item.id] || { price: Number(item.default_price) };
    const activePrice = currentPriceSelection.price;
    const activeVenue = currentPriceSelection.venue;

    const isAIConsolidated = item.source === "historical" || item.source === "mixed" || observationCount > 1;

    return (
      <div
        key={item.id}
        className="min-w-0 rounded-xl border border-neutral-100 bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-none"
      >
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CategoryIcon className="h-4 w-4 shrink-0 text-neutral-400" />
              <p
                className="min-w-0 break-words text-sm font-semibold leading-snug text-neutral-800 dark:text-neutral-200"
                title={item.name}
              >
                {item.name}
              </p>
              {isAIConsolidated && (
                <Badge className="rounded-full bg-emerald-50 text-[10px] text-emerald-600 font-medium px-2 py-0.5 border border-emerald-100 animate-pulse flex items-center gap-1 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                  <Sparkles className="h-2.5 w-2.5 shrink-0" />
                  AI consolidated
                </Badge>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <Badge variant="outline" className="rounded-md border-neutral-200 text-neutral-600 font-medium bg-neutral-50/50 dark:border-neutral-800 dark:text-neutral-400 dark:bg-neutral-900">
                {item.category_name}
              </Badge>
              <span>{observationCount} seen</span>
              <span className="min-w-0 break-words font-mono">
                Latest {formatCurrency(item.latest_price)}
              </span>
              {hasRange && (
                <span className="min-w-0 break-words font-mono text-neutral-400 dark:text-neutral-500">
                  Range: {formatCurrency(item.min_price)} - {formatCurrency(item.max_price)}
                </span>
              )}
            </div>

            {/* Horizontal scrollable pricing pill selector */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1.5 pr-1 scrollbar-thin">
              <span className="text-[10px] text-neutral-400 font-medium shrink-0 flex items-center gap-1 dark:text-neutral-500">
                <Store className="h-3 w-3 shrink-0" />
                Select Price:
              </span>
              {pricingOptions.map((opt, idx) => {
                const isActive = Math.abs(opt.price - activePrice) < 0.009 && opt.venue === activeVenue;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCatalogPrices(curr => ({ ...curr, [item.id]: { price: opt.price, venue: opt.venue } }))}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-full border shrink-0 flex items-center gap-1",
                      isActive
                        ? "bg-neutral-900 border-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-950"
                        : "bg-neutral-50 border-neutral-200 text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400"
                    )}
                  >
                    <span>{opt.label}:</span>
                    <span className="font-mono font-semibold">{formatCurrency(opt.price)}</span>
                    {isActive && <Check className="h-2.5 w-2.5 shrink-0" />}
                  </button>
                );
              })}
            </div>

          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:block lg:shrink-0 lg:text-right">
            <p className="min-w-0 break-words text-lg font-bold text-neutral-900 font-mono lg:max-w-40 dark:text-neutral-100">
              {formatCurrency(activePrice)}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 rounded-full px-3 text-xs border-neutral-200 text-neutral-700 lg:mt-2 bg-white shadow-sm dark:border-neutral-800 dark:text-neutral-300 dark:bg-neutral-900"
              onClick={() => addCatalogItem(item)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add to Est
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCatalogSkeletonRows = () => (
    <div
      className="min-w-0 space-y-2.5"
      role="status"
      aria-label="Loading item catalog"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="min-w-0 rounded-xl border border-neutral-100 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-[#1c1c1e]"
        >
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-3/4 max-w-[260px]" />
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 pt-0.5">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-24" />
              </div>
              {/* Select Price Pill Skeleton */}
              <div className="flex items-center gap-1.5 pt-2">
                <Skeleton className="h-3.5 w-14 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:block lg:shrink-0 lg:text-right">
              <Skeleton className="h-5 w-20 lg:ml-auto" />
              <Skeleton className="h-8 w-14 rounded-full lg:ml-auto lg:mt-2" />
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
      {/* Hydration Guard Skeleton Overlay Block */}
      {!isDraftHydrated && !isBudgetDraftLoaded ? (
        <div className="flex h-full flex-col justify-center items-center gap-3 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md p-10 z-[70] rounded-2xl">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Restoring your custom budget draft...</p>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <SettleEaseModalHeader
            icon={Calculator}
            title="Create Your Budget"
            description="Build a rough bill estimate from catalog items, fees, tax, and VAT."
          />

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5 lg:overflow-hidden bg-neutral-50/50 dark:bg-[#141414]">
            <div className="grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,480px)] xl:grid-cols-[minmax(0,1fr)_minmax(450px,540px)]">
              <div className="min-w-0 space-y-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto] lg:space-y-0 lg:gap-4">
                <Card className="min-w-0 border-neutral-200/70 dark:border-neutral-800 shadow-sm overflow-hidden lg:flex lg:min-h-0 lg:flex-col bg-white dark:bg-[#1c1c1e]">
                  <CardHeader className="pb-3 pt-4 border-b border-neutral-100/80 dark:border-neutral-800">
                    <div className="flex min-w-0 items-center justify-between gap-4">
                      <CardTitle className="flex min-w-0 items-center text-base font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
                        <ReceiptText className="mr-2 h-4.5 w-4.5 text-neutral-400" />
                        <span className="min-w-0 truncate">Item Catalog</span>
                      </CardTitle>
                      <BackgroundSyncStatus
                        status={autoSyncStatus}
                        error={autoSyncError}
                        stats={autoSyncStats}
                        isOutOfSync={isAutoSyncOutOfSync}
                        onRetry={autoTriggerSync}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative min-w-0">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search items"
                          className="pl-9 h-10 border-neutral-200 focus-visible:ring-neutral-200 rounded-lg text-sm bg-neutral-50/30 dark:border-neutral-800 dark:bg-neutral-950/40 dark:focus-visible:ring-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                      <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                      >
                        <SelectTrigger className="h-10 min-w-0 border-neutral-200 rounded-lg bg-neutral-50/30 text-sm focus:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/40 dark:focus:ring-neutral-800 dark:text-neutral-200">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
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

                    <ScrollArea className="h-72 min-w-0 rounded-xl border border-neutral-100 bg-neutral-50/15 p-2 sm:h-80 md:h-96 lg:h-auto lg:min-h-0 lg:flex-1 dark:border-neutral-800 dark:bg-neutral-950/20">
                      <div className="min-w-0 space-y-2.5 pr-1 sm:pr-2">
                        {isCatalogLoadingOrSyncing ? (
                          renderCatalogSkeletonRows()
                        ) : (
                          <>
                            {budgetItems && budgetItems.length > 0 && budgetItems.map(renderCatalogItem)}
                            {budgetItems && budgetItems.length === 0 && (
                              <div className="flex h-40 flex-col gap-2 items-center justify-center rounded-xl bg-white border border-dashed border-neutral-200 text-center text-sm text-neutral-400 p-4 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-500">
                                <Info className="h-5 w-5 text-neutral-300 dark:text-neutral-600" />
                                No catalog items found matching filters.
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="min-w-0 border-neutral-200/70 dark:border-neutral-800 shadow-sm overflow-hidden bg-white dark:bg-[#1c1c1e]">
                  <CardHeader className="pb-3 pt-4 border-b border-neutral-100/80 dark:border-neutral-800">
                    <CardTitle className="flex min-w-0 items-center text-base font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
                      <Plus className="mr-2 h-4.5 w-4.5 text-neutral-400" />
                      <span className="min-w-0 truncate">Custom Item</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-3">
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                          Name
                        </Label>
                        <Input
                          value={customName}
                          onChange={(event) => setCustomName(event.target.value)}
                          placeholder="Item name"
                          className="min-w-0 h-10 border-neutral-200 rounded-lg bg-neutral-50/30 text-sm focus-visible:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/40 dark:focus-visible:ring-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-neutral-500 dark:text-neutral-400 font-medium">
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
                          className="min-w-0 h-10 text-right font-mono border-neutral-200 rounded-lg bg-neutral-50/30 text-sm focus-visible:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/40 dark:focus-visible:ring-neutral-800 dark:text-neutral-200"
                        />
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                          Category
                        </Label>
                        <Select
                          value={customCategory}
                          onValueChange={setCustomCategory}
                        >
                          <SelectTrigger className="h-10 min-w-0 border-neutral-200 rounded-lg bg-neutral-50/30 text-sm focus:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/40 dark:focus:ring-neutral-800 dark:text-neutral-200">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
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
                        className="h-10 w-full rounded-lg px-4 bg-neutral-900 text-white font-medium text-sm md:w-auto shadow-sm dark:bg-neutral-100 dark:text-neutral-950"
                        onClick={handleAddCustomItem}
                        disabled={isSavingCustom}
                      >
                        {isSavingCustom ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                        ) : saveCustomToCatalog && isAdmin ? (
                          <Save className="h-4 w-4 mr-1.5" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1.5" />
                        )}
                        Add Item
                      </Button>
                    </div>
                    {isAdmin && (
                      <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2 text-xs text-neutral-600 font-medium dark:border-neutral-800 dark:bg-neutral-950/30 dark:text-neutral-400">
                        <Checkbox
                          checked={saveCustomToCatalog}
                          onCheckedChange={(checked) =>
                            setSaveCustomToCatalog(checked === true)
                          }
                          className="border-neutral-300 rounded"
                        />
                        <span>Save to catalog</span>
                      </label>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="min-w-0 space-y-4 lg:grid lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:space-y-0 lg:gap-4">
                <Card className="min-w-0 border-neutral-200/70 dark:border-neutral-800 shadow-sm overflow-hidden lg:flex lg:min-h-0 lg:flex-col bg-white dark:bg-[#1c1c1e]">
                  <CardHeader className="pb-3 pt-4 border-b border-neutral-100/80 dark:border-neutral-800">
                    <CardTitle className="flex min-w-0 items-center justify-between gap-3 text-base font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
                      <span className="flex min-w-0 items-center">
                        <Calculator className="mr-2 h-4.5 w-4.5 text-neutral-400" />
                        <span className="min-w-0 truncate">Estimate</span>
                      </span>
                      {selectedLines.length > 0 && (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <Popover
                            open={isCopyOptionsOpen}
                            onOpenChange={setIsCopyOptionsOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-full border-neutral-200 text-neutral-700 bg-white px-3 text-xs shadow-sm font-medium dark:border-neutral-800 dark:text-neutral-300 dark:bg-neutral-900"
                                disabled={copyMode !== null}
                              >
                                {copyMode ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Share
                                <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              sideOffset={6}
                              className="z-[60] w-64 rounded-xl p-2 bg-white shadow-xl border-neutral-150 dark:bg-[#1c1c1e] dark:border-neutral-800"
                            >
                              <div className="space-y-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-auto w-full justify-start rounded-lg px-2.5 py-2.5 text-left"
                                  onClick={handleCopyEstimateImage}
                                  disabled={copyMode !== null}
                                >
                                  {copyMode === "image" ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-neutral-400" />
                                  ) : (
                                    <ImageIcon className="h-4.5 w-4.5 mr-2 text-neutral-400" />
                                  )}
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                      Receipt image
                                    </span>
                                    <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">
                                      {isMobile ? "Download branded PNG" : "Branded PNG for sharing"}
                                    </span>
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-auto w-full justify-start rounded-lg px-2.5 py-2.5 text-left"
                                  onClick={handleCopyEstimateText}
                                  disabled={copyMode !== null}
                                >
                                  {copyMode === "text" ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-neutral-400" />
                                  ) : (
                                    <FileText className="h-4.5 w-4.5 mr-2 text-neutral-400" />
                                  )}
                                  <span className="min-w-0">
                                    <span className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                                      Normal text
                                    </span>
                                    <span className="block text-[10px] text-neutral-400 dark:text-neutral-500">
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
                            className="h-8 rounded-full text-neutral-500 dark:text-neutral-400 px-3 text-xs"
                            onClick={clearEstimate}
                          >
                            Clear
                          </Button>
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                    {/* Multi-Tab quiet sync warning conflict banner */}
                    {hasConflict && (
                      <div className="rounded-xl border border-amber-200/50 bg-amber-50/20 p-3.5 text-xs text-amber-900 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-200 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                        <div className="flex gap-2">
                          <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-800 dark:text-amber-300">Draft edited in another window</p>
                            <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">You have unsaved local edits and another device saved newer changes.</p>
                            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full bg-white border-amber-200 text-amber-900 font-semibold px-3 text-[10px] shadow-sm dark:bg-neutral-900 dark:border-amber-900/50 dark:text-amber-200"
                                onClick={() => {
                                  if (budgetDraft) {
                                    setSelectedLines(budgetDraft.selected_lines ?? []);
                                    setFees(budgetDraft.fees ?? { other_charge: "", discount: "" });
                                    setVatClassifications(budgetDraft.vat_classifications ?? {});
                                    setVatStatus(budgetDraft.vat_status ?? "idle");
                                    setVatModelName(budgetDraft.vat_model_name ?? "");
                                    setVatClassifiedSignature(budgetDraft.vat_classified_signature ?? "");
                                    setLastSavedHash(JSON.stringify(budgetDraft));
                                    setHasConflict(false);
                                  }
                                }}
                              >
                                Sync Remote
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-3 text-[10px] font-semibold text-amber-700 rounded-full dark:text-amber-400"
                                onClick={() => {
                                  setLastSavedHash(localStateHash);
                                  setHasConflict(false);
                                }}
                              >
                                Keep Local
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <ScrollArea className="h-64 min-w-0 rounded-xl border border-neutral-100 bg-neutral-50/15 p-2 sm:h-72 lg:h-auto lg:min-h-0 lg:flex-1 dark:border-neutral-800 dark:bg-neutral-950/20">
                      <div className="min-w-0 space-y-2.5 pr-1 sm:pr-2">
                        {selectedLines.length === 0 && (
                          <div className="flex h-32 flex-col gap-2 items-center justify-center rounded-xl bg-white border border-dashed border-neutral-200 text-center text-sm text-neutral-400 p-4 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-500">
                            <Info className="h-5 w-5 text-neutral-300 dark:text-neutral-600" />
                            Select items from the catalog or add custom entries to estimate.
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
                              className="min-w-0 rounded-xl border border-neutral-100 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60"
                            >
                              <div className="min-w-0 space-y-3">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CategoryIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                                    <p
                                      className="min-w-0 break-words text-sm font-semibold leading-snug text-neutral-800 dark:text-neutral-200"
                                      title={line.name}
                                    >
                                      {line.name}
                                    </p>
                                  </div>
                                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                                    {formatCurrency(line.unit_price)} each
                                  </p>
                                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className={cn(
                                            "rounded-full text-[10px] font-semibold px-2 py-0.5 border cursor-pointer flex items-center gap-1",
                                            vatClassification
                                              ? hasAlcoholVat
                                                ? "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                                                : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                                              : "bg-neutral-50 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700"
                                          )}
                                        >
                                          {vatClassification
                                            ? hasAlcoholVat
                                              ? "VAT 10%"
                                              : "Tax 5%"
                                            : "Tax pending"}
                                          <Info className="h-2.5 w-2.5 shrink-0" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-72 p-3 bg-white shadow-xl rounded-xl z-[70] border-neutral-150 dark:bg-[#1c1c1e] dark:border-neutral-800">
                                        <div className="space-y-2">
                                          <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                                            <Sparkles className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                                            AI Tax Classification Details
                                          </p>
                                          {vatClassification ? (
                                            <div className="space-y-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                                              <div className="flex justify-between border-b dark:border-neutral-800 pb-1">
                                                <span>Tax Category:</span>
                                                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{hasAlcoholVat ? "Alcohol (10% VAT)" : "Standard (5% Tax)"}</span>
                                              </div>
                                              <div className="flex justify-between border-b dark:border-neutral-800 pb-1">
                                                <span>Confidence:</span>
                                                <span className={cn(
                                                  "font-semibold capitalize",
                                                  vatClassification.confidence === "high" ? "text-emerald-600" :
                                                  vatClassification.confidence === "medium" ? "text-amber-600" : "text-red-500"
                                                )}>{vatClassification.confidence}</span>
                                              </div>
                                              <div className="flex justify-between border-b dark:border-neutral-800 pb-1">
                                                <span>Model Source:</span>
                                                <span className="font-mono text-neutral-500 dark:text-neutral-400 text-[10px]">{vatModelName || "Gemini Core"}</span>
                                              </div>
                                              <div className="pt-1.5">
                                                <p className="text-[10px] text-neutral-400 dark:text-neutral-550 font-medium">Rationale:</p>
                                                <p className="mt-0.5 leading-snug italic text-neutral-500 dark:text-neutral-400">"{vatClassification.rationale}"</p>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                                              Taxes have not been calculated yet for this draft. Click **Calculate Taxes** below to process this item with Gemini AI.
                                            </p>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    <span className="text-[10px] text-neutral-400 dark:text-neutral-550 font-medium">
                                      {vatClassification
                                        ? "AI tax check ok"
                                        : "Taxes pending"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-50 dark:border-neutral-800 pt-2.5">
                                  <p className="min-w-0 break-words font-mono font-bold text-neutral-900 dark:text-neutral-100">
                                    {formatCurrency(
                                      line.unit_price * line.quantity
                                    )}
                                  </p>
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 rounded-lg border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                                      onClick={() =>
                                        updateLineQuantity(line.id, -1)
                                      }
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <span className="grid h-7 min-w-8 place-items-center rounded-lg border border-neutral-100 bg-neutral-50/30 px-2 text-xs font-mono font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-200">
                                      {line.quantity}
                                    </span>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-7 w-7 rounded-lg border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
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
                                      className="h-7 w-7 rounded-lg text-neutral-400 dark:text-neutral-550"
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

                <Card className="min-w-0 border-neutral-200/70 dark:border-neutral-800 shadow-sm overflow-hidden bg-white dark:bg-[#1c1c1e]">
                  <CardHeader className="pb-3 pt-4 border-b border-neutral-100/80 dark:border-neutral-800">
                    <CardTitle className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-base font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
                      <span className="flex min-w-0 items-center">
                        <Sparkles className="mr-2 h-4.5 w-4.5 text-neutral-400" />
                        <span className="min-w-0 truncate">Smart Fees</span>
                      </span>
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge
                          variant={isTaxCalculationCurrent ? "default" : "outline"}
                          className={cn(
                            "max-w-full rounded-full text-[10px] font-semibold px-2.5 py-0.5",
                            isTaxCalculationCurrent
                              ? "bg-neutral-900 border-neutral-900 text-white dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-950"
                              : "bg-neutral-50 border-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400"
                          )}
                        >
                          <span className="truncate">{taxStatusLabel}</span>
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full border-neutral-200 text-neutral-700 bg-white px-3 text-xs shadow-sm font-semibold dark:border-neutral-800 dark:text-neutral-300 dark:bg-neutral-900"
                          onClick={handleCalculateTaxes}
                          disabled={
                            selectedLines.length === 0 ||
                            vatStatus === "loading"
                          }
                        >
                          {vatStatus === "loading" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-neutral-400" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {calculateTaxesButtonLabel}
                        </Button>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 space-y-3 pt-3">
                    {needsTaxCalculation && (
                      <div className="rounded-xl border border-amber-200/40 bg-amber-50/15 px-3 py-2.5 text-xs text-amber-800 leading-snug flex gap-2 dark:border-amber-900/40 dark:bg-amber-950/10 dark:text-amber-300">
                        <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                        <span>
                          Run **Calculate Taxes** once your estimate items are ready. SettleEase AI will apply a 5% Tax to standard items and a 10% VAT to alcoholic drinks.
                        </span>
                      </div>
                    )}
                    <div className="grid min-w-0 gap-2.5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="min-w-0 rounded-xl border border-neutral-100 bg-neutral-50/30 p-3 dark:border-neutral-800 dark:bg-neutral-950/20">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                            Tax 5%
                          </span>
                          <span className="break-words text-right font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                            {isTaxCalculationCurrent
                              ? formatCurrency(totals.taxAmount)
                              : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-550 font-medium">
                          {isTaxCalculationCurrent
                            ? `On ${formatCurrency(totals.taxableSubtotal)}`
                            : "Calculated by SettleEase AI"}
                        </p>
                      </div>
                      <div className="min-w-0 rounded-xl border border-neutral-100 bg-neutral-50/30 p-3 dark:border-neutral-800 dark:bg-neutral-950/20">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                            Alcohol VAT 10%
                          </span>
                          <span className="break-words text-right font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                            {isTaxCalculationCurrent
                              ? formatCurrency(totals.alcoholVatAmount)
                              : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-550 font-medium">
                          {isTaxCalculationCurrent
                            ? `On ${formatCurrency(totals.alcoholSubtotal)}`
                            : "Calculated by SettleEase AI"}
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-neutral-500 dark:text-neutral-400 font-medium">
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
                          className="min-w-0 h-10 text-right font-mono border-neutral-200 rounded-lg bg-neutral-50/30 text-sm focus-visible:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-200 dark:focus-visible:ring-neutral-800"
                        />
                      </div>
                      <div className="min-w-0">
                        <Label className="mb-1.5 block text-xs text-neutral-500 dark:text-neutral-400 font-medium">
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
                          className="min-w-0 h-10 text-right font-mono border-neutral-200 rounded-lg bg-neutral-50/30 text-sm focus-visible:ring-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-200 dark:focus-visible:ring-neutral-800"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-w-0 border-neutral-200/80 bg-neutral-100/30 shadow-sm rounded-xl dark:border-neutral-800 dark:bg-neutral-950/30">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      <span>Subtotal</span>
                      <span className="break-words text-right font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(totals.subtotal)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      <span>Tax</span>
                      <span className="break-words text-right font-mono text-neutral-700 dark:text-neutral-300">
                        {isTaxCalculationCurrent
                          ? formatCurrency(totals.taxAmount)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      <span>VAT</span>
                      <span className="break-words text-right font-mono text-neutral-700 dark:text-neutral-300">
                        {isTaxCalculationCurrent
                          ? formatCurrency(totals.alcoholVatAmount)
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      <span>Other Offsets</span>
                      <span className="break-words text-right font-mono text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(totals.otherCharge)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      <span>Discount</span>
                      <span className="break-words text-right font-mono text-neutral-700 dark:text-neutral-300">
                        -{formatCurrency(totals.discount)}
                      </span>
                    </div>
                    <div className="border-t border-neutral-200/60 dark:border-neutral-800 pt-3">
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Rough final bill
                        </span>
                        <span className="break-words text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 sm:text-right">
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
      )}
    </SettleEaseDialog>
  );
}
