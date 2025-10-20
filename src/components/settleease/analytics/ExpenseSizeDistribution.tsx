"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import { ANALYTICS_STYLES, createEmptyState } from '@/lib/settleease/analytics-styles';
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

    // Calculate distribution ranges
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    // Create 6 buckets for distribution
    const bucketSize = (maxAmount - minAmount) / 6;
    const buckets = [
      { range: `₹0 - ₹${Math.round(minAmount + bucketSize)}`, count: 0, min: 0, max: minAmount + bucketSize },
      { range: `₹${Math.round(minAmount + bucketSize)} - ₹${Math.round(minAmount + bucketSize * 2)}`, count: 0, min: minAmount + bucketSize, max: minAmount + bucketSize * 2 },
      { range: `₹${Math.round(minAmount + bucketSize * 2)} - ₹${Math.round(minAmount + bucketSize * 3)}`, count: 0, min: minAmount + bucketSize * 2, max: minAmount + bucketSize * 3 },
      { range: `₹${Math.round(minAmount + bucketSize * 3)} - ₹${Math.round(minAmount + bucketSize * 4)}`, count: 0, min: minAmount + bucketSize * 3, max: minAmount + bucketSize * 4 },
      { range: `₹${Math.round(minAmount + bucketSize * 4)} - ₹${Math.round(minAmount + bucketSize * 5)}`, count: 0, min: minAmount + bucketSize * 4, max: minAmount + bucketSize * 5 },
      { range: `₹${Math.round(minAmount + bucketSize * 5)}+`, count: 0, min: minAmount + bucketSize * 5, max: Infinity }
    ];

    // Distribute amounts into buckets
    amounts.forEach(amount => {
      for (let i = 0; i < buckets.length; i++) {
        if (amount >= buckets[i].min && (amount < buckets[i].max || i === buckets.length - 1)) {
          buckets[i].count++;
          break;
        }
      }
    });

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
        <ResponsiveContainer width="100%" height="100%">
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
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}