"use client";

import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell as RechartsCell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIconLucide } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import { CHART_COLORS } from '@/lib/settleease/constants';
import { ANALYTICS_STYLES, createEmptyState } from '@/lib/settleease/analytics-styles';
import type { CategorySpendingPieChartDataPoint } from '@/lib/settleease/types';


interface CategorySpendingPieChartProps {
  pieChartData: CategorySpendingPieChartDataPoint[];
  analyticsViewMode: 'group' | 'personal';
}

export default function CategorySpendingPieChart({ pieChartData, analyticsViewMode }: CategorySpendingPieChartProps) {
  const title = `Category Spending Breakdown ${analyticsViewMode === 'personal' ? '(Your Spending)' : ''}`;
  
  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <PieChartIconLucide className={ANALYTICS_STYLES.icon} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        {pieChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={pieChartData}
                dataKey="totalAmount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                fontSize={12}
              >
                {pieChartData.map((_, index) => (
                  <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                {...ANALYTICS_STYLES.tooltip}
                formatter={(value:number) => [formatCurrency(value), "Amount"]} />
              <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            </RechartsPieChart>
          </ResponsiveContainer>
        ) : (
          createEmptyState(title, PieChartIconLucide, "No category data to display for this view.")
        )}
      </CardContent>
    </Card>
  );
}
