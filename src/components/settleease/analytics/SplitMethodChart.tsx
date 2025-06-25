"use client";

import React from 'react';
import { PieChart, Pie, Cell as RechartsCell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitFork } from 'lucide-react';
import { CHART_COLORS } from '@/lib/settleease/constants';
import type { SplitMethodDistributionData } from '@/lib/settleease/types';

interface SplitMethodChartProps {
  splitMethodDistributionData: SplitMethodDistributionData[];
  analyticsViewMode: 'group' | 'personal';
}

export default function SplitMethodChart({ splitMethodDistributionData, analyticsViewMode }: SplitMethodChartProps) {
  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <GitFork className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Split Method Distribution {analyticsViewMode === 'personal' ? '(Your Splits)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-0 flex items-center justify-center">
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
