"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ScanLine, Upload, Camera, ArrowLeft, ArrowRight, Check, Loader2,
  AlertTriangle, RotateCcw, Sparkles, Receipt, ImageIcon,
  CreditCard, Wallet, X, Zap, FileImage
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

interface ScanReceiptTabProps {
  people: Person[];
  onExpenseAdded: () => void;
  dynamicCategories: DynamicCategory[];
  isLoadingPeople?: boolean;
  isLoadingCategories?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

type WizardStep = 'upload' | 'analyzing' | 'split' | 'form';

const ANALYZING_STAGES = [
  { message: 'Uploading image...', progress: 15 },
  { message: 'AI analyzing receipt...', progress: 35 },
  { message: 'Detecting items...', progress: 55 },
  { message: 'Extracting prices...', progress: 75 },
  { message: 'Parsing taxes...', progress: 90 },
  { message: 'Finalizing...', progress: 98 },
];

function fuzzyMatchCategory(hint: string, categories: DynamicCategory[]): string {
  if (!hint || categories.length === 0) return categories[0]?.name || '';

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

  for (const cat of categories) {
    const catLower = cat.name.toLowerCase();
    for (const kw of keywords) {
      if (catLower.includes(kw) || kw.includes(catLower)) {
        return cat.name;
      }
    }
  }

  return categories[0]?.name || '';
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
  const [items, setItems] = useState<ExpenseItemDetail[]>([{ id: Date.now().toString(), name: '', price: '', sharedBy: [], categoryName: '' }]);
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
        body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
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
  }, [imageBase64, imageMimeType]);

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
      const primaryHint = parsedData.items[0].category_hint;
      setCategory(fuzzyMatchCategory(primaryHint, dynamicCategories));
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

      // Convert parsed items to ExpenseItemDetail
      const expenseItems: ExpenseItemDetail[] = parsedData.items.map((item, idx) => ({
        id: `scan-item-${idx}-${Date.now()}`,
        name: item.quantity > 1 ? `${item.name} (x${item.quantity})` : item.name,
        price: item.total_price.toFixed(2),
        sharedBy: [...allPeopleIds],
        categoryName: fuzzyMatchCategory(item.category_hint, dynamicCategories) || defaultItemCategory,
      }));

      // Add taxes as separate items
      parsedData.taxes.forEach((tax, idx) => {
        expenseItems.push({
          id: `scan-tax-${idx}-${Date.now()}`,
          name: tax.label,
          price: tax.amount.toFixed(2),
          sharedBy: [...allPeopleIds],
          categoryName: defaultItemCategory,
        });
      });

      // Add additional charges
      parsedData.additional_charges.forEach((charge, idx) => {
        if (Math.abs(charge.amount) > 0.01) {
          expenseItems.push({
            id: `scan-charge-${idx}-${Date.now()}`,
            name: charge.label,
            price: charge.amount.toFixed(2),
            sharedBy: [...allPeopleIds],
            categoryName: defaultItemCategory,
          });
        }
      });

      setItems(expenseItems);
    }

    setStep('form');
  }, [parsedData, splitMethod, people, dynamicCategories, defaultPayerId, defaultItemCategory]);

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
    setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: [], categoryName: '' }]);
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
    setItems([...items, { id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: category || defaultItemCategory }]);
  };

  const handleItemChange = <K extends keyof ExpenseItemDetail>(index: number, field: K, value: ExpenseItemDetail[K]) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleItemSharedByChange = (itemIndex: number, personId: string) => {
    const newItems = [...items];
    const currentSharedBy = newItems[itemIndex].sharedBy;
    newItems[itemIndex].sharedBy = currentSharedBy.includes(personId)
      ? currentSharedBy.filter(id => id !== personId)
      : [...currentSharedBy, personId];
    setItems(newItems);
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

  // Loading state
  if (isLoadingData) {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col bg-background">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <Skeleton className="h-7 sm:h-8 w-full max-w-[250px]" />
          <Skeleton className="h-4 w-full sm:w-96 mt-2" />
        </CardHeader>
        <CardContent className="flex-1 px-4 sm:px-6 py-8 flex flex-col items-center justify-center gap-4">
          <Skeleton className="h-48 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (!isLoadingData && people.length === 0) {
    return (
      <Card className="text-center py-8 sm:py-10 shadow-xl rounded-lg h-full flex flex-col items-center justify-center p-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center justify-center">
            Add People First
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You need to add people before scanning receipts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl rounded-lg h-full flex flex-col">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <ScanLine className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Smart Scan
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {step === 'upload' && 'Upload a receipt photo to auto-fill your expense'}
              {step === 'analyzing' && 'AI is reading your receipt...'}
              {step === 'split' && 'Choose how to split this expense'}
              {step === 'form' && 'Review and edit the pre-filled expense'}
            </CardDescription>
          </div>
          {step !== 'upload' && step !== 'analyzing' && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
              <RotateCcw className="h-4 w-4 mr-1" /> Start Over
            </Button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-4">
          {(['upload', 'analyzing', 'split', 'form'] as WizardStep[]).map((s, i) => (
            <React.Fragment key={s}>
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= ['upload', 'analyzing', 'split', 'form'].indexOf(step)
                  ? 'bg-primary'
                  : 'bg-muted'
              }`} />
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pt-4 sm:pt-6">
        {/* === STEP 1: Upload === */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Drop zone / preview */}
            {!imagePreview ? (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[280px]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <ImageIcon className="h-10 w-10 text-primary" />
                </div>
                <p className="text-base sm:text-lg font-medium mb-1">Drop a receipt image here</p>
                <p className="text-sm text-muted-foreground mb-6">or tap to browse files</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    <Upload className="h-4 w-4 mr-2" /> Browse
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  >
                    <Camera className="h-4 w-4 mr-2" /> Camera
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border bg-muted/20 max-h-[400px] flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Receipt preview"
                    className="max-h-[400px] w-auto object-contain"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
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
                
                {/* Compression info */}
                {compressionInfo && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <FileImage className="h-3.5 w-3.5" />
                    <span>
                      Compressed from {formatFileSize(compressionInfo.original)} to {formatFileSize(compressionInfo.compressed)}
                    </span>
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            )}

            {/* Compression progress */}
            {isCompressing && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Optimizing image...</span>
              </div>
            )}

            {scanError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{scanError}</span>
              </div>
            )}

            {/* Retry button */}
            {canRetry && imageBase64 && (
              <Button
                onClick={handleScan}
                variant="outline"
                className="w-full h-11"
                disabled={isCompressing}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry Scan
              </Button>
            )}

            {/* Hidden file inputs */}
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
                  // Show warning for very large files
                  if (file.size > 8 * 1024 * 1024) {
                    setScanError('Large image detected. Compressing...');
                  }
                  handleFileSelect(file);
                }
              }}
            />
          </div>
        )}

        {/* === STEP 2: Analyzing === */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 space-y-6">
            <div className="relative">
              {imagePreview && (
                <div className="w-48 h-64 rounded-xl overflow-hidden border-2 border-primary/30 relative">
                  <img src={imagePreview} alt="Scanning" className="w-full h-full object-cover" />
                  {/* Scanning animation overlay */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                  </div>
                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                </div>
              )}
              {!imagePreview && (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="w-full max-w-xs space-y-3">
              <Progress value={ANALYZING_STAGES[analyzingMessageIndex]?.progress || 0} className="h-2" />
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary font-medium">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  {ANALYZING_STAGES[analyzingMessageIndex]?.message}
                </div>
                <p className="text-sm text-muted-foreground">
                  This usually takes 5-15 seconds
                </p>
              </div>
            </div>

            {/* Cancel button */}
            <Button
              onClick={handleCancelScan}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}

        {/* === STEP 3: Split Method === */}
        {step === 'split' && parsedData && (
          <div className="space-y-6">
            {/* Extraction summary card */}
            <div className="p-4 sm:p-5 rounded-xl border bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <Receipt className="h-5 w-5" />
                Receipt Scanned Successfully
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {parsedData.restaurant_name && (
                  <div>
                    <p className="text-muted-foreground text-xs">Restaurant</p>
                    <p className="font-medium">{parsedData.restaurant_name}</p>
                  </div>
                )}
                {parsedData.date && (
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{new Date(parsedData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Items Found</p>
                  <p className="font-medium">{parsedData.items.length} items</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Amount</p>
                  <p className="font-semibold text-primary text-lg">{formatCurrency(parsedData.total_amount)}</p>
                </div>
              </div>
              {parsedData.taxes.length > 0 && (
                <div className="pt-2 border-t border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Taxes detected:</p>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.taxes.map((tax, i) => (
                      <span key={i} className="text-xs bg-primary/10 px-2 py-1 rounded-md">
                        {tax.label}: {formatCurrency(tax.amount)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Items breakdown */}
            <div className="p-4 sm:p-5 border rounded-lg">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Items Detected
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {parsedData.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-muted/50 last:border-0">
                    <span className="flex-1 mr-2">
                      {item.name}
                      {item.quantity > 1 && <span className="text-muted-foreground"> x{item.quantity}</span>}
                    </span>
                    <span className="font-mono font-medium">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Split method selector */}
            <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
              <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
                <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                How do you want to split this?
              </h3>
              <SplitMethodSelector splitMethod={splitMethod} setSplitMethod={setSplitMethod} />
            </div>
          </div>
        )}

        {/* === STEP 4: Pre-filled Form === */}
        {step === 'form' && (
          <div className="space-y-6 sm:space-y-8">
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
              <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
                <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
                  <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Payment Details
                </h3>
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
            </SettleEaseErrorBoundary>

            <SettleEaseErrorBoundary componentName="Split Method" size="medium">
              <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
                <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
                  <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Split Method
                </h3>
                <SplitMethodSelector splitMethod={splitMethod} setSplitMethod={setSplitMethod} />

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
                      removeItem={removeItem}
                      addItem={handleAddItem}
                    />
                  </div>
                )}
              </div>
            </SettleEaseErrorBoundary>
          </div>
        )}
      </CardContent>

      {/* Footer with action buttons */}
      <CardFooter className="border-t p-4 sm:pt-6 flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-3">
        {step === 'upload' && (
          <>
            <div />
            <Button
              onClick={handleScan}
              disabled={!imageBase64 || isCompressing}
              className="w-full sm:w-auto h-12 sm:h-11"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan Receipt
                </>
              )}
            </Button>
          </>
        )}

        {step === 'split' && (
          <>
            <Button variant="outline" size="sm" onClick={() => setStep('upload')} className="w-full sm:w-auto">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={handleSplitMethodConfirm} className="w-full sm:w-auto h-11">
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </>
        )}

        {step === 'form' && (
          <>
            <Button variant="outline" size="sm" onClick={() => setStep('split')} className="w-full sm:w-auto">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={onSubmit} disabled={isLoading || people.length === 0} className="w-full sm:w-auto h-11">
              <Check className="mr-1 h-4 w-4" />
              {isLoading ? 'Adding...' : 'Add Expense'}
            </Button>
          </>
        )}
      </CardFooter>

      {/* CSS for scan animation */}
      <style jsx>{`
        @keyframes scan-line {
          0% { top: -4px; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </Card>
  );
}
