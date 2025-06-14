
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as ShadDialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Info, User, PartyPopper, Users, Scale, SlidersHorizontal, ClipboardList, ReceiptText, ShoppingBag, Coins, CreditCard, ListTree } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, ExpenseItemDetail, PayerShare } from '@/lib/settleease/types';

interface ExpenseDetailModalProps {
  expense: Expense;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

interface PersonItemShareDetails {
  itemName: string;
  originalItemPrice: number;
  adjustedItemPriceForSplit: number;
  shareForPerson: number;
  sharedByCount: number;
  itemId: string;
}

interface PersonAggregatedItemShares {
  [personId: string]: {
    items: PersonItemShareDetails[];
    totalShareOfAdjustedItems: number;
  };
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
  const celebrationAmount = expense.celebration_contribution ? Number(expense.celebration_contribution.amount) : 0;
  const amountEffectivelySplit = Math.max(0, totalOriginalBill - celebrationAmount);

  const involvedPersonIdsOverall = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(expense.paid_by)) {
      expense.paid_by.forEach(p => ids.add(p.personId));
    }
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach(s => ids.add(s.personId));
    }
    if (expense.celebration_contribution) {
        ids.add(expense.celebration_contribution.personId);
    }
    if (expense.split_method === 'itemwise' && Array.isArray(expense.items)) {
        expense.items.forEach(item => item.sharedBy.forEach(id => ids.add(id)));
    }
    return Array.from(ids);
  }, [expense]);

  const itemwiseBreakdownForDisplay = useMemo(() => {
    if (expense.split_method !== 'itemwise' || !Array.isArray(expense.items) || expense.items.length === 0) {
      return null;
    }
    
    const reductionFactor = (totalOriginalBill > 0.001 && amountEffectivelySplit >= 0) ? (amountEffectivelySplit / totalOriginalBill) : (totalOriginalBill === 0 && amountEffectivelySplit === 0 ? 1 : 0) ;

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
            sharedByCount: item.sharedBy.length,
            shareForPerson: sharePerPersonForItem,
          });
          aggregatedData[personId].totalShareOfAdjustedItems += sharePerPersonForItem;
        });
      }
    });
    return aggregatedData;
  }, [expense.split_method, expense.items, totalOriginalBill, amountEffectivelySplit]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4 border-b -mx-6 px-6 pt-0">
          <DialogTitle className="text-2xl text-primary flex items-center pt-6">
            <Info className="mr-2.5 h-6 w-6" /> Expense Details
          </DialogTitle>
          <ShadDialogDescription className="sr-only">
            Detailed breakdown of the selected expense.
          </ShadDialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="py-4 space-y-6">
            
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold">General Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span> 
                  <span className="font-medium text-right truncate pl-2" title={expense.description}>{expense.description}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Total Bill Amount:</span> 
                  <span className="font-bold text-xl text-primary text-right">{formatCurrency(totalOriginalBill)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span> 
                  <span className="font-medium flex items-center"><CategoryIcon className="mr-1.5 h-4 w-4" /> {expense.category}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold flex items-center"><CreditCard className="mr-2 h-5 w-5 text-muted-foreground"/>Payment & Contribution</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">Physically Paid By:</span>
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
                    <p className="pl-4 text-muted-foreground italic">No physical payers listed.</p>
                  )}
                </div>
                {expense.celebration_contribution && (
                  <>
                    <Separator className="my-2.5" />
                    <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <PartyPopper className="mr-2 h-4 w-4 flex-shrink-0"/>
                        <span className="font-medium">Celebration Contribution:</span>
                    </div>
                    <div className="pl-4 space-y-0.5">
                        <div className="flex justify-between">
                        <span>Contributed by:</span>
                        <span className="font-medium text-right">{peopleMap[expense.celebration_contribution.personId] || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-bold text-primary text-right">{formatCurrency(expense.celebration_contribution.amount)}</span>
                        </div>
                    </div>
                  </>
                )}
                <Separator className="my-2.5" />
                <div className="flex justify-between font-semibold">
                  <span>Net Amount For Splitting:</span>
                  <span className="text-accent">{formatCurrency(amountEffectivelySplit)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <SplitIcon className="mr-2 h-5 w-5 text-muted-foreground"/> Split Method: <span className="ml-1.5 capitalize font-normal text-foreground/90">{expense.split_method}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                {expense.split_method === 'equal' && Array.isArray(expense.shares) && expense.shares.length > 0 && (
                  <div>
                    <CardDescription className="mb-1.5 text-xs">
                        Split equally among {expense.shares.length} {expense.shares.length === 1 ? "person" : "people"} based on the amount of <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong>.
                    </CardDescription>
                    <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-0.5">
                      {expense.shares.map(share => (
                        <li key={share.personId}>{peopleMap[share.personId] || 'Unknown Person'}</li>
                      ))}
                    </ul>
                     <p className="mt-2 font-medium">Share per person: <span className="text-primary">{formatCurrency(expense.shares[0]?.amount || 0)}</span></p>
                  </div>
                )}
                {expense.split_method === 'unequal' && Array.isArray(expense.shares) && expense.shares.length > 0 && (
                   <div>
                    <CardDescription className="mb-1.5 text-xs">Specific shares assigned based on the amount of <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong>.</CardDescription>
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
                  <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-muted-foreground mb-1.5 flex items-center"><ShoppingBag className="mr-2 h-4 w-4"/>Original Items & Prices:</h4>
                        <ul className="space-y-1 text-xs">
                        {expense.items.map(item => (
                            <li key={item.id} className="p-1.5 bg-secondary/20 rounded-sm">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium truncate" title={item.name}>{item.name}</span>
                                    <span className="font-semibold text-primary whitespace-nowrap">{formatCurrency(Number(item.price))}</span>
                                </div>
                                <div className="text-muted-foreground/80">Shared by: {item.sharedBy.map(pid => peopleMap[pid] || 'Unknown').join(', ')}</div>
                            </li>
                        ))}
                        </ul>
                         <p className="text-xs text-muted-foreground mt-1.5">Total of original items: {formatCurrency(expense.items.reduce((sum, item) => sum + Number(item.price), 0))}</p>
                    </div>
                    {itemwiseBreakdownForDisplay && amountEffectivelySplit > 0.001 && (
                        <div>
                            <h4 className="font-medium text-muted-foreground mb-1.5 flex items-center"><ListTree className="mr-2 h-4 w-4"/>Individual Item Shares (Adjusted):</h4>
                            <CardDescription className="text-xs mb-2">
                                Based on splitting {formatCurrency(amountEffectivelySplit)}. Original item prices are proportionally reduced before calculating individual shares.
                            </CardDescription>
                            <div className="space-y-2.5">
                            {Object.entries(itemwiseBreakdownForDisplay).filter(([_,details]) => details.totalShareOfAdjustedItems > 0.001 ).map(([personId, details]) => (
                              <Card key={personId} className="p-2.5 bg-secondary/20 shadow-none">
                                <div className="flex justify-between items-center mb-1.5">
                                  <h5 className="font-semibold text-sm flex items-center">
                                    <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                    {peopleMap[personId] || 'Unknown Person'}
                                  </h5>
                                  <span className="text-xs font-semibold text-primary">
                                    Total Share: {formatCurrency(details.totalShareOfAdjustedItems)}
                                  </span>
                                </div>
                                {details.items.filter(itemShare => itemShare.shareForPerson > 0.001).length > 0 ? (
                                  <ul className="space-y-0.5 text-xs pl-1.5 border-l-2 border-primary/30">
                                    {details.items.filter(itemShare => itemShare.shareForPerson > 0.001).map((itemShare) => (
                                      <li key={itemShare.itemId} className="flex justify-between pl-1.5">
                                        <span className="truncate mr-1" title={itemShare.itemName}>{itemShare.itemName}</span>
                                        <span className="text-muted-foreground whitespace-nowrap">
                                          {formatCurrency(itemShare.shareForPerson)}
                                          <span className="ml-1 text-gray-400 text-[9px]" title={`Original item price: ${formatCurrency(itemShare.originalItemPrice)}, Adjusted item price for split: ${formatCurrency(itemShare.adjustedItemPriceForSplit)}, Shared by: ${itemShare.sharedByCount} people`}>
                                            (of {formatCurrency(itemShare.adjustedItemPriceForSplit)})
                                          </span>
                                        </span>
                                      </li>
                                    ))}
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
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Users className="mr-2 h-5 w-5 text-muted-foreground"/> Individual Net Effect
                </CardTitle>
                 <CardDescription>
                  Each person's financial position for this expense, after considering their payments and share of the <strong className="text-accent">{formatCurrency(amountEffectivelySplit)}</strong> split amount.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {involvedPersonIdsOverall.length > 0 ? (
                  <ul className="space-y-2.5 text-sm">
                    {involvedPersonIdsOverall.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPhysicallyPaidByThisPerson = paymentRecord ? Number(paymentRecord.amount) : 0;
                      
                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfSplitAmountForThisPerson = shareRecord ? Number(shareRecord.amount) : 0;

                      const isCelebrationContributor = expense.celebration_contribution?.personId === personId;
                      const personCelebrationAmount = isCelebrationContributor ? Number(expense.celebration_contribution!.amount) : 0;
                      
                      let effectiveAmountPaidForDisplay = amountPhysicallyPaidByThisPerson;
                      let paymentLabel = "Physically Paid:";
                      
                      if (isCelebrationContributor) {
                        effectiveAmountPaidForDisplay = amountPhysicallyPaidByThisPerson + personCelebrationAmount;
                        paymentLabel = "Net Paid (incl. Celebration):";
                      }
                      
                      const netEffectForThisPerson = (amountPhysicallyPaidByThisPerson + personCelebrationAmount) - shareOfSplitAmountForThisPerson;

                      return (
                        <li key={personId} className="p-3 bg-secondary/30 rounded-md space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{personName}</span>
                            <span
                              className={`font-bold text-xs px-2 py-0.5 rounded-full
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
                              <span>{paymentLabel}</span> 
                              <span>{formatCurrency(effectiveAmountPaidForDisplay)}</span>
                          </div>
                          {isCelebrationContributor && amountPhysicallyPaidByThisPerson > 0 && personCelebrationAmount > 0 && (
                             <p className="text-xs text-muted-foreground/80 pl-2">(Physically paid {formatCurrency(amountPhysicallyPaidByThisPerson)} + Contributed {formatCurrency(personCelebrationAmount)})</p>
                          )}
                           {isCelebrationContributor && amountPhysicallyPaidByThisPerson === 0 && personCelebrationAmount > 0 && (
                             <p className="text-xs text-muted-foreground/80 pl-2">(Contributed {formatCurrency(personCelebrationAmount)})</p>
                          )}

                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Share of Split Amount:</span> <span>{formatCurrency(shareOfSplitAmountForThisPerson)}</span>
                          </div>
                           {isCelebrationContributor && <p className="text-xs text-muted-foreground/80 italic pl-1">*You contributed {formatCurrency(personCelebrationAmount)} towards this bill.*</p>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No individuals involved in payments or shares for this expense.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        <DialogFooter className="pt-4 border-t -mx-6 px-6 pb-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="mb-6">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

