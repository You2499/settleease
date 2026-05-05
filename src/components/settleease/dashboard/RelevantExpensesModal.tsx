
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
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
import SettleEaseDialog, {
  SettleEaseModalBody,
  SettleEaseModalHeader,
  SettleEaseModalSection,
} from '../SettleEaseDialog';

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
    <SettleEaseDialog open={isOpen} onOpenChange={onOpenChange} className="sm:max-w-4xl">
      <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
        <SettleEaseModalHeader
          icon={FileText}
          title={modalTitle || "Related Expenses"}
          description="These expenses contribute to the selected debt or credit. Click any expense for full details."
        />

        <SettleEaseModalBody className="space-y-3">
          {sortedExpenses.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <SettleEaseModalSection>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Total expenses
                  </div>
                  <p className="mt-1 text-lg font-semibold">{sortedExpenses.length}</p>
                </SettleEaseModalSection>
                <SettleEaseModalSection>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Combined amount
                  </div>
                  <p className="mt-1 text-lg font-semibold text-primary">
                    {formatCurrency(sortedExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0))}
                  </p>
                </SettleEaseModalSection>
                <SettleEaseModalSection>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Date range
                  </div>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {sortedExpenses.length > 1 ? (
                      <>
                        {new Date(sortedExpenses[sortedExpenses.length - 1].created_at || 0).toLocaleDateString()}
                        {" - "}
                        {new Date(sortedExpenses[0].created_at || 0).toLocaleDateString()}
                      </>
                    ) : (
                      new Date(sortedExpenses[0].created_at || 0).toLocaleDateString()
                    )}
                  </p>
                </SettleEaseModalSection>
              </div>

              <SettleEaseModalSection className="p-0">
                <div className="border-b bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    Expense details
                  </div>
                </div>
                <div className="space-y-3 p-3">
                  {sortedExpenses.map((expense) => {
                      const payerInfo = getPayerInfo(expense);
                      const sharerInfo = getSharerInfo(expense);
                      
                      return (
                        <Card 
                          key={expense.id}
                          className="bg-secondary/20 cursor-pointer shadow-sm border w-full min-w-0"
                          onClick={() => onExpenseClick(expense)}
                        >
                          <CardContent className="p-3 sm:p-4">
                            <div className="space-y-3 w-full min-w-0">
                              {/* Header with title and amount */}
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 w-full min-w-0">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-base text-foreground flex items-center min-w-0">
                                    <span className="truncate">{expense.description}</span>
                                    <ExternalLink className="ml-2 h-4 w-4 text-blue-500 flex-shrink-0" />
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    Category: {expense.category || 'Uncategorized'}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-xl font-bold text-primary">
                                    {formatCurrency(expense.total_amount)}
                                  </div>
                                  <div className="text-xs text-muted-foreground capitalize">
                                    {expense.split_method} split
                                  </div>
                                </div>
                              </div>

                              {/* Details grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs w-full min-w-0">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium">Date</div>
                                    <div className="text-muted-foreground truncate">
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

                                <div className="flex items-center space-x-2 min-w-0">
                                  <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium">Paid By</div>
                                    <div className="text-muted-foreground truncate">
                                      {payerInfo.text}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 min-w-0">
                                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium">Shared By</div>
                                    <div className="text-muted-foreground truncate">
                                      {sharerInfo.text}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Additional info for itemwise expenses */}
                              {expense.split_method === 'itemwise' && Array.isArray(expense.items) && expense.items.length > 0 && (
                                <div className="pt-2 border-t border-border/50 w-full min-w-0">
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground min-w-0">
                                    <DollarSign className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{expense.items.length} items • Click to see itemwise breakdown</span>
                                  </div>
                                </div>
                              )}

                              {/* Celebration contribution indicator */}
                              {expense.celebration_contribution && Number(expense.celebration_contribution.amount) > 0 && (
                                <div className="pt-2 border-t border-border/50 w-full min-w-0">
                                  <div className="flex items-center space-x-2 text-xs text-yellow-600 dark:text-yellow-400 min-w-0">
                                    <PartyPopper className="h-4 w-4 shrink-0" />
                                    <span className="truncate">
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
              </SettleEaseModalSection>
            </>
          ) : (
            <SettleEaseModalSection className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No Expenses Found</h3>
                <p className="text-sm text-muted-foreground">
                  No specific contributing expenses found for this transaction, or the transaction is fully settled by direct payments.
                </p>
            </SettleEaseModalSection>
          )}
        </SettleEaseModalBody>
      </div>
    </SettleEaseDialog>
  );
}
