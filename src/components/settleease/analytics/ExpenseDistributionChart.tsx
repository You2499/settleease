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
      <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <CardTitle className="text-md sm:text-lg flex items-center">
          <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Expense Share Distribution {analyticsViewMode === 'personal' ? '(Your Shares)' : '(Total Amounts)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expenseAmountDistributionData} layout="vertical" margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
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
