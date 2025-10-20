"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from 'lucide-react';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { Expense } from '@/lib/settleease/types';

interface ExpenseVelocityProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function ExpenseVelocity({ 
  expenses, 
  analyticsViewMode, 
  selectedPersonIdForAnalytics 
}: ExpenseVelocityProps) {
  
  const chartData = useMemo(() => {
    const weeklyData: Record<string, number> = {};

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
        const date = new Date(exp.created_at);
        // Get week start (Monday)
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        const weekKey = weekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
      }
    });

    // Convert to array and calculate velocity (expenses per week)
    const sortedWeeks = Object.entries(weeklyData)
      .map(([week, count]) => ({ 
        week, 
        velocity: count,
        displayWeek: new Date(week).toLocaleDateString('default', { month: 'short', day: 'numeric' })
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-12); // Show last 12 weeks

    return sortedWeeks;
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const averageVelocity = useMemo(() => {
    if (chartData.length === 0) return 0;
    const totalVelocity = chartData.reduce((sum, week) => sum + week.velocity, 0);
    return totalVelocity / chartData.length;
  }, [chartData]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Expense Velocity'
    : 'Group Expense Velocity';

  if (chartData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <Zap className={ANALYTICS_STYLES.icon} />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(chartTitle, Zap, "No expense velocity data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <Zap className={ANALYTICS_STYLES.icon} />
          {chartTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis 
              dataKey="displayWeek" 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <YAxis 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <Tooltip 
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number) => [
                `${value} expense${value !== 1 ? 's' : ''}/week`, 
                'Velocity'
              ]}
            />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Line 
              type="monotone" 
              dataKey="velocity" 
              name="Expenses per Week"
              stroke="hsl(var(--primary))" 
              strokeWidth={2} 
              dot={{ r: 3 }} 
              activeDot={{ r: 5 }} 
            />
            {/* Average line */}
            <Line 
              type="monotone" 
              dataKey={() => averageVelocity} 
              name="Average"
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1} 
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}