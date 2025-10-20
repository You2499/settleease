"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
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

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Average Expense by Category'
    : 'Group Average Expense by Category';

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <Target className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            No category average data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Target className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {chartTitle}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Average expense amount per category
        </div>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="horizontal"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              type="number"
              tickFormatter={(value) => formatCurrencyForAxis(value, '₹')}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
            />
            <YAxis 
              type="category"
              dataKey="category"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
              width={60}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                borderColor: 'hsl(var(--border))', 
                borderRadius: 'var(--radius)', 
                fontSize: '11px', 
                padding: '8px', 
                color: 'hsl(var(--popover-foreground))' 
              }} 
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number, name: string, props: any) => [
                formatCurrency(value), 
                `Average (${props.payload.count} expense${props.payload.count !== 1 ? 's' : ''})`
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Bar 
              dataKey="average" 
              name="Average Amount"
              fill="hsl(var(--primary))" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}