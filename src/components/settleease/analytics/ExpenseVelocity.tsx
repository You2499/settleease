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

function getWeekKey(date: Date) {
  // Use a simpler approach that's consistent with timezone handling
  // Group by week start (Monday) in local timezone
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const weekStart = new Date(date.getFullYear(), date.getMonth(), diff);
  return weekStart.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

export default function ExpenseVelocity({ 
  expenses, 
  analyticsViewMode, 
  selectedPersonIdForAnalytics 
}: ExpenseVelocityProps) {
  
  const chartData = useMemo(() => {
    const weeklyData: Record<string, { count: number, actualDates: Date[] }> = {};

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
        // Create date in local timezone (JavaScript automatically converts UTC to local)
        const date = new Date(exp.created_at);
        
        // For consistency with other charts, use the actual expense date for grouping
        // instead of calculating week starts
        const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
        
        if (!weeklyData[dateKey]) {
          weeklyData[dateKey] = { count: 0, actualDates: [] };
        }
        weeklyData[dateKey].count += 1;
        weeklyData[dateKey].actualDates.push(date);
      }
    });

    // Fill in missing weeks with 0 velocity for better visualization
    const today = new Date();
    const twelveWeeksAgo = new Date(today);
    twelveWeeksAgo.setDate(today.getDate() - (12 * 7));
    
    const allWeeks = [];
    for (let d = new Date(twelveWeeksAgo); d <= today; d.setDate(d.getDate() + 7)) {
      const weekKey = getWeekKey(d);
      const weekData = weeklyData[weekKey];
      const velocity = weekData ? weekData.count : 0;
      
      // Calculate week start for display
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
      const displayDate = weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      
      allWeeks.push({
        week: weekKey,
        velocity: velocity,
        displayWeek: velocity === 0 ? displayDate : (velocity === 1 ? displayDate : `${displayDate} (${velocity} expenses)`)
      });
    }
    
    return allWeeks.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
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
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis 
              dataKey="displayWeek" 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <YAxis 
              tick={ANALYTICS_STYLES.axisTick}
              domain={[0, 'dataMax + 1']}
            />
            <Tooltip 
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number, name: string) => {
                if (name === 'Average') {
                  return [`${value.toFixed(1)} expenses/week`, 'Average'];
                }
                return [`${value} expense${value !== 1 ? 's' : ''}/week`, 'Velocity'];
              }}
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