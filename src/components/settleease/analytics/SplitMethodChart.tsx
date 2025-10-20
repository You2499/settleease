"use client";

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell as RechartsCell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitFork } from 'lucide-react';
import { CHART_COLORS } from '@/lib/settleease/constants';
import { ANALYTICS_STYLES, createEmptyState } from '@/lib/settleease/analytics-styles';
import type { Expense, SplitMethodDistributionData } from '@/lib/settleease/types';

interface SplitMethodChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function SplitMethodChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: SplitMethodChartProps) {
  const splitMethodDistributionData: SplitMethodDistributionData[] = useMemo(() => {
    const counts: Record<string, number> = { 'equal': 0, 'unequal': 0, 'itemwise': 0 };
    
    expenses.forEach(exp => {
      if (analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && exp.shares.some(s => s.personId === selectedPersonIdForAnalytics && Number(s.amount) > 0.001))) {
        counts[exp.split_method] = (counts[exp.split_method] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([method, count]) => ({ method: method.charAt(0).toUpperCase() + method.slice(1), count }))
      .filter(d => d.count > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const title = `Split Method Distribution ${analyticsViewMode === 'personal' ? '(Your Splits)' : ''}`;

  if (splitMethodDistributionData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <GitFork className={ANALYTICS_STYLES.icon} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(title, GitFork, "No split method data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <GitFork className={ANALYTICS_STYLES.icon} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={ANALYTICS_STYLES.chartMarginsPie}>
            <Pie data={splitMethodDistributionData} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
              {splitMethodDistributionData.map((entry, index) => (
                <RechartsCell key={`cell-split-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
                {...ANALYTICS_STYLES.tooltip}
                formatter={(value:number) => [value, "Expenses"]}/>
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
