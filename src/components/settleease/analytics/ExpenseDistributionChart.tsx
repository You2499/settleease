"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
import type { Expense, ExpenseAmountDistributionData } from '@/lib/settleease/types';

interface ExpenseDistributionChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function ExpenseDistributionChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: ExpenseDistributionChartProps) {
  const expenseAmountDistributionData: ExpenseAmountDistributionData[] = useMemo(() => {
    const ranges = [
      { label: `₹0-₹500`, min: 0, max: 500 },
      { label: `₹501-₹1k`, min: 501, max: 1000 },
      { label: `₹1k-₹2.5k`, min: 1001, max: 2500 },
      { label: `₹2.5k-₹5k`, min: 2501, max: 5000 },
      { label: `₹5k-₹10k`, min: 5001, max: 10000 },
      { label: `₹10k+`, min: 10001, max: Infinity },
    ];
    const distribution: Record<string, number> = ranges.reduce((acc, range) => {
      acc[range.label] = 0;
      return acc;
    }, {} as Record<string, number>);

    expenses.forEach(exp => {
      let amount = 0;
      if (analyticsViewMode === 'group') {
        amount = Number(exp.total_amount);
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        amount = Number(personShare?.amount || 0);
      }
      if (amount > 0) {
        for (const range of ranges) {
          if (amount >= range.min && amount <= range.max) {
            distribution[range.label]++;
            break;
          }
        }
      }
    });
    return Object.entries(distribution).map(([range, count]) => ({ range, count })).filter(d => d.count > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  if (expenseAmountDistributionData.length === 0) {
    return null; // Don't render the card if there's no data
  }

  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Expense Share Distribution {analyticsViewMode === 'personal' ? '(Your Shares)' : '(Total Amounts)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expenseAmountDistributionData} layout="vertical" margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
            <YAxis type="category" dataKey="range" width={65} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} />
            <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px', color: 'hsl(var(--popover-foreground))' }} 
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value: number) => [value, "Number of Expenses/Shares"]} />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Bar dataKey="count" name="Count" fill="hsl(var(--chart-4))" radius={[0, 2, 2, 0]} barSize={15} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
