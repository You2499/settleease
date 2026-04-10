"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { Expense } from '@/lib/settleease/types';

interface ExpenseSizeDistributionProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function ExpenseSizeDistribution({ 
  expenses, 
  analyticsViewMode, 
  selectedPersonIdForAnalytics 
}: ExpenseSizeDistributionProps) {
  
  const chartData = useMemo(() => {
    const amounts: number[] = [];

    expenses.forEach(exp => {
      let amount = 0;
      if (analyticsViewMode === 'group') {
        amount = Number(exp.total_amount);
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        amount = Number(personShare?.amount || 0);
      }

      if (amount > 0.001) {
        amounts.push(amount);
      }
    });

    if (amounts.length === 0) return [];

    // Use fixed, meaningful ranges instead of dynamic buckets
    const ranges = [
      { range: `₹0-₹100`, min: 0, max: 100 },
      { range: `₹101-₹500`, min: 101, max: 500 },
      { range: `₹501-₹1k`, min: 501, max: 1000 },
      { range: `₹1k-₹2.5k`, min: 1001, max: 2500 },
      { range: `₹2.5k-₹5k`, min: 2501, max: 5000 },
      { range: `₹5k+`, min: 5001, max: Infinity }
    ];

    const buckets = ranges.map(r => ({ ...r, count: 0 }));

    // Distribute amounts into buckets
    amounts.forEach(amount => {
      for (let i = 0; i < buckets.length; i++) {
        if (amount >= buckets[i].min && (amount <= buckets[i].max || i === buckets.length - 1)) {
          buckets[i].count++;
          break;
        }
      }
    });

    // Only return buckets with data
    return buckets.filter(bucket => bucket.count > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Expense Size Distribution'
    : 'Group Expense Size Distribution';

  if (chartData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <BarChart3 className={ANALYTICS_STYLES.icon} />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(chartTitle, BarChart3, "No expense size data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <BarChart3 className={ANALYTICS_STYLES.icon} />
          {chartTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis 
              dataKey="range" 
              tick={ANALYTICS_STYLES.axisTickSmall} 
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={ANALYTICS_STYLES.axisTick}
              domain={[0, 'dataMax + 1']}
            />
            <Tooltip 
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number) => [
                `${value} expense${value !== 1 ? 's' : ''}`, 
                'Count'
              ]}
            />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Bar 
              dataKey="count" 
              name="Number of Expenses"
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
              barSize={ANALYTICS_STYLES.barSize}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}