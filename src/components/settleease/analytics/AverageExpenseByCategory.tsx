"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import { createEmptyState } from './EmptyState';
import type { Expense } from '@/lib/settleease/types';

interface AverageExpenseByCategoryProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

const UNCATEGORIZED = "Uncategorized";

export default function AverageExpenseByCategory({
  expenses,
  analyticsViewMode,
  selectedPersonIdForAnalytics
}: AverageExpenseByCategoryProps) {

  const chartData = useMemo(() => {
    const categoryData: Record<string, { total: number; count: number }> = {};

    expenses.forEach(exp => {
      let amount = 0;
      if (analyticsViewMode === 'group') {
        amount = Number(exp.total_amount);
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        amount = Number(personShare?.amount || 0);
      }

      if (amount > 0.001) {
        // Handle itemwise expenses
        if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
          const originalTotalBill = Number(exp.total_amount) || 0;
          const celebrationContribution = exp.celebration_contribution ? Number(exp.celebration_contribution.amount) : 0;
          const amountEffectivelySplit = Math.max(0, originalTotalBill - celebrationContribution);
          const sumOfOriginalItemPrices = exp.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

          const reductionFactor = (sumOfOriginalItemPrices > 0.001 && amountEffectivelySplit >= 0)
            ? (amountEffectivelySplit / sumOfOriginalItemPrices)
            : (sumOfOriginalItemPrices === 0 && amountEffectivelySplit === 0 ? 1 : 0);

          exp.items.forEach(item => {
            const originalItemPrice = Number(item.price) || 0;
            if (originalItemPrice <= 0.001) return;

            const category = item.categoryName || exp.category || UNCATEGORIZED;
            let categoryAmount = 0;

            if (analyticsViewMode === 'group') {
              categoryAmount = originalItemPrice;
            } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && item.sharedBy.includes(selectedPersonIdForAnalytics)) {
              const adjustedItemPrice = originalItemPrice * reductionFactor;
              categoryAmount = item.sharedBy.length > 0 ? adjustedItemPrice / item.sharedBy.length : 0;
            }

            if (categoryAmount > 0.001) {
              if (!categoryData[category]) {
                categoryData[category] = { total: 0, count: 0 };
              }
              categoryData[category].total += categoryAmount;
              categoryData[category].count += 1;
            }
          });
        } else {
          // Handle regular expenses
          const category = exp.category || UNCATEGORIZED;
          if (!categoryData[category]) {
            categoryData[category] = { total: 0, count: 0 };
          }
          categoryData[category].total += amount;
          categoryData[category].count += 1;
        }
      }
    });

    // Calculate averages and sort by average amount
    return Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        average: data.total / data.count,
        count: data.count
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 8); // Show top 8 categories
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  // Calculate intelligent X-axis domain for horizontal bar chart
  const xAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    const values = chartData.map(d => d.average);
    const maxValue = Math.max(...values);

    if (maxValue === 0) return [0, 100];

    // Add 10% padding to the right for horizontal bar charts, start from 0
    const paddedMax = maxValue * 1.1;
    return [0, paddedMax];
  }, [chartData]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Average Expense by Category'
    : 'Group Average Expense by Category';

  if (chartData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <Target className={ANALYTICS_STYLES.icon} />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState(chartTitle, Target, "No category average data available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <Target className={ANALYTICS_STYLES.icon} />
          {chartTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={chartData} layout="vertical" margin={ANALYTICS_STYLES.chartMarginsCompact}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis type="number" allowDecimals={false} tick={ANALYTICS_STYLES.axisTickSmall} domain={[0, 'dataMax + 1']} />
            <YAxis type="category" dataKey="category" width={90} tick={ANALYTICS_STYLES.axisTickSmall} />
            <Tooltip 
                {...ANALYTICS_STYLES.tooltip}
                formatter={(value: number, _name: string, props: any) => [
                formatCurrency(value),
                `Average (${props.payload.count} expense${props.payload.count !== 1 ? 's' : ''})`
              ]} />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
            <Bar dataKey="average" name="Average Amount" fill="hsl(var(--chart-4))" radius={[0, 2, 2, 0]} barSize={ANALYTICS_STYLES.barSizeCompact} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}