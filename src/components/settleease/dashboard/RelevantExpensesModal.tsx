
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Calendar, 
  CreditCard, 
  Users, 
  DollarSign,
  Receipt,
  ExternalLink,
  Info,
  PartyPopper
} from 'lucide-react';
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
  // Sort expenses by date (newest first)
  const sortedExpenses = useMemo(() => {
    return [...expensesToList].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [expensesToList]);

  const getPayerInfo = (expense: Expense) => {
    if (!Array.isArray(expense.paid_by) || expense.paid_by.length === 0) {
      return { text: 'No payers', count: 0 };
    }
    
    if (expense.paid_by.length === 1) {
      return { 
        text: peopleMap[expense.paid_by[0].personId] || 'Unknown',
        count: 1
      };
    }
    
    return { 
      text: `${expense.paid_by.length} people`,
      count: expense.paid_by.length
    };
  };

  const getSharerInfo = (expense: Expense) => {
    if (!Array.isArray(expense.shares) || expense.shares.length === 0) {
      return { text: 'No sharers', count: 0 };
    }
    
    return { 
      text: `${expense.shares.length} ${expense.shares.length === 1 ? 'person' : 'people'}`,
      count: expense.shares.length
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar max-w-4xl w-[95vw] sm:w-full">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            {modalTitle || "Related Expenses"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            These are the expenses contributing to the selected debt or credit. Click any expense for full details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
          <div className="space-y-4 sm:space-y-6 pt-2">
            {sortedExpenses.length > 0 ? (
              <>
                {/* Summary Card */}
                <Card>
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-lg sm:text-xl font-bold">
                      <Info className="mr-2 h-4 w-4 text-muted-foreground" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2 pt-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-muted-foreground">Total Expenses:</span>
                      <span className="font-medium">{sortedExpenses.length}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-muted-foreground">Combined Amount:</span>
                      <span className="font-bold text-lg text-primary">
                        {formatCurrency(
                          sortedExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0)
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between">
                      <span className="text-muted-foreground">Date Range:</span>
                      <span className="font-medium">
                        {sortedExpenses.length > 1 ? (
                          <>
                            {new Date(sortedExpenses[sortedExpenses.length - 1].created_at || 0).toLocaleDateString()} 
                            {" - "}
                            {new Date(sortedExpenses[0].created_at || 0).toLocaleDateString()}
                          </>
                        ) : (
                          new Date(sortedExpenses[0].created_at || 0).toLocaleDateString()
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses List */}
                <Card>
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-lg sm:text-xl font-bold">
                      <Receipt className="mr-2 h-4 w-4 text-muted-foreground" />
                      Expense Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3 pt-0">
                    <div className="space-y-3">
                      {sortedExpenses.map((expense) => {
                        const payerInfo = getPayerInfo(expense);
                        const sharerInfo = getSharerInfo(expense);
                        
                        return (
                          <Card 
                            key={expense.id}
                            className="bg-secondary/20 cursor-pointer shadow-sm border"
                            onClick={() => onExpenseClick(expense)}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {/* Header with title and amount */}
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base text-foreground flex items-center">
                                      {expense.description}
                                      <ExternalLink className="ml-2 h-4 w-4 text-blue-500 flex-shrink-0" />
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Category: {expense.category || 'Uncategorized'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-primary">
                                      {formatCurrency(expense.total_amount)}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {expense.split_method} split
                                    </div>
                                  </div>
                                </div>

                                {/* Details grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div>
                                      <div className="font-medium">Date</div>
                                      <div className="text-muted-foreground">
                                        {expense.created_at 
                                          ? new Date(expense.created_at).toLocaleDateString('default', {
                                              month: 'short',
                                              day: 'numeric',
                                              year: 'numeric'
                                            })
                                          : 'Not set'
                                        }
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div>
                                      <div className="font-medium">Paid By</div>
                                      <div className="text-muted-foreground">
                                        {payerInfo.text}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div>
                                      <div className="font-medium">Shared By</div>
                                      <div className="text-muted-foreground">
                                        {sharerInfo.text}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional info for itemwise expenses */}
                                {expense.split_method === 'itemwise' && Array.isArray(expense.items) && expense.items.length > 0 && (
                                  <div className="pt-2 border-t border-border/50">
                                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                      <DollarSign className="h-3 w-3" />
                                      <span>{expense.items.length} items • Click to see itemwise breakdown</span>
                                    </div>
                                  </div>
                                )}

                                {/* Celebration contribution indicator */}
                                {expense.celebration_contribution && Number(expense.celebration_contribution.amount) > 0 && (
                                  <div className="pt-2 border-t border-border/50">
                                    <div className="flex items-center space-x-2 text-xs text-yellow-600 dark:text-yellow-400">
                                      <PartyPopper className="h-4 w-4 shrink-0" />
                                      <span>
                                        Includes {formatCurrency(expense.celebration_contribution.amount)} celebration contribution
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No Expenses Found</h3>
                  <p className="text-sm text-muted-foreground">
                    No specific contributing expenses found for this transaction, or the transaction is fully settled by direct payments.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

