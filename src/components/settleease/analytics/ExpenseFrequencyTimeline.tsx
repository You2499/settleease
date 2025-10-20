"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from 'lucide-react';
import { ANALYTICS_STYLES, createEmptyState } from '@/lib/settleease/analytics-styles';
import type { Expense } from '@/lib/settleease/types';

interface ExpenseFrequencyTimelineProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function ExpenseFrequencyTimeline({ 
  expenses, 
  analyticsViewMode, 
  selectedPersonIdForAnalytics 
}: ExpenseFrequencyTimelineProps) {
  
  const chartData = useMemo(() => {
    const dailyFrequency: Record<string, number> = {};

    expenses.forEach(exp => {
      if (!exp.created_at) return;
      
      let shouldInclude = false;
      if (analyticsViewMode === 'group') {
        shouldInclude = true;
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personPaid = exp.paid_by.some(p => p.personId === selectedPersonIdForAnalytics);
        const personShared = exp.shares.some(s => s.personId === selectedPersonIdForAnalytics && Number(s.amount) > 0.001);
        shouldInclude = personPaid || personShared;
      }

      if (shouldInclude) {
        const dateKey = new Date(exp.created_at).toLocaleDateString('en-CA'); // YYYY-MM-DD format
        dailyFrequency[dateKey] = (dailyFrequency[dateKey] || 0) + 1;
      }
    });

    // Convert to array and sort by date
    return Object.entries(dailyFrequency)
      .map(([date, frequency]) => ({ 
        date, 
        frequency,
        displayDate: new Date(date).toLocaleDateString('default', { month: 'short', day: 'numeric' })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Show last 30 days with activity
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Expense Frequency Timeline'
    : 'Group Expense Frequency Timeline';

  if (chartData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <Activity className={ANALYTICS_STYLES.icon} />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(chartTitle, Activity, "No expense frequency data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <Activity className={ANALYTICS_STYLES.icon} />
          {chartTitle}
        </CardTitle>

      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis 
              dataKey="displayDate" 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <YAxis 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <Tooltip 
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number) => [
                `${value} expense${value !== 1 ? 's' : ''}`, 
                'Frequency'
              ]}
            />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Line 
              type="monotone" 
              dataKey="frequency" 
              name="Daily Expenses"
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
              dot={{ r: 3 }} 
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}