"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from 'lucide-react';
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
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            No expense velocity data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {chartTitle}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Weekly expense creation rate • Avg: {averageVelocity.toFixed(1)} expenses/week
        </div>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="displayWeek" 
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
                `${value} expense${value !== 1 ? 's' : ''}/week`, 
                'Velocity'
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
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