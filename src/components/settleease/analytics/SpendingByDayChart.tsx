"use client";

import React, { useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { Expense, SpendingByDayOfWeekData } from '@/lib/settleease/types';

interface SpendingByDayChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function SpendingByDayChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: SpendingByDayChartProps) {
  // DEBUG: Component mounted
  useEffect(() => {
    console.log('🔴 SpendingByDayChart MOUNTED');
    console.log('🔴 Props:', {
      expensesCount: expenses.length,
      analyticsViewMode,
      selectedPersonIdForAnalytics
    });
  }, []);

  const spendingByDayOfWeekData: SpendingByDayOfWeekData[] = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const spending: Record<string, number> = days.reduce((acc, day) => { acc[day] = 0; return acc; }, {} as Record<string, number>);
    
    expenses.forEach(exp => {
      if (exp.created_at) {
        const dayOfWeek = days[new Date(exp.created_at).getDay()];
        let amountToLog = 0;
        
        if (analyticsViewMode === 'group') {
            amountToLog = Number(exp.total_amount);
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
            const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
            amountToLog = Number(personShare?.amount || 0);
        }
        
        if (amountToLog > 0.001) {
            spending[dayOfWeek] = (spending[dayOfWeek] || 0) + amountToLog;
        }
      }
    });
    
    const result = days.map(day => ({ day, totalAmount: spending[day] })).filter(d => d.totalAmount > 0);
    console.log('🔴 SpendingByDayChart result:', {
      spending,
      resultLength: result.length,
      result
    });
    return result;
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const title = analyticsViewMode === 'personal' ? 'Your Spending by Day' : 'Group Spending by Day';

  if (spendingByDayOfWeekData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <CalendarClock className={ANALYTICS_STYLES.icon} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(title, CalendarClock, "No daily spending data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <CalendarClock className={ANALYTICS_STYLES.icon} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spendingByDayOfWeekData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis dataKey="day" tick={ANALYTICS_STYLES.axisTick} />
            <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={ANALYTICS_STYLES.axisTick} />
            <Tooltip 
                {...ANALYTICS_STYLES.tooltip}
                formatter={(value:number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]}/>
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Bar dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} barSize={ANALYTICS_STYLES.barSize} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
