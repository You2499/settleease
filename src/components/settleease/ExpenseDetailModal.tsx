"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as ShadDialogDescription, 
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info, User, PartyPopper, Users, Scale, SlidersHorizontal, ClipboardList, ReceiptText, ShoppingBag, Coins, CreditCard, ListTree, Settings2, Copy, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, ExpenseItemDetail, PayerShare, CelebrationContribution, PersonItemShareDetails, PersonAggregatedItemShares, Category } from '@/lib/settleease/types';
import { AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";


interface ExpenseDetailModalProps {
  expense: Expense;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: Category[];
}

// WhatsApp SVG as a React component
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 175.216 175.552" width="20" height="20" {...props}>
    <defs>
      <linearGradient id="b" x1="85.915" x2="86.535" y1="32.567" y2="137.092" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#57d163"/>
        <stop offset="1" stopColor="#23b33a"/>
      </linearGradient>
      <filter id="a" width="1.115" height="1.114" x="-.057" y="-.057" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="3.531"/>
      </filter>
    </defs>
    <path fill="#b3b3b3" d="m54.532 138.45 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.523h.023c33.707 0 61.139-27.426 61.153-61.135.006-16.335-6.349-31.696-17.895-43.251A60.75 60.75 0 0 0 87.94 25.983c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.558zm-40.811 23.544L24.16 123.88c-6.438-11.154-9.825-23.808-9.821-36.772.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954zm0 0" filter="url(#a)"/>
    <path fill="#fff" d="m12.966 161.238 10.439-38.114a73.42 73.42 0 0 1-9.821-36.772c.017-40.556 33.021-73.55 73.578-73.55 19.681.01 38.154 7.669 52.047 21.572s21.537 32.383 21.53 52.037c-.018 40.553-33.027 73.553-73.578 73.553h-.032c-12.313-.005-24.412-3.094-35.159-8.954z"/>
    <path fill="url(#linearGradient1780)" d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.312-6.179 22.559 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.518 31.126 8.524h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.929z"/>
    <path fill="url(#b)" d="M87.184 25.227c-33.733 0-61.166 27.423-61.178 61.13a60.98 60.98 0 0 0 9.349 32.535l1.455 2.313-6.179 22.558 23.146-6.069 2.235 1.324c9.387 5.571 20.15 8.517 31.126 8.523h.023c33.707 0 61.14-27.426 61.153-61.135a60.75 60.75 0 0 0-17.895-43.251 60.75 60.75 0 0 0-43.235-17.928z"/>
    <path fill="#fff" fillRule="evenodd" d="M68.772 55.603c-1.378-3.061-2.828-3.123-4.137-3.176l-3.524-.043c-1.226 0-3.218.46-4.902 2.3s-6.435 6.287-6.435 15.332 6.588 17.785 7.506 19.013 12.718 20.381 31.405 27.75c15.529 6.124 18.689 4.906 22.061 4.6s10.877-4.447 12.408-8.74 1.532-7.971 1.073-8.74-1.685-1.226-3.525-2.146-10.877-5.367-12.562-5.981-2.91-.919-4.137.921-4.746 5.979-5.819 7.206-2.144 1.381-3.984.462-7.76-2.861-14.784-9.124c-5.465-4.873-9.154-10.891-10.228-12.73s-.114-2.835.808-3.751c.825-.824 1.838-2.147 2.759-3.22s1.224-1.84 1.836-3.065.307-2.301-.153-3.22-4.032-10.011-5.666-13.647"/>
  </svg>
);

export default function ExpenseDetailModal({ expense, isOpen, onOpenChange, peopleMap, getCategoryIconFromName, categories }: ExpenseDetailModalProps) {
  if (!expense) return null;

  const CategoryIcon = getCategoryIconFromName(expense.category);
  const SplitIcon = useMemo(() => {
    if (expense.split_method === 'equal') return Scale;
    if (expense.split_method === 'unequal') return SlidersHorizontal;
    if (expense.split_method === 'itemwise') return ClipboardList;
    return ReceiptText;
  }, [expense.split_method]);

  const totalOriginalBill = Number(expense.total_amount);
  const celebrationContributionOpt: CelebrationContribution | null | undefined = expense.celebration_contribution;
  const celebrationAmount = celebrationContributionOpt ? Number(celebrationContributionOpt.amount) : 0;
  const amountEffectivelySplit = Math.max(0, totalOriginalBill - celebrationAmount);

  const involvedPersonIdsOverall = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(expense.paid_by)) {
      expense.paid_by.forEach(p => ids.add(p.personId));
    }
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach(s => ids.add(s.personId));
    }
    if (celebrationContributionOpt) {
        ids.add(celebrationContributionOpt.personId);
    }
    if (expense.split_method === 'itemwise' && Array.isArray(expense.items)) {
        expense.items.forEach(item => item.sharedBy.forEach(id => ids.add(id)));
    }
    return Array.from(ids);
  }, [expense, celebrationContributionOpt]);

  // Sort helper for person IDs by name
  const sortPersonIdsByName = (ids: string[]) =>
    ids.slice().sort((a, b) => (peopleMap[a] || '').localeCompare(peopleMap[b] || ''));

  // Sorted involved person IDs for all sections
  const sortedInvolvedPersonIdsOverall = useMemo(() => sortPersonIdsByName(involvedPersonIdsOverall), [involvedPersonIdsOverall, peopleMap]);

  // Sorted paid_by and shares for each section
  const sortedPaidBy = useMemo(() =>
    Array.isArray(expense.paid_by)
      ? expense.paid_by.slice().sort((a, b) => (peopleMap[a.personId] || '').localeCompare(peopleMap[b.personId] || ''))
      : []
  , [expense.paid_by, peopleMap]);

  const sortedShares = useMemo(() =>
    Array.isArray(expense.shares)
      ? expense.shares.slice().sort((a, b) => (peopleMap[a.personId] || '').localeCompare(peopleMap[b.personId] || ''))
      : []
  , [expense.shares, peopleMap]);

  const itemwiseBreakdownForDisplay = useMemo(() => {
    if (expense.split_method !== 'itemwise' || !Array.isArray(expense.items) || expense.items.length === 0) {
      return null;
    }
    
    const sumOfOriginalItemPrices = expense.items.reduce((sum, item) => sum + Number(item.price), 0);

    const reductionFactor = (sumOfOriginalItemPrices > 0.001 && amountEffectivelySplit >= 0) 
        ? (amountEffectivelySplit / sumOfOriginalItemPrices) 
        : (sumOfOriginalItemPrices === 0 && amountEffectivelySplit === 0 ? 1 : 0);

    const aggregatedData: PersonAggregatedItemShares = {};

    expense.items.forEach((item: ExpenseItemDetail) => {
      const originalItemPriceNum = Number(item.price);
      const adjustedItemPriceForSplit = Math.max(0, originalItemPriceNum * reductionFactor);

      if (item.sharedBy && item.sharedBy.length > 0) {
        const sharePerPersonForItem = (adjustedItemPriceForSplit > 0.001 && item.sharedBy.length > 0)
            ? adjustedItemPriceForSplit / item.sharedBy.length
            : 0;

        item.sharedBy.forEach((personId: string) => {
          if (!aggregatedData[personId]) {
            aggregatedData[personId] = { items: [], totalShareOfAdjustedItems: 0 };
          }
          aggregatedData[personId].items.push({
            itemId: item.id || `item-${Math.random()}`,
            itemName: item.name,
            originalItemPrice: originalItemPriceNum,
            adjustedItemPriceForSplit: adjustedItemPriceForSplit,
            shareForPerson: sharePerPersonForItem,
            sharedByCount: item.sharedBy.length,
            itemCategoryName: item.categoryName, 
          });
          aggregatedData[personId].totalShareOfAdjustedItems += sharePerPersonForItem;
        });
      }
    });

    // Sort each person's items by category, then by name
    Object.values(aggregatedData).forEach(personData => {
      personData.items.sort((a, b) => {
        const catA = (a.itemCategoryName || '').toLowerCase();
        const catB = (b.itemCategoryName || '').toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        // If same category, sort by item name
        const nameA = (a.itemName || '').toLowerCase();
        const nameB = (b.itemName || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });
    });

    return aggregatedData;
  }, [expense.split_method, expense.items, amountEffectivelySplit]);

  // For itemwise breakdown, sort person IDs by name (must be after itemwiseBreakdownForDisplay is defined)
  const sortedItemwiseBreakdownEntries = useMemo(() => {
    if (!itemwiseBreakdownForDisplay) return [];
    return Object.entries(itemwiseBreakdownForDisplay)
      .sort(([idA], [idB]) => (peopleMap[idA] || '').localeCompare(peopleMap[idB] || ''));
  }, [itemwiseBreakdownForDisplay, peopleMap]);

  const getItemCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return Settings2; 
    const iconDetail = AVAILABLE_CATEGORY_ICONS.find(icon => icon.label.toLowerCase().includes(categoryName.toLowerCase()) || icon.iconKey.toLowerCase() === categoryName.toLowerCase());
    if (iconDetail) return iconDetail.IconComponent;
    
    return getCategoryIconFromName(categoryName) || Settings2;
  };

  // Helper: get category rank (fallback to a large number if not found)
  const getCategoryRank = (catName?: string) => {
    if (!catName) return 9999;
    const cat = categories.find((c: Category) => c.name === catName);
    return cat?.rank ?? 9999;
  };

  // WhatsApp-formatted string generator
  function getWhatsAppExpenseDetails() {
    let lines = [];
    lines.push(`*Expense Details*`);
    lines.push(`*Description:* _${expense.description}_`);
    lines.push(`*Total Bill Amount:* ${formatCurrency(Number(expense.total_amount))}`);
    lines.push(`*Main Category:* _${expense.category}_`);
    lines.push('');
    lines.push(`*Paid By:*`);
    if (Array.isArray(expense.paid_by) && expense.paid_by.length > 0) {
      expense.paid_by.forEach((p: any) => {
        lines.push(`- ${peopleMap[p.personId] || 'Unknown'}: ${formatCurrency(Number(p.amount))}`);
      });
    } else {
      lines.push('_No payers listed._');
    }
    if (expense.celebration_contribution) {
      lines.push('');
      lines.push(`*Celebration Contribution:*`);
      lines.push(`- Contributed by: ${peopleMap[expense.celebration_contribution.personId] || 'Unknown'}`);
      lines.push(`- Amount: ${formatCurrency(expense.celebration_contribution.amount)}`);
    }
    lines.push('');
    lines.push(`*Net Amount For Splitting:* ${formatCurrency(Math.max(0, Number(expense.total_amount) - (expense.celebration_contribution ? Number(expense.celebration_contribution.amount) : 0)))}`);
    lines.push(`*Split Method:* _${expense.split_method}_`);
    if (expense.split_method === 'itemwise' && Array.isArray(expense.items) && expense.items.length > 0 && itemwiseBreakdownForDisplay) {
      lines.push('');
      lines.push(`*Item-wise Breakdown (by Person):*`);
      Object.entries(itemwiseBreakdownForDisplay).forEach(([personId, data]: any) => {
        lines.push(`\n*${peopleMap[personId] || 'Unknown'}*`);
        data.items.forEach((item: any) => {
          lines.push(`  - _${item.itemName}_: Original: ${formatCurrency(item.originalItemPrice)}, Their Share: ${formatCurrency(item.shareForPerson)} (shared by ${item.sharedByCount})`);
        });
        lines.push(`  _Total item share:_ *${formatCurrency(data.totalShareOfAdjustedItems)}*`);
      });
      lines.push('');
      lines.push(`*Original Items & Pricing:*`);
      if (expense.items) {
        // Group items by category
        const itemsByCategory: Record<string, ExpenseItemDetail[]> = {};
        expense.items.forEach((item: any) => {
          const cat = item.categoryName || '';
          if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
          itemsByCategory[cat].push(item);
        });
        const sortedCategoryNames = Object.keys(itemsByCategory).sort((a, b) => getCategoryRank(a) - getCategoryRank(b));
        sortedCategoryNames.forEach(catName => {
          if (catName) lines.push(`  *${catName}*`);
          itemsByCategory[catName].forEach(item => {
            const sortedSharedBy = sortPersonIdsByName(item.sharedBy);
            lines.push(`- _${item.name}_: ${formatCurrency(item.price)} (shared by: ${sortedSharedBy.map((id: string) => peopleMap[id] || 'Unknown').join(', ')})`);
          });
        });
      }
    }
    lines.push('');
    lines.push(`*Shares:*`);
    if (Array.isArray(expense.shares) && expense.shares.length > 0) {
      expense.shares.forEach((s: any) => {
        lines.push(`- ${peopleMap[s.personId] || 'Unknown'}: ${formatCurrency(Number(s.amount))}`);
      });
    } else {
      lines.push('_No shares listed._');
    }
    return lines.join('\n');
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getWhatsAppExpenseDetails());
      toast({ title: "Copied!", description: "Expense details copied for WhatsApp.", variant: "default" });
    } catch (e) {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-12 z-10"
          title="Copy for WhatsApp"
          onClick={handleCopy}
        >
          <WhatsAppIcon />
        </Button>
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between"> 
          <div className="flex items-center">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              Expense Details
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0"> {/* Adjusted pt-0 here */}
          <div className="space-y-4 sm:space-y-6 pt-2"> 
            
            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"/>General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0"> {/* pt-0 for card content */}
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground shrink-0 mr-2">Description:</span> 
                  <span className="font-medium text-left sm:text-right truncate" title={expense.description}>{expense.description}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-baseline">
                  <span className="text-muted-foreground shrink-0 mr-2">Total Bill Amount:</span> 
                  <span className="font-bold text-lg sm:text-xl text-primary text-left sm:text-right">{formatCurrency(totalOriginalBill)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="text-muted-foreground shrink-0 mr-2">Main Category:</span> 
                  <span className="font-medium flex items-center self-start sm:self-auto"><CategoryIcon className="mr-1.5 h-4 w-4" /> {expense.category}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="text-muted-foreground shrink-0 mr-2">Expense Date:</span>
                    <span className="font-medium flex items-center self-start sm:self-auto">
                        <Calendar className="mr-1.5 h-4 w-4" /> 
                        {expense.created_at ? new Date(expense.created_at).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}
                    </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold"><CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"/>Payment & Contribution</CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0"> {/* pt-0 for card content */}
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">Paid By:</span>
                  {sortedPaidBy.length > 0 ? (
                    <ul className="list-disc list-inside pl-4 space-y-0.5">
                      {sortedPaidBy.map((p: PayerShare) => (
                        <li key={p.personId} className="flex justify-between">
                          <span>{peopleMap[p.personId] || 'Unknown'}</span>
                          <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pl-4 text-muted-foreground italic">No payers listed.</p>
                  )}
                </div>
                {celebrationContributionOpt && (
                  <>
                    <Separator className="my-2 sm:my-2.5" />
                    <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <PartyPopper className="mr-2 h-4 w-4 flex-shrink-0"/>
                        <span className="font-medium">Celebration Contribution:</span>
                    </div>
                    <div className="pl-4 space-y-0.5">
                        <div className="flex justify-between">
                        <span>Contributed by:</span>
                        <span className="font-medium text-right">{peopleMap[celebrationContributionOpt.personId] || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-bold text-primary text-right">{formatCurrency(celebrationContributionOpt.amount)}</span>
                        </div>
                    </div>
                  </>
                )}
                <Separator className="my-2 sm:my-2.5" />
                <div className="flex justify-between font-semibold">
                  <span>Net Amount For Splitting: {formatCurrency(amountEffectivelySplit)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  <SplitIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"/> Split Method: <span className="ml-1.5 capitalize font-normal text-foreground/90">{expense.split_method}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 sm:space-y-3 pt-0"> {/* pt-0 for card content */}
                {expense.split_method === 'equal' && Array.isArray(expense.shares) && expense.shares.length > 0 && (
                  <div>
                    <CardDescription className="mb-1 sm:mb-1.5 text-xs">
                        Split equally among {expense.shares.length} {expense.shares.length === 1 ? "person" : "people"} based on the amount of <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong>.
                    </CardDescription>
                    <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-0.5">
                      {sortedShares.map(share => (
                        <li key={share.personId}>{peopleMap[share.personId] || 'Unknown Person'}</li>
                      ))}
                    </ul>
                     <p className="mt-1.5 sm:mt-2 font-medium">Share per person: <span className="text-primary">{formatCurrency(expense.shares[0]?.amount || 0)}</span></p>
                  </div>
                )}
                {expense.split_method === 'unequal' && Array.isArray(expense.shares) && expense.shares.length > 0 && (
                   <div>
                    <CardDescription className="mb-1 sm:mb-1.5 text-xs">Specific shares assigned based on the amount of <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong>.</CardDescription>
                    <ul className="space-y-1">
                      {sortedShares.map(share => (
                        <li key={share.personId} className="flex justify-between p-1.5 bg-secondary/20 rounded-sm">
                          <span>{peopleMap[share.personId] || 'Unknown Person'}</span>
                          <span className="font-medium text-primary">{formatCurrency(Number(share.amount))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {expense.split_method === 'itemwise' && Array.isArray(expense.items) && expense.items.length > 0 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                        <h4 className="font-medium text-muted-foreground mb-1 sm:mb-1.5 flex items-center"><ShoppingBag className="mr-2 h-4 w-4"/>Original Items & Prices:</h4>
                        <ul className="space-y-1 text-xs">
                        {expense.items && (
                          <>
                            {(() => {
                              // Group items by category
                              const itemsByCategory: Record<string, ExpenseItemDetail[]> = {};
                              expense.items!.forEach(item => {
                                const cat = item.categoryName || '';
                                if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
                                itemsByCategory[cat].push(item);
                              });
                              const sortedCategoryNames = Object.keys(itemsByCategory).sort((a, b) => getCategoryRank(a) - getCategoryRank(b));
                              return sortedCategoryNames.flatMap(catName => [
                                catName ? (
                                  <li key={catName} className="font-semibold text-primary/80 text-xs mt-2 mb-1 flex items-center">
                                    {getItemCategoryIcon(catName) && React.createElement(getItemCategoryIcon(catName), { className: "mr-1.5 h-3 w-3 text-muted-foreground flex-shrink-0" })}
                                    {catName}
                                  </li>
                                ) : null,
                                ...itemsByCategory[catName].map(item => {
                                  const ItemCatIcon = getItemCategoryIcon(item.categoryName);
                                  return (
                                    <li key={item.id} className="p-1.5 bg-secondary/20 rounded-sm">
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium truncate flex items-center mr-2" title={item.name}>
                                          <ItemCatIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                          {item.name}
                                          {item.categoryName && item.categoryName !== expense.category && (
                                            <span className="ml-1.5 text-gray-500 text-[10px] italic">({item.categoryName})</span>
                                          )}
                                        </span>
                                        <span className="font-semibold text-primary whitespace-nowrap">{formatCurrency(Number(item.price))}</span>
                                      </div>
                                      {(() => {
                                        const sortedSharedBy = sortPersonIdsByName(item.sharedBy);
                                        return (
                                          <div className="text-muted-foreground/80 pl-5 text-[10px] sm:text-xs truncate" title={`Shared by: ${sortedSharedBy.map(pid => peopleMap[pid] || 'Unknown').join(', ')}`}>Shared by: {sortedSharedBy.map(pid => peopleMap[pid] || 'Unknown').join(', ')}</div>
                                        );
                                      })()}
                                    </li>
                                  );
                                })
                              ]);
                            })()}
                          </>
                        )}
                        </ul>
                         <p className="text-xs text-muted-foreground mt-1 sm:mt-1.5">Total of original items: {formatCurrency(expense.items.reduce((sum, item) => sum + Number(item.price), 0))}</p>
                    </div>
                    {itemwiseBreakdownForDisplay && amountEffectivelySplit > 0.001 && (
                        <div>
                            <h4 className="font-medium text-muted-foreground mb-1 sm:mb-1.5 flex items-center"><ListTree className="mr-2 h-4 w-4"/>Individual Item Shares (Adjusted):</h4>
                            <CardDescription className="text-xs mb-1.5 sm:mb-2">
                                Based on splitting {formatCurrency(amountEffectivelySplit)}. Original item prices are proportionally reduced before calculating individual shares.
                            </CardDescription>
                            <div className="space-y-2 sm:space-y-2.5">
                            {sortedItemwiseBreakdownEntries.filter(([_,details]) => details.totalShareOfAdjustedItems > 0.001 ).map(([personId, details]) => (
                              <Card key={personId} className="p-2 sm:p-2.5 bg-secondary/20 shadow-none">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-1 sm:mb-1.5">
                                  <h5 className="font-semibold text-sm flex items-center">
                                    <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                    {peopleMap[personId] || 'Unknown Person'}
                                  </h5>
                                  <span className="text-xs font-semibold text-primary mt-0.5 sm:mt-0">
                                    Total Share: {formatCurrency(details.totalShareOfAdjustedItems)}
                                  </span>
                                </div>
                                {details.items.filter(itemShare => itemShare.shareForPerson > 0.001).length > 0 ? (
                                  <ul className="space-y-0.5 text-xs pl-1.5 border-l-2 border-primary/30">
                                    {details.items.filter(itemShare => itemShare.shareForPerson > 0.001).map((itemShare) => {
                                       const ItemShareCatIcon = getItemCategoryIcon(itemShare.itemCategoryName);
                                       return (
                                        <li key={itemShare.itemId} className="flex justify-between pl-1 sm:pl-1.5">
                                            <span className="truncate mr-1 flex items-center" title={itemShare.itemName}>
                                                <ItemShareCatIcon className="mr-1 h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                {itemShare.itemName}
                                            </span>
                                            <span className="text-muted-foreground whitespace-nowrap">
                                            {formatCurrency(itemShare.shareForPerson)}
                                            <span className="ml-1 text-gray-400 text-[9px] hidden sm:inline" title={`Original item price: ${formatCurrency(itemShare.originalItemPrice)}, Adjusted item price for split: ${formatCurrency(itemShare.adjustedItemPriceForSplit)}, Shared by: ${itemShare.sharedByCount} people`}>
                                                (of {formatCurrency(itemShare.adjustedItemPriceForSplit)})
                                            </span>
                                            </span>
                                        </li>
                                       );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground pl-1.5">Not involved in sharing any items contributing to the split amount.</p>
                                )}
                              </Card>
                            ))}
                            </div>
                        </div>
                    )}
                    {amountEffectivelySplit < 0.001 && totalOriginalBill > 0.001 && (
                         <p className="text-sm text-muted-foreground p-2 bg-secondary/20 rounded-md mt-2">
                            The items were fully covered by the celebration contribution; no item costs remained for splitting.
                        </p>
                    )}
                  </div>
                )}
                 {Array.isArray(expense.shares) && expense.shares.length === 0 && amountEffectivelySplit > 0.001 && (
                    <p className="text-sm text-destructive-foreground bg-destructive/20 p-2 rounded-md mt-2">
                        No shares were assigned for the amount of {formatCurrency(amountEffectivelySplit)} that was to be split.
                    </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"/> Individual Net Effect
                </CardTitle>
                 <CardDescription className="text-xs">
                  Each person's financial position for this expense, after considering their payments and share of the <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong> split amount.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm pt-0"> {/* pt-0 for card content */}
                {sortedInvolvedPersonIdsOverall.length > 0 ? (
                  <ul className="space-y-2 sm:space-y-2.5">
                    {sortedInvolvedPersonIdsOverall.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPhysicallyPaidByThisPerson = paymentRecord ? Number(paymentRecord.amount) : 0;
                      
                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfSplitAmountForThisPerson = shareRecord ? Number(shareRecord.amount) : 0;

                      const isCelebrationContributor = celebrationContributionOpt?.personId === personId;
                      const celebrationAmountByThisPerson = isCelebrationContributor ? (celebrationContributionOpt?.amount || 0) : 0;
                      
                      const totalObligationForThisPerson = shareOfSplitAmountForThisPerson + celebrationAmountByThisPerson;
                      const netEffectForThisPerson = amountPhysicallyPaidByThisPerson - totalObligationForThisPerson;

                      return (
                        <li key={personId} className="p-2 sm:p-3 bg-secondary/30 rounded-md space-y-1">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <span className="font-semibold text-sm">{personName}</span>
                            <span
                              className={`font-bold text-xs px-2 py-0.5 rounded-full mt-0.5 sm:mt-0 self-start sm:self-auto
                                    ${netEffectForThisPerson < -0.001 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                                    : netEffectForThisPerson > 0.001 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'}`}
                            >
                              {netEffectForThisPerson < -0.001 ? `Owes ${formatCurrency(Math.abs(netEffectForThisPerson))}` :
                                netEffectForThisPerson > 0.001 ? `Is Owed ${formatCurrency(netEffectForThisPerson)}` :
                                  `Settled`}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Paid By:</span> 
                              <span>{formatCurrency(amountPhysicallyPaidByThisPerson)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Share of Split Amount:</span> <span>{formatCurrency(shareOfSplitAmountForThisPerson)}</span>
                          </div>
                           {isCelebrationContributor && celebrationAmountByThisPerson > 0 && (
                             <p className="text-xs text-yellow-700 dark:text-yellow-500 italic pl-1">*You contributed {formatCurrency(celebrationAmountByThisPerson)} as a treat.*</p>
                           )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">No individuals involved in payments or shares for this expense.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
