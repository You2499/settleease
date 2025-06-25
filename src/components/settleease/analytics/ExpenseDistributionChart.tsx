"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react'; // Assuming BarChart3 is the icon for distribution
import type { ExpenseAmountDistributionData } from '@/lib/settleease/types';

interface ExpenseDistributionChartProps {
  expenseAmountDistributionData: ExpenseAmountDistributionData[];
  analyticsViewMode: 'group' | 'personal';
}

export default function ExpenseDistributionChart({ expenseAmountDistributionData, analyticsViewMode }: ExpenseDistributionChartProps) {
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
