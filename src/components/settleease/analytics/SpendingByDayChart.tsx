"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import type { Expense, SpendingByDayOfWeekData } from '@/lib/settleease/types';

interface SpendingByDayChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function SpendingByDayChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: SpendingByDayChartProps) {
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
    
    return days.map(day => ({ day, totalAmount: spending[day] })).filter(d => d.totalAmount > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  if (spendingByDayOfWeekData.length === 0) {
    return null; // Don't render the card if there's no data
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <CalendarClock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {analyticsViewMode === 'personal' ? 'Your Spending by Day' : 'Group Spending by Day'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spendingByDayOfWeekData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '8px', color: 'hsl(var(--popover-foreground))' }} 
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value:number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]}/>
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Bar dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
