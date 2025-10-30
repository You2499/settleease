"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, CalendarRange } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { Expense } from '@/lib/settleease/types';
import { Button } from '@/components/ui/button';

interface MonthlySpendingChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

function getWeekKey(date: Date) {
  // Use a simpler approach that's consistent with timezone handling
  // Group by week start (Monday) in local timezone
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const weekStart = new Date(date.getFullYear(), date.getMonth(), diff);
  return weekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

export default function MonthlySpendingChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: MonthlySpendingChartProps) {
  const [view, setView] = React.useState<'monthly' | 'weekly'>('monthly');

  // Compute monthly data
  const monthlyExpenseData = React.useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      if (exp.created_at) {
        const monthYear = new Date(exp.created_at).toLocaleDateString('default', { year: 'numeric', month: 'short' });
        let amountToLog = 0;
        if (analyticsViewMode === 'group') {
          amountToLog = Number(exp.total_amount);
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
          const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
          amountToLog = Number(personShare?.amount || 0);
        }
        if (amountToLog > 0.001) {
          data[monthYear] = (data[monthYear] || 0) + amountToLog;
        }
      }
    });
    return Object.entries(data)
      .map(([month, totalAmount]) => ({ month, totalAmount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  // Compute weekly data
  const weeklyExpenseData = React.useMemo(() => {
    const data: Record<string, { amount: number, weekStart: Date }> = {};
    expenses.forEach(exp => {
      if (exp.created_at) {
        // Create date in local timezone (JavaScript automatically converts UTC to local)
        const expenseDate = new Date(exp.created_at);
        const weekKey = getWeekKey(expenseDate);

        let amountToLog = 0;
        if (analyticsViewMode === 'group') {
          amountToLog = Number(exp.total_amount);
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
          const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
          amountToLog = Number(personShare?.amount || 0);
        }
        if (amountToLog > 0.001) {
          if (!data[weekKey]) {
            const dayOfWeek = expenseDate.getDay();
            const diff = expenseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const weekStart = new Date(expenseDate.getFullYear(), expenseDate.getMonth(), diff);
            data[weekKey] = { amount: 0, weekStart };
          }
          data[weekKey].amount += amountToLog;
        }
      }
    });
    return Object.entries(data)
      .map(([weekKey, { amount, weekStart }]) => ({
        week: `Week of ${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`,
        totalAmount: amount,
        sortKey: weekKey
      }))
      .sort((a, b) => new Date(a.sortKey).getTime() - new Date(b.sortKey).getTime());
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const isMonthly = view === 'monthly';
  const chartData = isMonthly ? monthlyExpenseData : weeklyExpenseData;
  const xKey = isMonthly ? 'month' : 'week';
  const chartLabel = analyticsViewMode === 'personal'
    ? (isMonthly ? 'Your Spending Over Time (Monthly)' : 'Your Spending Over Time (Weekly)')
    : (isMonthly ? 'Group Expenses Over Time (Monthly)' : 'Group Expenses Over Time (Weekly)');
  const ToggleIcon = isMonthly ? CalendarRange : Calendar;

  // Calculate intelligent Y-axis domain
  const yAxisDomain = React.useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    const values = chartData.map(d => d.totalAmount);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    if (maxValue === 0) return [0, 100];

    // For line charts, we can start from a bit below the minimum if it makes sense
    const range = maxValue - minValue;
    const padding = range * 0.1;

    // If all values are close to each other, provide some padding
    if (range < maxValue * 0.1) {
      const center = (maxValue + minValue) / 2;
      const paddedRange = Math.max(maxValue * 0.2, 100); // At least 100 or 20% of max
      return [Math.max(0, center - paddedRange / 2), center + paddedRange / 2];
    }

    // Otherwise, start from 0 or slightly below min, and add padding to max
    const domainMin = minValue > 0 && minValue > maxValue * 0.1 ? Math.max(0, minValue - padding) : 0;
    const domainMax = maxValue + padding;

    return [domainMin, domainMax];
  }, [chartData]);





  if (chartData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <TrendingUp className={ANALYTICS_STYLES.icon} />
            {chartLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(chartLabel, TrendingUp, "No spending data available for this view.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${ANALYTICS_STYLES.card} prevent-horizontal-scroll`}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 w-full">
          <CardTitle className={ANALYTICS_STYLES.title}>
            <TrendingUp className={ANALYTICS_STYLES.icon} />
            {chartLabel}
          </CardTitle>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary"
            onClick={() => setView(isMonthly ? 'weekly' : 'monthly')}
            aria-label={isMonthly ? 'Switch to weekly view' : 'Switch to monthly view'}
          >
            <ToggleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis dataKey={xKey} tick={ANALYTICS_STYLES.axisTick} />
            <YAxis
              tickFormatter={(value) => formatCurrencyForAxis(value, '₹')}
              tick={ANALYTICS_STYLES.axisTick}
              domain={yAxisDomain}
            />
            <Tooltip
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]} />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Line type="monotone" dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
