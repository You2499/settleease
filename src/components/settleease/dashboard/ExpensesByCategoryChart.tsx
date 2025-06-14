
"use client";

import React from 'react';
import { PieChart, Pie, Cell as RechartsCell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/settleease/utils';
import { CHART_COLORS } from '@/lib/settleease/constants';

interface ExpenseByCategoryDataPoint {
  name: string;
  amount: number;
}

interface ExpensesByCategoryChartProps {
  expensesByCategory: ExpenseByCategoryDataPoint[];
}

export default function ExpensesByCategoryChart({ expensesByCategory }: ExpensesByCategoryChartProps) {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="pb-2"><CardTitle className="text-lg">Expenses by Category</CardTitle></CardHeader>
      <CardContent className="h-[280px]">
        {expensesByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
              <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} outerRadius={Math.min(80, (typeof window !== "undefined" ? window.innerWidth : 300) / 8)} fill="#8884d8" dataKey="amount" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                {expensesByCategory.map((entry, index) => (<RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for category chart.</p>)}
      </CardContent>
    </Card>
  );
}
