"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ScanLine, Upload, Camera, ArrowLeft, ArrowRight, Check, Loader2,
  AlertTriangle, RotateCcw, Sparkles, Receipt, ImageIcon,
  CreditCard, Wallet, X, Zap, FileImage, CheckCircle2, Users, ListChecks
} from 'lucide-react';

import PayerInputSection from './addexpense/PayerInputSection';
import SplitMethodSelector from './addexpense/SplitMethodSelector';
import EqualSplitSection from './addexpense/EqualSplitSection';
import UnequalSplitSection from './addexpense/UnequalSplitSection';
import ItemwiseSplitSection from './addexpense/ItemwiseSplitSection';
import ExpenseBasicInfo from './addexpense/ExpenseBasicInfo';
import { useExpenseFormLogic } from './addexpense/ExpenseFormLogic';
import SettleEaseErrorBoundary from '../ui/SettleEaseErrorBoundary';

import type {
  Expense, Person, PayerInputRow, ExpenseItemDetail,
  Category as DynamicCategory, ParsedReceiptData
} from '@/lib/settleease/types';
import { formatCurrency } from '@/lib/settleease/utils';
import { compressImage, formatFileSize, isSupportedImageType } from '@/lib/settleease/imageUtils';
import {
  createQuantitySplits,
  dedupePersonIds,
  getItemQuantity,
  getItemUnitSharing,
  normalizeItemQuantityValue,
  resizeQuantitySplits,
  toItemAmount,
} from '@/lib/settleease/itemwiseCalculations';
import {
  LoadingRegion,
  SkeletonSectionHeader,
  StepRailSkeleton,
} from './SkeletonLayouts';
import AppEmptyState from './AppEmptyState';

interface ScanReceiptTabProps {
  people: Person[];
  onExpenseAdded: () => void;
  dynamicCategories: DynamicCategory[];
  isLoadingPeople?: boolean;
  isLoadingCategories?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

type WizardStep = 'upload' | 'analyzing' | 'split' | 'form';

const STEP_ORDER: WizardStep[] = ['upload', 'analyzing', 'split', 'form'];

const WORKFLOW_STEPS = [
  {
    key: 'upload' as WizardStep,
    label: 'Capture',
    description: 'Receipt image',
    Icon: Camera,
  },
  {
    key: 'analyzing' as WizardStep,
    label: 'Read',
    description: 'AI extraction',
    Icon: Sparkles,
  },
  {
    key: 'split' as WizardStep,
    label: 'Split',
    description: 'Review items',
    Icon: ListChecks,
  },
  {
    key: 'form' as WizardStep,
    label: 'Save',
    description: 'Expense details',
    Icon: CheckCircle2,
  },
];

const ANALYZING_STAGES = [
  { message: 'Uploading image...', progress: 15 },
  { message: 'AI analyzing receipt...', progress: 35 },
  { message: 'Detecting items...', progress: 55 },
  { message: 'Extracting prices...', progress: 75 },
  { message: 'Parsing taxes...', progress: 90 },
  { message: 'Finalizing...', progress: 98 },
];

function normalizeCategoryLookup(value: string) {
  return value.trim().toLowerCase();
}

function findCategoryByName(name: string | null | undefined, categories: DynamicCategory[]): string {
  if (!name) return "";
  const normalizedName = normalizeCategoryLookup(name);
  return categories.find(c => normalizeCategoryLookup(c.name) === normalizedName)?.name || "";
}

function findCategoryByKeywords(keywords: string[], categories: DynamicCategory[]): string {
  for (const cat of categories) {
    const catLower = normalizeCategoryLookup(cat.name);
    if (keywords.some(keyword => catLower.includes(keyword) || keyword.includes(catLower))) {
      return cat.name;
    }
  }

  return "";
}

function fuzzyMatchCategory(hint: string, categories: DynamicCategory[]): string {
  if (!hint || categories.length === 0) return '';

  const hintLower = hint.toLowerCase();

  // Direct name match
  const directMatch = categories.find(c => c.name.toLowerCase() === hintLower);
  if (directMatch) return directMatch.name;

  // Keyword mapping
  const keywordMap: Record<string, string[]> = {
    food: ['food', 'meal', 'dinner', 'lunch', 'breakfast', 'restaurant', 'dining', 'eat'],
    drinks: ['drink', 'beverage', 'water', 'juice', 'coffee', 'tea', 'soda'],
    alcohol: ['alcohol', 'bar', 'liquor', 'beer', 'wine', 'spirit', 'cocktail', 'drink'],
    other: ['other', 'misc', 'miscellaneous', 'general'],
  };

  const keywords = keywordMap[hintLower] || [hintLower];

  return findCategoryByKeywords(keywords, categories);
}

function resolveScannedItemCategory(
  item: ParsedReceiptData["items"][number],
  categories: DynamicCategory[]
): string {
  const nameLower = item.name.toLowerCase();
  if (/(packaged|mineral|bottled|sparkling)\s+water|water\s*(bottle|glass|can)?/.test(nameLower)) {
    return findCategoryByKeywords(["water", "drink", "drinks", "beverage", "beverages"], categories);
  }

  const directCategory = findCategoryByName(item.category_name, categories);
  if (directCategory) return directCategory;

  return fuzzyMatchCategory(item.category_hint, categories);
}

function findTaxCategory(categories: DynamicCategory[]): string {
  return (
    findCategoryByName("Tax", categories) ||
    findCategoryByName("Taxes", categories) ||
    findCategoryByKeywords(["tax", "gst", "vat"], categories)
  );
}

function findChargeCategory(categories: DynamicCategory[]): string {
  return findCategoryByKeywords(["charge", "charges", "fee", "fees", "service"], categories);
}

function getStepIndex(step: WizardStep) {
  return STEP_ORDER.indexOf(step);
}

function StepRail({ step }: { step: WizardStep }) {
  const currentIndex = getStepIndex(step);

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {WORKFLOW_STEPS.map(({ key, label, description, Icon }, index) => {
        const isActive = key === step;
        const isComplete = index < currentIndex;

        return (
          <div
            key={key}
            className={`rounded-lg border px-2 py-2 transition-colors ${
              isActive
                ? 'border-primary bg-primary/10 text-primary'
                : isComplete
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300'
                  : 'border-border bg-background text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs font-semibold">{label}</span>
            </div>
            <p className="mt-1 hidden truncate text-[11px] sm:block">{description}</p>
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold leading-tight text-foreground">{title}</h3>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function ScanReceiptTab({
  people,
  onExpenseAdded,
  dynamicCategories,
  isLoadingPeople = false,
  isLoadingCategories = false,
  isDataFetchedAtLeastOnce = true,
}: ScanReceiptTabProps) {
  const isLoadingData = isLoadingPeople || isLoadingCategories || !isDataFetchedAtLeastOnce;

  // Wizard state
  const [step, setStep] = useState<WizardStep>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [analyzingMessageIndex, setAnalyzingMessageIndex] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number;
    compressed: number;
  } | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  // Form state (same as AddExpenseTab)
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [payers, setPayers] = useState<PayerInputRow[]>([{ id: Date.now().toString(), personId: '', amount: '' }]);
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [splitMethod, setSplitMethod] = useState<Expense['split_method']>('equal');
  const [selectedPeopleEqual, setSelectedPeopleEqual] = useState<string[]>([]);
  const [unequalShares, setUnequalShares] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ExpenseItemDetail[]>([{ id: Date.now().toString(), name: '', price: '', sharedBy: [], categoryName: '', quantity: 1, unitPrice: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const defaultPayerId = useMemo(() => {
    if (people.length > 0) {
      const currentUser = people.find(p => p.name.toLowerCase() === 'you' || p.name.toLowerCase() === 'me');
      return currentUser ? currentUser.id : people[0].id;
    }
    return '';
  }, [people]);

  const defaultItemCategory = useMemo(() => dynamicCategories.length > 0 ? dynamicCategories[0].name : '', [dynamicCategories]);

  const { handleSubmitExpense } = useExpenseFormLogic({ onExpenseAdded });

  // Animated analyzing messages
  useEffect(() => {
    if (step !== 'analyzing') return;
    const interval = setInterval(() => {
      setAnalyzingMessageIndex(prev => (prev + 1) % ANALYZING_STAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [step]);

  // Initialize payer when people load
  useEffect(() => {
    if (people.length > 0 && defaultPayerId) {
      setPayers([{ id: Date.now().toString(), personId: defaultPayerId, amount: totalAmount }]);
      setSelectedPeopleEqual(people.map(p => p.id));
      setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
    }
  }, [people, defaultPayerId]);

  // Sync payer amount with totalAmount
  useEffect(() => {
    if (!isMultiplePayers && payers.length === 1) {
      setPayers(prev => [{
        ...prev[0],
        personId: prev[0].personId || defaultPayerId,
        amount: totalAmount
      }]);
    }
  }, [totalAmount, isMultiplePayers]);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setScanError('Please select an image file.');
      return;
    }

    if (!isSupportedImageType(file)) {
      setScanError('Unsupported image format. Please use JPEG, PNG, or WebP.');
      return;
    }

    // Check file size (warn if very large)
    if (file.size > 8 * 1024 * 1024) {
      setScanError('Image is very large. Compressing...');
    } else {
      setScanError(null);
    }

    setIsCompressing(true);
    setCompressionInfo(null);

    try {
      // Compress image to optimize upload
      const compressed = await compressImage(file, 1200, 1600, 0.85);
      
      setCompressionInfo({
        original: compressed.originalSize,
        compressed: compressed.compressedSize,
      });

      // Create preview
      const previewUrl = `data:${compressed.mimeType};base64,${compressed.base64}`;
      setImagePreview(previewUrl);
      setImageBase64(compressed.base64);
      setImageMimeType(compressed.mimeType);
      
      setScanError(null);
      setIsCompressing(false);
    } catch (error: any) {
      console.error('Compression error:', error);
      setScanError('Failed to process image. Please try another image.');
      setIsCompressing(false);
      setImagePreview(null);
      setImageBase64(null);
      setImageMimeType(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleScan = useCallback(async () => {
    if (!imageBase64 || !imageMimeType) return;

    setStep('analyzing');
    setAnalyzingMessageIndex(0);
    setScanError(null);
    setCanRetry(false);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          mimeType: imageMimeType,
          categories: dynamicCategories.map(category => ({
            name: category.name,
            icon_name: category.icon_name,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan receipt');
      }

      setParsedData(data);
      setStep('split');
      setCanRetry(false);
    } catch (error: any) {
      console.error('Scan error:', error);
      
      if (error.name === 'AbortError') {
        setScanError('Scan cancelled.');
        setCanRetry(true);
      } else {
        setScanError(error.message || 'Failed to scan receipt. Please try again.');
        setCanRetry(true);
      }
      
      setStep('upload');
    } finally {
      abortControllerRef.current = null;
    }
  }, [imageBase64, imageMimeType, dynamicCategories]);

  const handleCancelScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStep('upload');
    setScanError('Scan cancelled.');
    setCanRetry(true);
  }, []);

  const handleSplitMethodConfirm = useCallback(() => {
    if (!parsedData) return;

    // Pre-fill basic info
    setDescription(parsedData.restaurant_name || 'Scanned Receipt');
    setTotalAmount(parsedData.total_amount.toFixed(2));

    // Pre-fill date
    if (parsedData.date) {
      const parsed = new Date(parsedData.date);
      if (!isNaN(parsed.getTime())) {
        setExpenseDate(parsed);
      }
    }

    // Pre-fill category from first item hint
    if (parsedData.items.length > 0 && dynamicCategories.length > 0) {
      const primaryCategory = resolveScannedItemCategory(parsedData.items[0], dynamicCategories);
      setCategory(primaryCategory || dynamicCategories[0].name);
    } else if (dynamicCategories.length > 0) {
      setCategory(dynamicCategories[0].name);
    }

    // Pre-fill payer
    const payerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
    setPayers([{ id: Date.now().toString(), personId: payerPersonId, amount: parsedData.total_amount.toFixed(2) }]);

    // Pre-fill split-specific data
    if (splitMethod === 'equal') {
      setSelectedPeopleEqual(people.map(p => p.id));
    } else if (splitMethod === 'unequal') {
      setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
    } else if (splitMethod === 'itemwise') {
      const allPeopleIds = people.map(p => p.id);
      const taxCategory = findTaxCategory(dynamicCategories);
      const chargeCategory = findChargeCategory(dynamicCategories) || taxCategory;

      // Convert parsed items to ExpenseItemDetail
      const expenseItems: ExpenseItemDetail[] = parsedData.items.map((item, idx) => ({
        id: `scan-item-${idx}-${Date.now()}`,
        name: item.name,
        price: item.total_price.toFixed(2),
        unitPrice: item.unit_price.toFixed(2),
        quantity: normalizeItemQuantityValue(item.quantity),
        sharedBy: [...allPeopleIds],
        categoryName: resolveScannedItemCategory(item, dynamicCategories),
      }));

      const taxesTotal = parsedData.taxes.reduce((sum, tax) => sum + Math.max(0, toItemAmount(tax.amount)), 0);
      if (taxesTotal > 0.01) {
        expenseItems.push({
          id: `scan-taxes-${Date.now()}`,
          name: 'Taxes',
          price: taxesTotal.toFixed(2),
          unitPrice: taxesTotal.toFixed(2),
          quantity: 1,
          sharedBy: [...allPeopleIds],
          categoryName: taxCategory,
        });
      }

      const positiveChargesTotal = parsedData.additional_charges.reduce(
        (sum, charge) => sum + Math.max(0, toItemAmount(charge.amount)),
        0
      );
      if (positiveChargesTotal > 0.01) {
        expenseItems.push({
          id: `scan-charges-${Date.now()}`,
          name: 'Other Charges',
          price: positiveChargesTotal.toFixed(2),
          unitPrice: positiveChargesTotal.toFixed(2),
          quantity: 1,
          sharedBy: [...allPeopleIds],
          categoryName: chargeCategory,
        });
      }

      setItems(expenseItems);
    }

    setStep('form');
  }, [parsedData, splitMethod, people, dynamicCategories, defaultPayerId]);

  const handleReset = useCallback(() => {
    // Cancel any ongoing scan
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setStep('upload');
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    setParsedData(null);
    setScanError(null);
    setAnalyzingMessageIndex(0);
    setIsCompressing(false);
    setCompressionInfo(null);
    setCanRetry(false);
    setDescription('');
    setTotalAmount('');
    setCategory('');
    setExpenseDate(new Date());
    setSplitMethod('equal');
    setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: [], categoryName: '', quantity: 1, unitPrice: '' }]);
  }, []);

  // Form handlers (same as AddExpenseTab)
  const amountToSplit = useMemo(() => parseFloat(totalAmount) || 0, [totalAmount]);

  const handlePayerChange = (index: number, field: keyof PayerInputRow, value: string) => {
    const newPayers = [...payers];
    newPayers[index] = { ...newPayers[index], [field]: value };
    setPayers(newPayers);
  };

  const addPayer = () => {
    const selectedIds = payers.map(p => p.personId).filter(id => id && id !== '');
    const availablePerson = people.find(p => !selectedIds.includes(p.id));
    const newPayerPersonId = availablePerson ? availablePerson.id : defaultPayerId;
    setPayers([...payers, { id: Date.now().toString(), personId: newPayerPersonId, amount: '' }]);
  };

  const removePayer = (index: number) => {
    const newPayers = payers.filter((_, i) => i !== index);
    if (newPayers.length === 0) {
      setPayers([{ id: Date.now().toString(), personId: defaultPayerId, amount: totalAmount }]);
    } else {
      setPayers(newPayers);
    }
  };

  const handleToggleMultiplePayers = () => {
    const goingToMultiple = !isMultiplePayers;
    setIsMultiplePayers(goingToMultiple);
    const personId = payers[0]?.personId || defaultPayerId;
    if (goingToMultiple) {
      setPayers([{ id: Date.now().toString(), personId, amount: totalAmount }]);
    } else {
      setPayers([{ id: Date.now().toString(), personId, amount: totalAmount }]);
    }
  };

  const handleEqualSplitChange = (personId: string) => {
    setSelectedPeopleEqual(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };

  const handleUnequalShareChange = (personId: string, value: string) => {
    setUnequalShares(prev => ({ ...prev, [personId]: value }));
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: category || defaultItemCategory, quantity: 1, unitPrice: '' }]);
  };

  const handleItemChange = <K extends keyof ExpenseItemDetail>(index: number, field: K, value: ExpenseItemDetail[K]) => {
    setItems(prev => prev.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const nextItem = { ...item, [field]: value };

      if (field === 'quantitySplits') {
        const aggregateSharedBy = dedupePersonIds(
          getItemUnitSharing(nextItem).flatMap(unit => unit.sharedBy)
        );
        return { ...nextItem, sharedBy: aggregateSharedBy };
      }

      return nextItem;
    }));
  };

  const handleItemSharedByChange = (itemIndex: number, personId: string) => {
    setItems(prev => prev.map((item, index) => {
      if (index !== itemIndex) return item;
      const currentSharedBy = item.sharedBy || [];
      return {
        ...item,
        sharedBy: currentSharedBy.includes(personId)
          ? currentSharedBy.filter(id => id !== personId)
          : [...currentSharedBy, personId],
      };
    }));
  };

  const handleToggleQuantitySplits = (itemIndex: number, enabled: boolean) => {
    setItems(prev => prev.map((item, index) => {
      if (index !== itemIndex) return item;

      if (enabled) {
        const fallbackSharedBy = item.sharedBy.length > 0 ? item.sharedBy : people.map(p => p.id);
        return {
          ...item,
          sharedBy: dedupePersonIds(fallbackSharedBy),
          quantitySplits: createQuantitySplits(getItemQuantity(item), fallbackSharedBy),
        };
      }

      const aggregateSharedBy = dedupePersonIds(
        getItemUnitSharing(item).flatMap(unit => unit.sharedBy)
      );
      return {
        ...item,
        sharedBy: aggregateSharedBy.length > 0 ? aggregateSharedBy : item.sharedBy,
        quantitySplits: undefined,
      };
    }));
  };

  const handleItemQuantitySplitChange = (itemIndex: number, unitIndex: number, personId: string) => {
    setItems(prev => prev.map((item, index) => {
      if (index !== itemIndex) return item;

      const quantity = getItemQuantity(item);
      const splits = resizeQuantitySplits(item.quantitySplits, quantity, item.sharedBy)
        ?? createQuantitySplits(quantity, item.sharedBy);
      const nextSplits = splits.map(split => {
        if (split.unitIndex !== unitIndex) return split;
        const sharedBy = split.sharedBy.includes(personId)
          ? split.sharedBy.filter(id => id !== personId)
          : [...split.sharedBy, personId];
        return { ...split, sharedBy };
      });

      return {
        ...item,
        quantitySplits: nextSplits,
        sharedBy: dedupePersonIds(nextSplits.flatMap(split => split.sharedBy)),
      };
    }));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const onSubmit = () => {
    handleSubmitExpense(
      description,
      totalAmount,
      category,
      expenseDate,
      payers,
      splitMethod,
      selectedPeopleEqual,
      unequalShares,
      items,
      isMultiplePayers,
      false, // isCelebrationMode
      '', // celebrationPayerId
      0, // actualCelebrationAmount
      amountToSplit,
      undefined, // expenseToEdit
      defaultItemCategory,
      setIsLoading
    );
  };

  if (isLoadingData) {
    return (
      <LoadingRegion label="Loading smart scan" className="h-full">
        <Card className="flex h-full flex-col overflow-hidden rounded-lg border shadow-xl">
          <CardHeader className="border-b p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <Skeleton className="h-8 w-44" />
                </div>
                <Skeleton className="h-4 w-full max-w-xl" />
              </div>
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="pt-1">
              <StepRailSkeleton />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <section className="overflow-hidden rounded-lg border bg-background">
                <div className="flex min-h-[360px] flex-col items-center justify-center p-5 text-center sm:p-8">
                  <Skeleton className="h-20 w-20 rounded-lg" />
                  <Skeleton className="mt-5 h-7 w-56" />
                  <Skeleton className="mt-3 h-4 w-full max-w-md" />
                  <Skeleton className="mt-2 h-4 w-full max-w-sm" />
                  <div className="mt-6 grid w-full max-w-sm gap-3 sm:grid-cols-2">
                    <Skeleton className="h-12 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                  </div>
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-lg border bg-background p-4">
                  <SkeletonSectionHeader width="w-36" />
                  <div className="mt-4 space-y-3">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="flex gap-2">
                        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                        <Skeleton className="h-4 w-full max-w-[260px]" />
                      </div>
                    ))}
                  </div>
                </section>
                <Skeleton className="h-11 w-full rounded-lg" />
              </aside>
            </div>
          </CardContent>
          <CardFooter className="border-t p-4 sm:p-6">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
              <Skeleton className="h-10 w-full rounded-lg sm:w-28" />
              <Skeleton className="h-10 w-full rounded-lg sm:w-36" />
            </div>
          </CardFooter>
        </Card>
      </LoadingRegion>
    );
  }

  if (!isLoadingData && people.length === 0) {
    return (
      <Card className="flex h-full flex-col rounded-lg border shadow-xl">
        <AppEmptyState
          icon={Users}
          title="Add People First"
          description="Smart Scan needs participants before it can prepare a split."
          size="page"
        />
      </Card>
    );
  }

  const stepDescription = {
    upload: 'Capture a clear receipt and let Smart Scan prepare the expense.',
    analyzing: 'Smart Scan is reading line items, totals, and taxes.',
    split: 'Review what was extracted and choose the split style.',
    form: 'Confirm the expense details before saving.',
  }[step];

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-lg border shadow-xl">
      <CardHeader className="border-b p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold leading-tight text-primary">Smart Scan</CardTitle>
                <CardDescription className="mt-1 text-sm">{stepDescription}</CardDescription>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded">
              {people.length} participants
            </Badge>
            {step !== 'upload' && step !== 'analyzing' && (
              <Button variant="outline" size="sm" onClick={handleReset} className="h-9 min-w-0 max-w-full overflow-hidden rounded-lg px-3">
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">Start Over</span>
              </Button>
            )}
          </div>
        </div>

        <div className="pt-1">
          <StepRail step={step} />
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        {step === 'upload' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <section className="overflow-hidden rounded-lg border bg-background">
              {!imagePreview ? (
                <div
                  className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center p-5 text-center transition-colors hover:bg-primary/5 sm:p-8"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="grid h-20 w-20 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">Capture the receipt</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Use a clear, uncropped photo. Smart Scan will compress it locally before reading the bill.
                  </p>
                  <div className="mt-6 grid w-full max-w-sm gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="h-12 min-w-0 overflow-hidden rounded-lg px-3"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    >
                      <Upload className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">Browse</span>
                    </Button>
                    <Button
                      className="h-12 min-w-0 overflow-hidden rounded-lg px-3"
                      onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                    >
                      <Camera className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">Camera</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="relative flex min-h-[320px] items-center justify-center bg-muted/30 p-3">
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="max-h-[520px] w-auto max-w-full rounded-md object-contain shadow-sm"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-3 h-9 w-9 rounded-md bg-background/90 shadow-sm"
                      onClick={() => {
                        setImagePreview(null);
                        setImageBase64(null);
                        setImageMimeType(null);
                        setCompressionInfo(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border-t p-4 lg:border-l lg:border-t-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Image ready</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Check the receipt is readable, then start the scan.
                    </p>
                    {compressionInfo && (
                      <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Zap className="h-3.5 w-3.5 text-primary" />
                          Optimized
                        </div>
                        <p className="mt-1">
                          {formatFileSize(compressionInfo.original)} to {formatFileSize(compressionInfo.compressed)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-lg border bg-background p-4">
                <SectionTitle
                  icon={FileImage}
                  title="Scan readiness"
                  subtitle="Best results come from bright, flat, full-receipt images."
                />
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    'JPEG, PNG, and WebP are supported.',
                    'Large photos are compressed before upload.',
                    'Items, taxes, totals, and restaurant names are extracted.',
                  ].map((item) => (
                    <div key={item} className="flex gap-2 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>

              {isCompressing && (
                <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Optimizing image...
                </div>
              )}

              {scanError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {canRetry && imageBase64 && (
                <Button onClick={handleScan} variant="outline" className="h-11 w-full min-w-0 overflow-hidden rounded-lg px-3" disabled={isCompressing}>
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Retry Scan</span>
                </Button>
              )}
            </aside>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  if (file.size > 8 * 1024 * 1024) {
                    setScanError('Large image detected. Compressing...');
                  }
                  handleFileSelect(file);
                }
              }}
            />
          </div>
        )}

        {step === 'analyzing' && (
          <div className="grid min-h-[420px] gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
            <div className="flex justify-center">
              {imagePreview ? (
                <div className="relative h-[360px] w-full max-w-[240px] overflow-hidden rounded-lg border bg-muted/30 shadow-sm">
                  <img src={imagePreview} alt="Scanning" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="animate-scan-line absolute inset-x-0 h-1 bg-primary" />
                  </div>
                  <div className="absolute inset-0 bg-primary/5" />
                </div>
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Loader2 className="h-10 w-10 animate-spin" />
                </div>
              )}
            </div>

            <section className="rounded-lg border bg-background p-5 sm:p-6">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <h3 className="text-xl font-semibold">Reading your receipt</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Smart Scan is extracting line items, totals, and taxes. This usually takes 5-15 seconds.
              </p>
              <div className="mt-6 space-y-3">
                <Progress value={ANALYZING_STAGES[analyzingMessageIndex]?.progress || 0} className="h-2" />
                <p className="text-sm font-medium text-foreground">
                  {ANALYZING_STAGES[analyzingMessageIndex]?.message}
                </p>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {ANALYZING_STAGES.map((stage, index) => (
                  <div
                    key={stage.message}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      index <= analyzingMessageIndex
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    {stage.message}
                  </div>
                ))}
              </div>
              <Button onClick={handleCancelScan} variant="outline" size="sm" className="mt-6 h-10 min-w-0 overflow-hidden rounded-lg px-3">
                <X className="h-4 w-4 shrink-0" />
                <span className="min-w-0 truncate">Cancel Scan</span>
              </Button>
            </section>
          </div>
        )}

        {step === 'split' && parsedData && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section className="rounded-lg border bg-primary/5 p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <SectionTitle
                    icon={Receipt}
                    title={parsedData.restaurant_name || 'Receipt scanned'}
                    subtitle={parsedData.date ? new Date(parsedData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not detected'}
                  />
                  <div className="sm:text-right">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(parsedData.total_amount)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-background/70 p-3">
                    <p className="text-[11px] text-muted-foreground">Items</p>
                    <p className="text-base font-semibold">{parsedData.items.length}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-3">
                    <p className="text-[11px] text-muted-foreground">Taxes</p>
                    <p className="text-base font-semibold">{parsedData.taxes.length}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-3">
                    <p className="text-[11px] text-muted-foreground">Charges</p>
                    <p className="text-base font-semibold">{parsedData.additional_charges.length}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border bg-background p-4 sm:p-5">
                <SectionTitle
                  icon={CreditCard}
                  title="Detected line items"
                  subtitle="Review the extracted bill before choosing a split."
                />
                <div className="mt-4 max-h-[320px] space-y-1 overflow-y-auto pr-1">
                  {parsedData.items.map((item, i) => (
                    <div key={`${item.name}-${i}`} className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity > 1
                            ? `Quantity ${item.quantity}`
                            : item.category_name || item.category_hint}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold">{formatCurrency(item.total_price)}</span>
                    </div>
                  ))}
                </div>
                {(parsedData.taxes.length > 0 || parsedData.additional_charges.length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                    {parsedData.taxes.map((tax, i) => (
                      <Badge key={`tax-${i}`} variant="outline" className="rounded">
                        {tax.label}: {formatCurrency(tax.amount)}
                      </Badge>
                    ))}
                    {parsedData.additional_charges
                      .filter((charge) => Math.abs(charge.amount) > 0.01)
                      .map((charge, i) => (
                        <Badge key={`charge-${i}`} variant="outline" className="rounded">
                          {charge.label}: {formatCurrency(charge.amount)}
                        </Badge>
                      ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-lg border bg-background p-4 sm:p-5">
                <SectionTitle
                  icon={Wallet}
                  title="Choose split style"
                  subtitle="You can still edit participants and item shares before saving."
                />
                <div className="mt-4">
                  <SplitMethodSelector splitMethod={splitMethod} setSplitMethod={setSplitMethod} />
                </div>
              </section>
            </aside>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-5 sm:space-y-6">
            <section className="rounded-lg border bg-primary/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">Generated expense</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Review the details Smart Scan prepared from the receipt.
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(amountToSplit)}</p>
                </div>
              </div>
            </section>

            <SettleEaseErrorBoundary componentName="Expense Basic Info" size="medium">
              <ExpenseBasicInfo
                description={description}
                setDescription={setDescription}
                totalAmount={totalAmount}
                setTotalAmount={setTotalAmount}
                category={category}
                setCategory={setCategory}
                expenseDate={expenseDate}
                setExpenseDate={setExpenseDate}
                calendarOpen={calendarOpen}
                setCalendarOpen={setCalendarOpen}
                dynamicCategories={dynamicCategories}
              />
            </SettleEaseErrorBoundary>

            <SettleEaseErrorBoundary componentName="Payment Details" size="medium">
              <section className="rounded-lg border bg-background p-4 sm:p-5">
                <SectionTitle icon={Wallet} title="Payment details" />
                <div className="mt-4">
                  <PayerInputSection
                    payers={payers}
                    people={people}
                    isMultiplePayers={isMultiplePayers}
                    handlePayerChange={handlePayerChange}
                    addPayer={addPayer}
                    removePayer={removePayer}
                    onToggleMultiplePayers={handleToggleMultiplePayers}
                    defaultPayerId={defaultPayerId}
                  />
                </div>
              </section>
            </SettleEaseErrorBoundary>

            <SettleEaseErrorBoundary componentName="Split Method" size="medium">
              <section className="rounded-lg border bg-background p-4 sm:p-5">
                <SectionTitle icon={Users} title="Split method" />
                <div className="mt-4">
                  <SplitMethodSelector splitMethod={splitMethod} setSplitMethod={setSplitMethod} />
                </div>

                {splitMethod === 'equal' && (
                  <div className="mt-4">
                    <EqualSplitSection
                      people={people}
                      selectedPeopleEqual={selectedPeopleEqual}
                      handleEqualSplitChange={handleEqualSplitChange}
                    />
                  </div>
                )}
                {splitMethod === 'unequal' && (
                  <div className="mt-4">
                    <UnequalSplitSection
                      people={people}
                      unequalShares={unequalShares}
                      handleUnequalShareChange={handleUnequalShareChange}
                      amountToSplit={amountToSplit}
                    />
                  </div>
                )}
                {splitMethod === 'itemwise' && (
                  <div className="mt-4">
                    <ItemwiseSplitSection
                      items={items}
                      people={people}
                      dynamicCategories={dynamicCategories}
                      handleItemChange={handleItemChange}
                      handleItemSharedByChange={handleItemSharedByChange}
                      handleToggleQuantitySplits={handleToggleQuantitySplits}
                      handleItemQuantitySplitChange={handleItemQuantitySplitChange}
                      removeItem={removeItem}
                      addItem={handleAddItem}
                    />
                  </div>
                )}
              </section>
            </SettleEaseErrorBoundary>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t bg-background/95 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {step === 'upload' && (
          <>
            <p className="hidden text-sm text-muted-foreground sm:block">
              {imageBase64 ? 'Ready when the receipt is readable.' : 'Add an image to begin.'}
            </p>
            <Button
              onClick={handleScan}
              disabled={!imageBase64 || isCompressing}
              className="h-12 w-full min-w-0 overflow-hidden rounded-lg px-3 sm:h-11 sm:w-auto sm:px-4"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span className="min-w-0 truncate">Processing...</span>
                </>
              ) : (
                <>
                  <ScanLine className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">Scan Receipt</span>
                </>
              )}
            </Button>
          </>
        )}

        {step === 'split' && (
          <>
            <Button variant="outline" onClick={() => setStep('upload')} className="h-11 w-full min-w-0 overflow-hidden rounded-lg px-3 sm:w-auto sm:px-4">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Back</span>
            </Button>
            <Button onClick={handleSplitMethodConfirm} className="h-11 w-full min-w-0 overflow-hidden rounded-lg px-3 sm:w-auto sm:px-4">
              <span className="min-w-0 truncate">Continue</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </>
        )}

        {step === 'form' && (
          <>
            <Button variant="outline" onClick={() => setStep('split')} className="h-11 w-full min-w-0 overflow-hidden rounded-lg px-3 sm:w-auto sm:px-4">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Back</span>
            </Button>
            <Button onClick={onSubmit} disabled={isLoading || people.length === 0} className="h-11 w-full min-w-0 overflow-hidden rounded-lg px-3 sm:w-auto sm:px-4">
              {isLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Check className="h-4 w-4 shrink-0" />
              )}
              <span className="min-w-0 truncate">{isLoading ? 'Adding...' : 'Add Expense'}</span>
            </Button>
          </>
        )}
      </CardFooter>

      <style jsx>{`
        @keyframes scan-line {
          0% { top: -4px; opacity: 0.4; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { top: 100%; opacity: 0.4; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </Card>
  );
}
