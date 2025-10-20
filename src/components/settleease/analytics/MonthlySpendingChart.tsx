"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, CalendarRange } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import type { Expense } from '@/lib/settleease/types';
import { Button } from '@/components/ui/button';

interface MonthlySpendingChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

function getISOWeek(date: Date) {
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
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
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      if (exp.created_at) {
        const week = getISOWeek(new Date(exp.created_at));
        let amountToLog = 0;
        if (analyticsViewMode === 'group') {
          amountToLog = Number(exp.total_amount);
        } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
          const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
          amountToLog = Number(personShare?.amount || 0);
        }
        if (amountToLog > 0.001) {
          data[week] = (data[week] || 0) + amountToLog;
        }
      }
    });
    return Object.entries(data)
      .map(([week, totalAmount]) => ({ week, totalAmount }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const isMonthly = view === 'monthly';
  const chartData = isMonthly ? monthlyExpenseData : weeklyExpenseData;
  const xKey = isMonthly ? 'month' : 'week';
  const chartLabel = analyticsViewMode === 'personal'
    ? (isMonthly ? 'Your Spending Over Time (Monthly)' : 'Your Spending Over Time (Weekly)')
    : (isMonthly ? 'Group Expenses Over Time (Monthly)' : 'Group Expenses Over Time (Weekly)');
  const ToggleIcon = isMonthly ? CalendarRange : Calendar;

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
        <div className="flex items-center text-xl sm:text-2xl font-bold">
          <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {chartLabel}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="ml-2 h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={() => setView(isMonthly ? 'weekly' : 'monthly')}
          aria-label={isMonthly ? 'Switch to weekly view' : 'Switch to monthly view'}
        >
          <ToggleIcon className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '8px', color: 'hsl(var(--popover-foreground))' }} 
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value:number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]} />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Line type="monotone" dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
