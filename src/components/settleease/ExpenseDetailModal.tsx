
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
import { Info, User, PartyPopper } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, ExpenseItemDetail } from '@/lib/settleease/types';

interface ExpenseDetailModalProps {
  expense: Expense;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

interface PersonItemShare {
  itemName: string;
  itemPrice: number;
  sharedByCount: number;
  shareForPerson: number;
  itemId: string;
}

interface PersonAggregatedShares {
  [personId: string]: {
    items: PersonItemShare[];
    totalShare: number; // This is their share of the amount *after* celebration contribution
  };
}

export default function ExpenseDetailModal({ expense, isOpen, onOpenChange, peopleMap, getCategoryIconFromName }: ExpenseDetailModalProps) {
  if (!expense) return null;

  const CategoryIcon = getCategoryIconFromName(expense.category);

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
    return Array.from(ids);
  }, [expense.paid_by, expense.shares, expense.celebration_contribution]);


  const personCentricItemDetails = useMemo(() => {
    if (expense.split_method !== 'itemwise' || !expense.items || expense.items.length === 0) {
      return null;
    }

    const aggregatedData: PersonAggregatedShares = {};

    expense.items.forEach((item: ExpenseItemDetail) => {
      if (item.sharedBy && item.sharedBy.length > 0) {
        const itemPriceNumeric = Number(item.price);
        const sharePerPersonForItem = itemPriceNumeric / item.sharedBy.length;

        item.sharedBy.forEach((personId: string) => {
          if (!aggregatedData[personId]) {
            aggregatedData[personId] = { items: [], totalShare: 0 };
          }
          aggregatedData[personId].items.push({
            itemId: item.id || `item-${Math.random()}`, 
            itemName: item.name,
            itemPrice: itemPriceNumeric,
            sharedByCount: item.sharedBy.length,
            shareForPerson: sharePerPersonForItem,
          });
          aggregatedData[personId].totalShare += sharePerPersonForItem;
        });
      }
    });
    return aggregatedData;
  }, [expense.split_method, expense.items]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pr-6"> {/* Added pr-6 to prevent overlap with close button */}
          <DialogTitle className="text-2xl text-primary flex items-center">
            <Info className="mr-2 h-6 w-6" /> Expense Details
          </DialogTitle>
          <ShadDialogDescription className="sr-only">
            Detailed breakdown of the selected expense, including payers, shares, and itemization if applicable.
          </ShadDialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0 overflow-y-auto px-4 py-4 md:grid md:grid-cols-2 md:gap-x-6 md:overflow-visible">
          {/* Left Pane (Summary & Celebration) - Scrollable independently on mobile if needed */}
          <div className="space-y-4 md:overflow-y-auto md:max-h-[calc(80vh-100px)] md:pr-3 custom-scrollbar"> {/* Custom scrollbar for md+ */}
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="flex justify-between"><span>Description:</span> <span className="font-medium text-right truncate" title={expense.description}>{expense.description}</span></div>
                <div className="flex justify-between"><span>Total Bill Amount:</span> <span className="font-bold text-primary text-right">{formatCurrency(Number(expense.total_amount))}</span></div>
                <div className="flex justify-between items-center"><span>Category:</span> <span className="font-medium flex items-center"><CategoryIcon className="mr-1.5 h-4 w-4" /> {expense.category}</span></div>
                
                <div>
                  <span className="block">Paid by (Physical Payments):</span>
                  {Array.isArray(expense.paid_by) && expense.paid_by.length > 0 ? (
                    <ul className="list-disc list-inside pl-4">
                      {expense.paid_by.map(p => (
                        <li key={p.personId} className="flex justify-between text-xs">
                          <span>{peopleMap[p.personId] || 'Unknown'}</span>
                          <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="font-medium text-right block">No payers listed or data unavailable</span>
                  )}
                </div>
                 {expense.celebration_contribution && (
                    <div className="flex justify-between text-xs">
                        <span>Amount Split:</span>
                        <span className="font-medium">{formatCurrency(Number(expense.total_amount) - expense.celebration_contribution.amount)}</span>
                    </div>
                  )}
                <div className="flex justify-between"><span>Split Method:</span> <span className="font-medium capitalize text-right">{expense.split_method}</span></div>
              </CardContent>
            </Card>
            
            {expense.celebration_contribution && (
              <>
                <Separator className="md:hidden"/>
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg flex items-center">
                        <PartyPopper className="mr-2 h-5 w-5 text-yellow-500"/>Celebration Contribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span>Contributed by:</span>
                      <span className="font-medium text-right">{peopleMap[expense.celebration_contribution.personId] || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-bold text-primary text-right">{formatCurrency(expense.celebration_contribution.amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Pane (Breakdowns) - Scrollable independently */}
          <div className="space-y-4 mt-4 md:mt-0 md:overflow-y-auto md:max-h-[calc(80vh-100px)] md:pl-3 custom-scrollbar"> {/* Custom scrollbar for md+ */}
             <Separator className="md:hidden"/>
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Individual Breakdown</CardTitle>
                <CardDescription>Net effect of this expense on each person's balance.</CardDescription>
              </CardHeader>
              <CardContent>
                {involvedPersonIdsOverall.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {involvedPersonIdsOverall.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPhysicallyPaid = paymentRecord ? Number(paymentRecord.amount) : 0;

                      const actualCelebrationContributionByThisPerson = (expense.celebration_contribution && expense.celebration_contribution.personId === personId)
                        ? expense.celebration_contribution.amount
                        : 0;
                      
                      const effectiveAmountPaidByPerson = amountPhysicallyPaid + actualCelebrationContributionByThisPerson;
                      
                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfSplitAmount = shareRecord ? Number(shareRecord.amount) : 0;

                      const netForThisExpense = effectiveAmountPaidByPerson - shareOfSplitAmount;

                      const paidLabel = actualCelebrationContributionByThisPerson > 0 ? "Net Paid (incl. Celebration):" : "Physically Paid:";

                      return (
                        <li key={personId} className="p-2.5 bg-secondary/30 rounded-md space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{personName}</span>
                            <span
                              className={`font-bold text-xs px-1.5 py-0.5 rounded-full
                                    ${netForThisExpense < -0.01 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : netForThisExpense > 0.01 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'}`}
                            >
                              {netForThisExpense < -0.01 ? `Owes ${formatCurrency(Math.abs(netForThisExpense))}` :
                                netForThisExpense > 0.01 ? `Is Owed ${formatCurrency(netForThisExpense)}` :
                                  `Settled`}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{paidLabel}</span> <span>{formatCurrency(effectiveAmountPaidByPerson)}</span>
                          </div>
                          {/* The celebration contribution line item is removed if actualCelebrationContributionByThisPerson > 0 because it's now part of "Net Paid" */}
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Share of Split Amount:</span> <span>{formatCurrency(shareOfSplitAmount)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No individuals involved in payments or shares for this expense.</p>
                )}
              </CardContent>
            </Card>

            {expense.split_method === 'itemwise' && personCentricItemDetails && Object.keys(personCentricItemDetails).length > 0 && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg">Item-wise Breakdown (Per Person)</CardTitle>
                     <CardDescription>Shares based on items from the amount of {formatCurrency(expense.total_amount - (expense.celebration_contribution?.amount || 0))}.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(personCentricItemDetails).map(([personId, details]) => (
                      <Card key={personId} className="p-3 bg-card/70 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-md flex items-center">
                            <User className="mr-1.5 h-4 w-4 text-muted-foreground" />
                            {peopleMap[personId] || 'Unknown Person'}
                          </h4>
                          <span className="text-sm font-semibold text-primary">
                            Total Item Share: {formatCurrency(details.totalShare)}
                          </span>
                        </div>
                        {details.items.length > 0 ? (
                          <ul className="space-y-1 text-xs pl-2 border-l-2 border-primary/20">
                            {details.items.map((itemShare) => (
                              <li key={itemShare.itemId} className="flex justify-between pl-2">
                                <span className="truncate" title={itemShare.itemName}>{itemShare.itemName}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {formatCurrency(itemShare.shareForPerson)}
                                  {itemShare.sharedByCount > 1 && (
                                     <span className="ml-1 text-gray-400 text-[10px]">
                                        (of {formatCurrency(itemShare.itemPrice)} / {itemShare.sharedByCount})
                                     </span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground pl-2">Not involved in sharing any items.</p>
                        )}
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {(expense.split_method === 'equal' && expense.shares && expense.shares.length > 0) && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg">Equal Split Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-1">Split equally among {expense.shares.length} {expense.shares.length === 1 ? "person" : "people"}:</p>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {expense.shares.map(share => (
                        <li key={share.personId}>{peopleMap[share.personId] || 'Unknown Person'}</li>
                      ))}
                    </ul>
                    {expense.shares.length > 0 && (
                        <p className="text-sm mt-2">Amount per person: <span className="font-semibold text-primary">{formatCurrency(Number(expense.total_amount - (expense.celebration_contribution?.amount || 0)) / expense.shares.length)}</span></p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-auto"> {/* Ensure footer is at the bottom */}
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
