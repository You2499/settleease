"use client";

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell as RechartsCell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitFork } from 'lucide-react';
import { CHART_COLORS } from '@/lib/settleease/constants';
import type { Expense, SplitMethodDistributionData } from '@/lib/settleease/types';

interface SplitMethodChartProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function SplitMethodChart({ expenses, analyticsViewMode, selectedPersonIdForAnalytics }: SplitMethodChartProps) {
  const splitMethodDistributionData: SplitMethodDistributionData[] = useMemo(() => {
    const counts: Record<string, number> = { 'equal': 0, 'unequal': 0, 'itemwise': 0 };
    
    expenses.forEach(exp => {
      if (analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && exp.shares.some(s => s.personId === selectedPersonIdForAnalytics && Number(s.amount) > 0.001))) {
        counts[exp.split_method] = (counts[exp.split_method] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([method, count]) => ({ method: method.charAt(0).toUpperCase() + method.slice(1), count }))
      .filter(d => d.count > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  if (splitMethodDistributionData.length === 0) {
    return null; // Don't render card if there's no data
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <GitFork className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Split Method Distribution {analyticsViewMode === 'personal' ? '(Your Splits)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie data={splitMethodDistributionData} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
              {splitMethodDistributionData.map((entry, index) => (
                <RechartsCell key={`cell-split-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px', color: 'hsl(var(--popover-foreground))' }} 
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value:number) => [value, "Expenses"]}/>
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
