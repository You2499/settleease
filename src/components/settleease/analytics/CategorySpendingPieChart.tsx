"use client";

import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell as RechartsCell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIconLucide } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import { CHART_COLORS } from '@/lib/settleease/constants';
import type { CategorySpendingPieChartDataPoint } from '@/lib/settleease/types';


interface CategorySpendingPieChartProps {
  pieChartData: CategorySpendingPieChartDataPoint[];
  analyticsViewMode: 'group' | 'personal';
}

export default function CategorySpendingPieChart({ pieChartData, analyticsViewMode }: CategorySpendingPieChartProps) {
  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="p-0 pb-1">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <PieChartIconLucide className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Category Spending Breakdown {analyticsViewMode === 'personal' ? '(Your Spending)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-0 pt-0">
        {pieChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={pieChartData}
                dataKey="totalAmount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                fontSize={9}
              >
                {pieChartData.map((entry, index) => (
                  <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px', color: 'hsl(var(--popover-foreground))' }} 
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value:number) => [formatCurrency(value), "Amount"]} />
              <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            </RechartsPieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground h-full flex items-center justify-center text-xs sm:text-sm">No category data to display for this view.</p>
        )}
      </CardContent>
    </Card>
  );
}
