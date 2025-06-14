
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense } from '@/lib/settleease/types';

interface RelevantExpensesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expensesToList: Expense[];
  onExpenseClick: (expense: Expense) => void;
  modalTitle: string;
  peopleMap: Record<string, string>;
}

export default function RelevantExpensesModal({
  isOpen,
  onOpenChange,
  expensesToList,
  onExpenseClick,
  modalTitle,
  peopleMap,
}: RelevantExpensesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5 text-primary" /> {modalTitle || "Related Expenses"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            These are the expenses contributing to the selected debt or credit. Click an expense for full details.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 max-h-[60vh]">
          {expensesToList.length > 0 ? (
            <ScrollArea className="h-auto max-h-[55vh]">
              <ul className="space-y-2 pr-3 py-1">
                {expensesToList.map(expense => {
                   const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
                    ? "Multiple Payers"
                    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
                        ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
                        : 'N/A');
                  return (
                    <li key={expense.id}>
                      <Card className="bg-card/60 hover:bg-card/80 transition-colors">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex-grow">
                              <p className="text-sm font-medium truncate" title={expense.description}>{expense.description}</p>
                              <p className="text-xs text-muted-foreground">
                                Total: {formatCurrency(expense.total_amount)} | Paid by: {displayPayerText}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => onExpenseClick(expense)}
                              className="ml-2 text-xs h-auto px-2 py-1 text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="mr-1 h-3 w-3"/> View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No specific contributing expenses found for this transaction, or the transaction is fully settled by direct payments.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
