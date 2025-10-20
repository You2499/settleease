"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sigma } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import type { EnhancedOverallStats } from '@/lib/settleease/types';

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
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <Sigma className={ANALYTICS_STYLES.icon} />
          {analyticsViewMode === 'personal' && personName ? `${personName}'s Snapshot` : 'Overall Snapshot'}
        </CardTitle>
      </CardHeader>
      <CardContent className={`${ANALYTICS_STYLES.snapshotContent} grid grid-cols-2 md:grid-cols-3 gap-3 text-xs sm:text-sm`}>
        <div className={ANALYTICS_STYLES.snapshotCard}>
          <p className={ANALYTICS_STYLES.snapshotLabel}>Total Spent {analyticsViewMode === 'personal' ? '(Your Share)' : '(Group Total)'}</p>
          <p className={`${ANALYTICS_STYLES.snapshotValue} text-accent`}>{formatCurrency(enhancedOverallStats.totalAmount)}</p>
        </div>
        <div className={ANALYTICS_STYLES.snapshotCard}>
          <p className={ANALYTICS_STYLES.snapshotLabel}>Total Expenses {analyticsViewMode === 'personal' ? '(Involved In)' : ''}</p>
          <p className={ANALYTICS_STYLES.snapshotValue}>{enhancedOverallStats.expenseCount}</p>
        </div>
        <div className={ANALYTICS_STYLES.snapshotCard}>
          <p className={ANALYTICS_STYLES.snapshotLabel}>Avg. Expense {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
          <p className={ANALYTICS_STYLES.snapshotValue}>{formatCurrency(enhancedOverallStats.averageAmount)}</p>
        </div>
        {analyticsViewMode === 'group' && (
          <div className={ANALYTICS_STYLES.snapshotCard}>
            <p className={ANALYTICS_STYLES.snapshotLabel}>Participants</p>
            <p className={ANALYTICS_STYLES.snapshotValue}>{enhancedOverallStats.distinctParticipantCount}</p>
          </div>
        )}
        <div className={`${ANALYTICS_STYLES.snapshotCard} ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-1'}`}>
          <p className={ANALYTICS_STYLES.snapshotLabel}>Top Category {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
          <p className="text-sm sm:text-base font-semibold truncate" title={enhancedOverallStats.mostExpensiveCategory.name}>
            {enhancedOverallStats.mostExpensiveCategory.name}
          </p>
          <p className={ANALYTICS_STYLES.snapshotLabel}>{formatCurrency(enhancedOverallStats.mostExpensiveCategory.totalAmount)}</p>
        </div>
        <div className={`${ANALYTICS_STYLES.snapshotCard} ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-2'}`}>
          <p className={ANALYTICS_STYLES.snapshotLabel}>Largest Single Expense {analyticsViewMode === 'personal' ? '(Your Share)' : ''}</p>
          <p className="text-sm sm:text-base font-semibold truncate" title={enhancedOverallStats.largestSingleExpense.description}>
            {enhancedOverallStats.largestSingleExpense.description}
          </p>
          <p className={ANALYTICS_STYLES.snapshotLabel}>{formatCurrency(enhancedOverallStats.largestSingleExpense.amount)} on {enhancedOverallStats.largestSingleExpense.date}</p>
        </div>
        <div className={`${ANALYTICS_STYLES.snapshotCard} col-span-2 md:col-span-3`}>
          <p className={ANALYTICS_STYLES.snapshotLabel}>Date Range (of these expenses)</p>
          <p className="text-xs sm:text-sm font-semibold">
            {enhancedOverallStats.firstDate ? enhancedOverallStats.firstDate.toLocaleDateString() : 'N/A'} - {enhancedOverallStats.lastDate ? enhancedOverallStats.lastDate.toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
