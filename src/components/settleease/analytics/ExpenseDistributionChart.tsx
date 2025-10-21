"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig } from 'lucide-react';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { Expense, ExpenseAmountDistributionData } from '@/lib/settleease/types';

interface ExpenseDistributionChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function ExpenseDistributionChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: ExpenseDistributionChartProps) {
  const expenseAmountDistributionData: ExpenseAmountDistributionData[] = useMemo(() => {
    const ranges = [
      { label: `₹0-₹500`, min: 0, max: 500 },
      { label: `₹501-₹1k`, min: 501, max: 1000 },
      { label: `₹1k-₹2.5k`, min: 1001, max: 2500 },
      { label: `₹2.5k-₹5k`, min: 2501, max: 5000 },
      { label: `₹5k-₹10k`, min: 5001, max: 10000 },
      { label: `₹10k+`, min: 10001, max: Infinity },
    ];
    const distribution: Record<string, number> = ranges.reduce((acc, range) => {
      acc[range.label] = 0;
      return acc;
    }, {} as Record<string, number>);

    expenses.forEach(exp => {
      let amount = 0;
      if (analyticsViewMode === 'group') {
        amount = Number(exp.total_amount);
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        amount = Number(personShare?.amount || 0);
      }
      if (amount > 0) {
        for (const range of ranges) {
          if (amount >= range.min && amount <= range.max) {
            distribution[range.label]++;
            break;
          }
        }
      }
    });
    return Object.entries(distribution).map(([range, count]) => ({ range, count })).filter(d => d.count > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const title = `Expense Share Distribution ${analyticsViewMode === 'personal' ? '(Your Shares)' : '(Total Amounts)'}`;

  if (expenseAmountDistributionData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <BarChartBig className={ANALYTICS_STYLES.icon} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(title, BarChartBig, "No expense distribution data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <BarChartBig className={ANALYTICS_STYLES.icon} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expenseAmountDistributionData} layout="vertical" margin={ANALYTICS_STYLES.chartMarginsCompact}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis type="number" allowDecimals={false} tick={ANALYTICS_STYLES.axisTickSmall} />
            <YAxis type="category" dataKey="range" width={55} tick={{ ...ANALYTICS_STYLES.axisTickSmall, fontSize: 7 }} />
            <Tooltip 
                {...ANALYTICS_STYLES.tooltip}
                formatter={(value: number) => [value, "Number of Expenses/Shares"]} />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Bar dataKey="count" name="Count" fill="hsl(var(--chart-4))" radius={[0, 2, 2, 0]} barSize={ANALYTICS_STYLES.barSizeCompact} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
