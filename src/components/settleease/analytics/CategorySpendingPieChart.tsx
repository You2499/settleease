
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
      <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <CardTitle className="text-md sm:text-lg flex items-center">
          <PieChartIconLucide className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Spending by Category (Top 5) {analyticsViewMode === 'personal' ? '(Your Shares)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1">
        {pieChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart margin={{ top: 0, right: 0, bottom: 10, left: 0 }}>
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
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }} 
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
