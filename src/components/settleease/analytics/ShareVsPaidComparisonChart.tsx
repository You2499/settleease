"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart4 } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { ShareVsPaidDataPoint } from '@/lib/settleease/types';

interface ShareVsPaidComparisonChartProps {
  shareVsPaidData: ShareVsPaidDataPoint[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
  peopleMap: Record<string, string>;
}

export default function ShareVsPaidComparisonChart({
  shareVsPaidData,
  analyticsViewMode,
  selectedPersonIdForAnalytics,
  peopleMap
}: ShareVsPaidComparisonChartProps) {
  const personName = selectedPersonIdForAnalytics ? peopleMap[selectedPersonIdForAnalytics] : '';
  const title = analyticsViewMode === 'personal' && personName ? `Share vs. Paid (For ${personName})` : 'Share vs. Paid';

  // Calculate intelligent Y-axis domain
  const yAxisDomain = React.useMemo(() => {
    if (shareVsPaidData.length === 0) return [0, 100];

    const allValues = shareVsPaidData.flatMap(d => [d.paid, d.share]);
    const maxValue = Math.max(...allValues);

    if (maxValue === 0) return [0, 100];

    // Add 10% padding to the top for bar charts, start from 0
    const paddedMax = maxValue * 1.1;
    return [0, paddedMax];
  }, [shareVsPaidData]);

  if (shareVsPaidData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <BarChart4 className={ANALYTICS_STYLES.icon} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(title, BarChart4, "No share vs. paid data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <BarChart4 className={ANALYTICS_STYLES.icon} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={shareVsPaidData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis dataKey="name" tick={ANALYTICS_STYLES.axisTick} interval={0} />
            <YAxis 
              tickFormatter={(value) => formatCurrencyForAxis(value, '\u20b9')} 
              tick={ANALYTICS_STYLES.axisTick}
              domain={yAxisDomain}
            />
            <Tooltip
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number) => [formatCurrency(value), 'Amount']} />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} barSize={ANALYTICS_STYLES.barSize} />
            <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} barSize={ANALYTICS_STYLES.barSize} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
