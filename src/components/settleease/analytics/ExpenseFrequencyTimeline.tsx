"use client";

import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');
  
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

    // Calculate date range based on selected period and date
    const getDaysToShow = () => {
      switch (timePeriod) {
        case '1M': return 30;
        case '3M': return 90;
        case '6M': return 180;
        case '1Y': return 365;
        default: return 30;
      }
    };

    const daysToShow = getDaysToShow();
    const endDate = new Date(selectedDate);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (daysToShow - 1));
    
    const allDates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toLocaleDateString('en-CA');
      allDates.push({
        date: dateKey,
        frequency: dailyFrequency[dateKey] || 0,
        displayDate: new Date(dateKey).toLocaleDateString('default', { month: 'short', day: 'numeric' })
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return allDates;
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics, selectedDate, timePeriod]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Expense Frequency'
    : 'Group Expense Frequency';

  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

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
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 w-full">
          <CardTitle className={ANALYTICS_STYLES.title}>
            <Activity className={ANALYTICS_STYLES.icon} />
            {chartTitle}
          </CardTitle>
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 w-full sm:w-auto">
            {/* Time period buttons */}
            <div className="flex gap-1 flex-wrap w-full sm:w-auto">
              {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
                <Button
                  key={period}
                  size="sm"
                  variant={timePeriod === period ? "default" : "outline"}
                  className="h-6 px-2 text-xs"
                  onClick={() => setTimePeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
            {/* Month navigation */}
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium min-w-[80px] text-center">
                {selectedDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={goToNextMonth}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis 
              dataKey="displayDate" 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <YAxis 
              tick={ANALYTICS_STYLES.axisTick}
              domain={[0, 'dataMax + 1']}
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