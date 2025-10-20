"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sigma } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { EnhancedOverallStats } from '@/lib/settleease/types'; // Assuming you'll create this type or pass specific fields

interface OverallAnalyticsSnapshotProps {
  enhancedOverallStats: EnhancedOverallStats;
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
  peopleMap: Record<string, string>;
}

export default function OverallAnalyticsSnapshot({
  enhancedOverallStats,
  analyticsViewMode,
  selectedPersonIdForAnalytics,
  peopleMap,
}: OverallAnalyticsSnapshotProps) {
  const personName = selectedPersonIdForAnalytics ? peopleMap[selectedPersonIdForAnalytics] : '';

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Sigma className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {analyticsViewMode === 'personal' && personName ? `${personName}'s Snapshot` : 'Overall Snapshot'}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm px-4 sm:px-5 pt-2 pb-4 sm:pb-5">
        <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
          <p className="text-xs text-muted-foreground">Total Spent {analyticsViewMode === 'personal' ? '(Your Share)' : '(Group Total)'}</p>
          <p className="text-md sm:text-lg font-bold text-accent">{formatCurrency(enhancedOverallStats.totalAmount)}</p>
        </div>
        <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
          <p className="text-xs text-muted-foreground">Total Expenses {analyticsViewMode === 'personal' ? '(Involved In)' : ''}</p>
          <p className="text-md sm:text-lg font-bold">{enhancedOverallStats.expenseCount}</p>
        </div>
        <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
          <p className="text-xs text-muted-foreground">Avg. Expense {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
          <p className="text-md sm:text-lg font-bold">{formatCurrency(enhancedOverallStats.averageAmount)}</p>
        </div>
        {analyticsViewMode === 'group' && (
          <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5">
            <p className="text-xs text-muted-foreground">Participants</p>
            <p className="text-md sm:text-lg font-bold">{enhancedOverallStats.distinctParticipantCount}</p>
          </div>
        )}
        <div className={`p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5 ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-1'}`}>
          <p className="text-xs text-muted-foreground">Top Category {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
          <p className="text-sm sm:text-base font-semibold truncate" title={enhancedOverallStats.mostExpensiveCategory.name}>
            {enhancedOverallStats.mostExpensiveCategory.name}
          </p>
          <p className="text-xs text-muted-foreground">{formatCurrency(enhancedOverallStats.mostExpensiveCategory.totalAmount)}</p>
        </div>
        <div className={`p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5 ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-2'}`}>
          <p className="text-xs text-muted-foreground">Largest Single Expense {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
          <p className="text-sm sm:text-base font-semibold truncate" title={enhancedOverallStats.largestSingleExpense.description}>
            {enhancedOverallStats.largestSingleExpense.description}
          </p>
          <p className="text-xs text-muted-foreground">{formatCurrency(enhancedOverallStats.largestSingleExpense.amount)} on {enhancedOverallStats.largestSingleExpense.date}</p>
        </div>
        <div className="p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 col-span-2 md:col-span-3 space-y-0.5">
          <p className="text-xs text-muted-foreground">Date Range (of these expenses)</p>
          <p className="text-xs sm:text-sm font-semibold">
            {enhancedOverallStats.firstDate ? enhancedOverallStats.firstDate.toLocaleDateString() : 'N/A'} - {enhancedOverallStats.lastDate ? enhancedOverallStats.lastDate.toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
