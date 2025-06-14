
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
import { Info } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense } from '@/lib/settleease/types';

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

  const involvedPersonIds = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(expense.paid_by)) {
      expense.paid_by.forEach(p => ids.add(p.personId));
    }
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach(s => ids.add(s.personId));
    }
    return Array.from(ids);
  }, [expense.paid_by, expense.shares]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary flex items-center">
            <Info className="mr-2 h-6 w-6" /> Expense Details
          </DialogTitle>
          <ShadDialogDescription className="sr-only">
            Detailed breakdown of the selected expense, including payers, shares, and itemization if applicable.
          </ShadDialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="flex justify-between"><span>Description:</span> <span className="font-medium text-right">{expense.description}</span></div>
                <div className="flex justify-between"><span>Total Amount:</span> <span className="font-bold text-primary text-right">{formatCurrency(Number(expense.total_amount))}</span></div>
                <div className="flex justify-between items-center"><span>Category:</span> <span className="font-medium flex items-center"><CategoryIcon className="mr-1.5 h-4 w-4" /> {expense.category}</span></div>
                
                <div>
                  <span className="block">Paid by:</span>
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
                
                <div className="flex justify-between"><span>Split Method:</span> <span className="font-medium capitalize text-right">{expense.split_method}</span></div>
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Individual Breakdown for this Expense</CardTitle>
                <CardDescription>How this specific expense affects each person's balance before overall settlement.</CardDescription>
              </CardHeader>
              <CardContent>
                {involvedPersonIds.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {involvedPersonIds.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPaidThisExpense = paymentRecord ? Number(paymentRecord.amount) : 0;

                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfThisExpense = shareRecord ? Number(shareRecord.amount) : 0;

                      const netForThisExpense = amountPaidThisExpense - shareOfThisExpense;

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
                            <span>Amount Paid:</span> <span>{formatCurrency(amountPaidThisExpense)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Share of Expense:</span> <span>{formatCurrency(shareOfThisExpense)}</span>
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

            {expense.split_method === 'itemwise' && expense.items && expense.items.length > 0 && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg">Item-wise Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {expense.items.map((item, index) => (
                      <Card key={item.id || index.toString()} className="p-3 bg-card/70 shadow-sm">
                        <div className="flex justify-between items-center mb-1.5">
                          <h4 className="font-semibold text-sm">{item.name || `Item ${index + 1}`}</h4>
                          <span className="text-sm font-medium text-primary">{formatCurrency(Number(item.price))}</span>
                        </div>
                        {item.sharedBy && item.sharedBy.length > 0 ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-1">Shared by:</p>
                            <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                              {item.sharedBy.map(personId => (
                                <li key={personId} className="flex justify-between">
                                  <span>{peopleMap[personId] || 'Unknown'}</span>
                                  <span className="text-muted-foreground">{formatCurrency(Number(item.price) / item.sharedBy.length)}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : <p className="text-xs text-muted-foreground">Not shared by anyone.</p>}
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
                    <p className="text-sm mt-2">Amount per person: <span className="font-semibold text-primary">{formatCurrency(Number(expense.total_amount) / expense.shares.length)}</span></p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
