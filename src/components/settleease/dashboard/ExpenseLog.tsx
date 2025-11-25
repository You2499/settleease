"use client";

import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, SettlementPayment } from '@/lib/settleease/types';
import type { Category } from '@/lib/settleease/types';
import { Separator } from '@/components/ui/separator';
import ExpenseListItem from '../ExpenseListItem';
import SettlementListItem from '../SettlementListItem';

interface ExpenseLogProps {
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  peopleMap: Record<string, string>;
  handleExpenseCardClick: (expense: Expense) => void;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: Category[];
  isLoadingExpenses?: boolean;
  isLoadingSettlements?: boolean;
}

type ActivityItem = 
  | { type: 'expense'; id: string; date: string; data: Expense }
  | { type: 'settlement'; id: string; date: string; data: SettlementPayment };

export default function ExpenseLog({
  expenses,
  settlementPayments,
  peopleMap,
  handleExpenseCardClick,
  getCategoryIconFromName,
  categories,
}: ExpenseLogProps) {

  // Combine expenses and settlements into a single activity list
  // Filter out expenses that are excluded from settlements
  const allActivities: ActivityItem[] = [
    ...expenses
      .filter(expense => !expense.exclude_from_settlement)
      .map(expense => ({
        type: 'expense' as const,
        id: expense.id,
        date: expense.created_at || new Date().toISOString(),
        data: expense,
      })),
    ...settlementPayments.map(settlement => ({
      type: 'settlement' as const,
      id: settlement.id,
      date: settlement.settled_at,
      data: settlement,
    })),
  ];

  // Sort by date, most recent first
  allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const groupedActivities = allActivities.reduce((acc, activity) => {
    const date = new Date(activity.date).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  const activityDates = Object.keys(groupedActivities);

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2"> {/* Adjusted padding */}
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold"><FileText className="mr-2 h-5 w-5 text-primary" /> Activity Feed</CardTitle>
        <CardDescription className="text-xs sm:text-sm">A chronological list of all expenses and settlement payments. Click an expense for details.</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0"> {/* Adjusted padding and flex-1 for fill */}
        {allActivities.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4">
              {activityDates.map((date, index) => (
                <div key={date}>
                  <div className={`relative ${index === 0 ? 'mb-3' : 'my-3'}`}>
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="bg-border shadow-inner opacity-80" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground font-semibold rounded shadow-inner border border-border/60" style={{ position: 'relative', top: '1px' }}>
                        {date}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 px-0.5 sm:px-1">
                    {groupedActivities[date].map(activity => {
                      if (activity.type === 'expense') {
                        return (
                          <ExpenseListItem
                            key={activity.id}
                            expense={activity.data}
                            peopleMap={peopleMap}
                            getCategoryIconFromName={getCategoryIconFromName}
                            categories={categories}
                            onClick={handleExpenseCardClick}
                          />
                        );
                      } else {
                        return (
                          <SettlementListItem
                            key={activity.id}
                            settlement={activity.data}
                            peopleMap={peopleMap}
                          />
                        );
                      }
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (<p className="text-sm text-muted-foreground p-2">No activity recorded yet.</p>)}
      </CardContent>
    </Card>
  );
}