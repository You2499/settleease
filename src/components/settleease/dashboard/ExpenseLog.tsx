"use client";

import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense } from '@/lib/settleease/types';
import { Separator } from '@/components/ui/separator';

interface ExpenseLogProps {
  expenses: Expense[];
  peopleMap: Record<string, string>;
  handleExpenseCardClick: (expense: Expense) => void;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

export default function ExpenseLog({
  expenses,
  peopleMap,
  handleExpenseCardClick,
  getCategoryIconFromName,
}: ExpenseLogProps) {

  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = new Date(expense.created_at || new Date()).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const expenseDates = Object.keys(groupedExpenses);

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2"> {/* Adjusted padding */}
        <CardTitle className="flex items-center text-lg sm:text-xl"><FileText className="mr-2 h-5 w-5 text-primary" /> Expense Log</CardTitle>
        <CardDescription className="text-xs sm:text-sm">A list of all recorded expenses, most recent first. Click an expense for details.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2"> {/* Adjusted padding */}
        {expenses.length > 0 ? (
          <ScrollArea className="h-[350px]">
            <div className="space-y-4">
              {expenseDates.map((date, index) => (
                <div key={date}>
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center">
                      <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground font-semibold">
                        {date}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 px-0.5 sm:px-1">
                    {groupedExpenses[date].map(expense => {
                      const CategoryIcon = getCategoryIconFromName(expense.category);
                      const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
                        ? "Multiple Payers"
                        : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
                          ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
                          : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));

                      return (
                        <li key={expense.id} onClick={() => handleExpenseCardClick(expense)} className="cursor-pointer">
                          <Card className="bg-card/70 hover:bg-card/90 transition-all rounded-md">
                            <CardHeader className="pb-1.5 pt-2.5 px-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <CardTitle className="text-sm sm:text-[0.9rem] font-semibold leading-tight flex-1 mr-2 truncate" title={expense.description}>{expense.description}</CardTitle>
                                <span className="text-sm sm:text-md font-bold text-primary mt-1 sm:mt-0">{formatCurrency(Number(expense.total_amount))}</span>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                <div className="flex items-center"><CategoryIcon className="mr-1 h-3 w-3" /> {expense.category}</div>
                                <span className="mt-0.5 sm:mt-0">Paid by: <span className="font-medium">{displayPayerText}</span></span>
                              </div>
                            </CardContent>
                          </Card>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (<p className="text-sm text-muted-foreground p-2">No expenses recorded yet.</p>)}
      </CardContent>
    </Card>
  );
}
