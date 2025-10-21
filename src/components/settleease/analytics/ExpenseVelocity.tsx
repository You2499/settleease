"use client";

import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timePeriod, setTimePeriod] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');

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

        // Use week grouping for velocity chart
        const dateKey = getWeekKey(date);

        if (!weeklyData[dateKey]) {
          weeklyData[dateKey] = { count: 0, actualDates: [] };
        }
        weeklyData[dateKey].count += 1;
        weeklyData[dateKey].actualDates.push(date);
      }
    });

    // Calculate date range based on selected period and date
    const getWeeksToShow = () => {
      switch (timePeriod) {
        case '1M': return 4;
        case '3M': return 12;
        case '6M': return 24;
        case '1Y': return 52;
        default: return 4;
      }
    };

    const weeksToShow = getWeeksToShow();
    // Ensure we include the current week by using the end of the selected date
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999); // End of day
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - ((weeksToShow - 1) * 7));

    // Generate all weeks in the range, ensuring we include the current week
    const allWeeks: Array<{ week: string, velocity: number, displayWeek: string }> = [];
    const currentDate = new Date(startDate);

    // Make sure we include all weeks up to and including the week containing endDate
    while (currentDate <= endDate) {
      const weekKey = getWeekKey(currentDate);

      // Check if we already added this week
      if (!allWeeks.find(w => w.week === weekKey)) {
        const weekData = weeklyData[weekKey];
        const velocity = weekData ? weekData.count : 0;

        // Calculate week start for display
        const dayOfWeek = currentDate.getDay();
        const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), diff);
        const displayDate = weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' });

        allWeeks.push({
          week: weekKey,
          velocity: velocity,
          displayWeek: velocity === 0 ? displayDate : (velocity === 1 ? displayDate : `${displayDate} (${velocity} expenses)`)
        });
      }

      currentDate.setDate(currentDate.getDate() + 7);
    }

    // Also ensure we include the week containing the endDate
    const endWeekKey = getWeekKey(endDate);
    if (!allWeeks.find(w => w.week === endWeekKey)) {
      const weekData = weeklyData[endWeekKey];
      const velocity = weekData ? weekData.count : 0;

      const dayOfWeek = endDate.getDay();
      const diff = endDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(endDate.getFullYear(), endDate.getMonth(), diff);
      const displayDate = weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      allWeeks.push({
        week: endWeekKey,
        velocity: velocity,
        displayWeek: velocity === 0 ? displayDate : (velocity === 1 ? displayDate : `${displayDate} (${velocity} expenses)`)
      });
    }

    return allWeeks.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics, selectedDate, timePeriod]);

  const averageVelocity = useMemo(() => {
    if (chartData.length === 0) return 0;
    const totalVelocity = chartData.reduce((sum, week) => sum + week.velocity, 0);
    return totalVelocity / chartData.length;
  }, [chartData]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Expense Velocity'
    : 'Group Expense Velocity';

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
        <div className="flex items-center justify-between">
          <CardTitle className={ANALYTICS_STYLES.title}>
            <Zap className={ANALYTICS_STYLES.icon} />
            {chartTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Time period buttons */}
            <div className="flex gap-1">
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
            <div className="flex items-center gap-1">
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
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}