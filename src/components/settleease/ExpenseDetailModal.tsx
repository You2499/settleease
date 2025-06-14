
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
import { ScrollArea } from "@/components/ui/scroll-area"; // Added import
import { Info, User, PartyPopper, CalendarDays, Users, Scale, SlidersHorizontal, ClipboardList, ListTree, ReceiptText, ShoppingBag, Coins, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, ExpenseItemDetail, PayerShare } from '@/lib/settleease/types';
import { format } from 'date-fns';

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

  const dateAdded = expense.created_at ? format(new Date(expense.created_at), "MMM d, yyyy 'at' h:mm a") : 'N/A';

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
    
    const reductionFactor = (totalOriginalBill > 0.001) ? (amountEffectivelySplit / totalOriginalBill) : 0;
    const aggregatedData: PersonAggregatedItemShares = {};

    expense.items.forEach((item: ExpenseItemDetail) => {
      const originalItemPriceNum = Number(item.price);
      const adjustedItemPriceForSplit = originalItemPriceNum * reductionFactor;

      if (item.sharedBy && item.sharedBy.length > 0) {
        const sharePerPersonForItem = adjustedItemPriceForSplit / item.sharedBy.length;

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
        <DialogHeader className="pr-6 pb-4 border-b"> 
          <DialogTitle className="text-2xl text-primary flex items-center">
            <Info className="mr-2.5 h-6 w-6" /> Expense Details
          </DialogTitle>
          <ShadDialogDescription className="sr-only">
            Detailed breakdown of the selected expense.
          </ShadDialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0 pr-1">
          <div className="py-4 px-1 space-y-4">
            
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
                 <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Added:</span> 
                  <span className="font-medium text-xs text-muted-foreground/80">{dateAdded}</span>
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
                {expense.split_method === 'equal' && expense.shares && expense.shares.length > 0 && (
                  <div>
                    <CardDescription className="mb-1.5 text-xs">
                        Split equally among {expense.shares.length} {expense.shares.length === 1 ? "person" : "people"} after any contributions.
                    </CardDescription>
                    <ul className="list-disc list-inside pl-4 text-muted-foreground space-y-0.5">
                      {expense.shares.map(share => (
                        <li key={share.personId}>{peopleMap[share.personId] || 'Unknown Person'}</li>
                      ))}
                    </ul>
                    <p className="mt-2 font-medium">Share per person: <span className="text-primary">{formatCurrency(amountEffectivelySplit / expense.shares.length)}</span></p>
                  </div>
                )}
                {expense.split_method === 'unequal' && expense.shares && expense.shares.length > 0 && (
                   <div>
                    <CardDescription className="mb-1.5 text-xs">Specific shares assigned after any contributions.</CardDescription>
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
                    </div>
                    {itemwiseBreakdownForDisplay && (
                        <div>
                            <h4 className="font-medium text-muted-foreground mb-1.5 flex items-center"><ListTree className="mr-2 h-4 w-4"/>Individual Item Shares (Adjusted):</h4>
                            <CardDescription className="text-xs mb-2">
                                Based on splitting {formatCurrency(amountEffectivelySplit)} (original bill of {formatCurrency(totalOriginalBill)} minus any contributions).
                                Original item prices are proportionally reduced before calculating individual shares.
                            </CardDescription>
                            <div className="space-y-2.5">
                            {Object.entries(itemwiseBreakdownForDisplay).map(([personId, details]) => (
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
                                {details.items.length > 0 ? (
                                  <ul className="space-y-0.5 text-xs pl-1.5 border-l-2 border-primary/30">
                                    {details.items.map((itemShare) => (
                                      <li key={itemShare.itemId} className="flex justify-between pl-1.5">
                                        <span className="truncate mr-1" title={itemShare.itemName}>{itemShare.itemName}</span>
                                        <span className="text-muted-foreground whitespace-nowrap">
                                          {formatCurrency(itemShare.shareForPerson)}
                                          <span className="ml-1 text-gray-400 text-[9px]" title={`Adjusted item price: ${formatCurrency(itemShare.adjustedItemPriceForSplit)} (orig. ${formatCurrency(itemShare.originalItemPrice)}) / ${itemShare.sharedByCount} people`}>
                                            (of {formatCurrency(itemShare.adjustedItemPriceForSplit)})
                                          </span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground pl-1.5">Not involved in sharing any items.</p>
                                )}
                              </Card>
                            ))}
                            </div>
                        </div>
                    )}
                  </div>
                )}
                 {expense.shares.length === 0 && amountEffectivelySplit > 0.001 && (
                    <p className="text-sm text-destructive-foreground bg-destructive/20 p-2 rounded-md">
                        No shares were assigned for the amount of {formatCurrency(amountEffectivelySplit)} that was to be split.
                    </p>
                )}
                {amountEffectivelySplit < 0.001 && totalOriginalBill > 0.001 && (
                    <p className="text-sm text-muted-foreground p-2 bg-secondary/20 rounded-md">
                        The entire bill of {formatCurrency(totalOriginalBill)} was covered by the celebration contribution. No amount remained for splitting.
                    </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Users className="mr-2 h-5 w-5 text-muted-foreground"/> Individual Net Effect
                </CardTitle>
                <CardDescription>How this expense impacts each person's balance.</CardDescription>
              </CardHeader>
              <CardContent>
                {involvedPersonIdsOverall.length > 0 ? (
                  <ul className="space-y-2.5 text-sm">
                    {involvedPersonIdsOverall.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPhysicallyPaid = paymentRecord ? Number(paymentRecord.amount) : 0;
                      
                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfSplitAmount = shareRecord ? Number(shareRecord.amount) : 0;

                      const isCelebrationContributor = expense.celebration_contribution?.personId === personId;
                      const personCelebrationAmount = isCelebrationContributor ? expense.celebration_contribution!.amount : 0;
                      
                      const effectivePaid = isCelebrationContributor ? amountPhysicallyPaid : amountPhysicallyPaid;
                      
                      const netForThisExpense = effectivePaid - shareOfSplitAmount;

                      return (
                        <li key={personId} className="p-3 bg-secondary/30 rounded-md space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{personName}</span>
                            <span
                              className={`font-bold text-xs px-2 py-0.5 rounded-full
                                    ${netForThisExpense < -0.001 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' 
                                    : netForThisExpense > 0.001 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'}`}
                            >
                              {netForThisExpense < -0.001 ? `Owes ${formatCurrency(Math.abs(netForThisExpense))}` :
                                netForThisExpense > 0.001 ? `Is Owed ${formatCurrency(netForThisExpense)}` :
                                  `Settled`}
                            </span>
                          </div>
                          {isCelebrationContributor && (
                            <p className="text-xs text-amber-700 dark:text-amber-500 italic flex items-center">
                              <PartyPopper className="inline h-3 w-3 mr-1 shrink-0"/> You contributed {formatCurrency(personCelebrationAmount)} for this expense.
                            </p>
                          )}
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {isCelebrationContributor ? "Net Paid (incl. Contribution):" : "Physically Paid:"}
                            </span> 
                            <span>{formatCurrency(effectivePaid)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Share of Split Amount:</span> <span>{formatCurrency(shareOfSplitAmount)}</span>
                          </div>
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
        </ScrollArea>

        <DialogFooter className="pt-4 border-t mt-auto"> 
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

