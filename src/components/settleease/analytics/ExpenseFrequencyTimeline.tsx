"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from 'lucide-react';
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
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <Activity className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            No expense frequency data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Activity className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {chartTitle}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Daily expense frequency over the last 30 active days
        </div>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="displayDate" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                borderColor: 'hsl(var(--border))', 
                borderRadius: 'var(--radius)', 
                fontSize: '11px', 
                padding: '8px', 
                color: 'hsl(var(--popover-foreground))' 
              }} 
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number) => [
                `${value} expense${value !== 1 ? 's' : ''}`, 
                'Frequency'
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
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