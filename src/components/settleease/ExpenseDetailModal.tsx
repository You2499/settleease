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
import { Info, User, PartyPopper, Users, Scale, SlidersHorizontal, ClipboardList, ReceiptText, ShoppingBag, Coins, CreditCard, ListTree, Settings2, Copy } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, ExpenseItemDetail, PayerShare, CelebrationContribution, PersonItemShareDetails, PersonAggregatedItemShares } from '@/lib/settleease/types';
import { AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";


interface ExpenseDetailModalProps {
  expense: Expense;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}


export default function ExpenseDetailModal({ expense, isOpen, onOpenChange, peopleMap, getCategoryIconFromName }: ExpenseDetailModalProps) {
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
    return aggregatedData;
  }, [expense.split_method, expense.items, amountEffectivelySplit]);

  const getItemCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return Settings2; 
    const iconDetail = AVAILABLE_CATEGORY_ICONS.find(icon => icon.label.toLowerCase().includes(categoryName.toLowerCase()) || icon.iconKey.toLowerCase() === categoryName.toLowerCase());
    if (iconDetail) return iconDetail.IconComponent;
    
    return getCategoryIconFromName(categoryName) || Settings2;
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
      expense.items.forEach((item: any) => {
        lines.push(`- _${item.name}_: ${formatCurrency(item.price)} (shared by: ${item.sharedBy.map((id: string) => peopleMap[id] || 'Unknown').join(', ')})`);
      });
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
      <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between"> 
          <div className="flex items-center">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              Expense Details
            </DialogTitle>
          </div>
          <Button variant="ghost" size="icon" className="ml-2" title="Copy for WhatsApp" onClick={handleCopy}>
            <Copy className="h-5 w-5" />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0"> {/* Adjusted pt-0 here */}
          <div className="space-y-4 sm:space-y-6 pt-2"> 
            
            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="text-md sm:text-lg font-semibold flex items-center">
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="text-md sm:text-lg font-semibold flex items-center"><CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"/>Payment & Contribution</CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0"> {/* pt-0 for card content */}
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">Paid By:</span>
                  {Array.isArray(expense.paid_by) && expense.paid_by.length > 0 ? (
                    <ul className="list-disc list-inside pl-4 space-y-0.5">
                      {expense.paid_by.map((p: PayerShare) => (
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
                  <span>Net Amount For Splitting:</span>
                  <span className="text-accent">{formatCurrency(amountEffectivelySplit)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pt-3 sm:pt-4 pb-2">
                <CardTitle className="text-md sm:text-lg font-semibold flex items-center">
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
                      {expense.shares.map(share => (
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
                      {expense.shares.map(share => (
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
                        {expense.items.map(item => {
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
                                    <div className="text-muted-foreground/80 pl-5 text-[10px] sm:text-xs truncate" title={`Shared by: ${item.sharedBy.map(pid => peopleMap[pid] || 'Unknown').join(', ')}`}>Shared by: {item.sharedBy.map(pid => peopleMap[pid] || 'Unknown').join(', ')}</div>
                                </li>
                            );
                        })}
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
                            {Object.entries(itemwiseBreakdownForDisplay).filter(([_,details]) => details.totalShareOfAdjustedItems > 0.001 ).map(([personId, details]) => (
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
                <CardTitle className="text-md sm:text-lg font-semibold flex items-center">
                  <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground"/> Individual Net Effect
                </CardTitle>
                 <CardDescription className="text-xs">
                  Each person's financial position for this expense, after considering their payments and share of the <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong> split amount.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm pt-0"> {/* pt-0 for card content */}
                {involvedPersonIdsOverall.length > 0 ? (
                  <ul className="space-y-2 sm:space-y-2.5">
                    {involvedPersonIdsOverall.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPhysicallyPaidByThisPerson = paymentRecord ? Number(paymentRecord.amount) : 0;
                      
                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfSplitAmountForThisPerson = shareRecord ? Number(shareRecord.amount) : 0;

                      const isCelebrationContributor = celebrationContributionOpt?.personId === personId;
                      const celebrationAmountByThisPerson = isCelebrationContributor ? (celebrationContributionOpt?.amount || 0) : 0;
                                          
                      const netEffectForThisPerson = amountPhysicallyPaidByThisPerson - shareOfSplitAmountForThisPerson;

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
                             <p className="text-xs text-yellow-700 dark:text-yellow-500 italic pl-1">*You contributed {formatCurrency(celebrationAmountByThisPerson)} towards this bill.*</p>
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
