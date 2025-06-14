
"use client";

import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense } from '@/lib/settleease/types';

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
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-xl"><FileText className="mr-2 h-5 w-5 text-primary" /> Expense Log</CardTitle>
        <CardDescription className="text-sm">A list of all recorded expenses, most recent first. Click an expense for details.</CardDescription>
      </CardHeader>
      <CardContent>
        {expenses.length > 0 ? (
          <ScrollArea className="h-[350px]">
            <ul className="space-y-2.5 pr-4"> {/* pr-4 added here, removed from ScrollArea */}
              {expenses.map(expense => {
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
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-[0.9rem] font-semibold leading-tight">{expense.description}</CardTitle>
                          <span className="text-md font-bold text-primary">{formatCurrency(Number(expense.total_amount))}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center"><CategoryIcon className="mr-1 h-3 w-3" /> {expense.category}</div>
                          <span>Paid by: <span className="font-medium">{displayPayerText}</span></span>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        ) : (<p className="text-sm text-muted-foreground p-2">No expenses recorded yet.</p>)}
      </CardContent>
    </Card>
  );
}
