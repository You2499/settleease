"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
// formatCurrency not needed for this component
import type { Expense } from '@/lib/settleease/types';

interface ExpenseSizeDistributionProps {
  expenses: Expense[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
}

export default function ExpenseSizeDistribution({ 
  expenses, 
  analyticsViewMode, 
  selectedPersonIdForAnalytics 
}: ExpenseSizeDistributionProps) {
  
  const chartData = useMemo(() => {
    const amounts: number[] = [];

    expenses.forEach(exp => {
      let amount = 0;
      if (analyticsViewMode === 'group') {
        amount = Number(exp.total_amount);
      } else if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
        const personShare = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics);
        amount = Number(personShare?.amount || 0);
      }

      if (amount > 0.001) {
        amounts.push(amount);
      }
    });

    if (amounts.length === 0) return [];

    // Calculate distribution ranges
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    
    // Create 6 buckets for distribution
    const bucketSize = (maxAmount - minAmount) / 6;
    const buckets = [
      { range: `₹0 - ₹${Math.round(minAmount + bucketSize)}`, count: 0, min: 0, max: minAmount + bucketSize },
      { range: `₹${Math.round(minAmount + bucketSize)} - ₹${Math.round(minAmount + bucketSize * 2)}`, count: 0, min: minAmount + bucketSize, max: minAmount + bucketSize * 2 },
      { range: `₹${Math.round(minAmount + bucketSize * 2)} - ₹${Math.round(minAmount + bucketSize * 3)}`, count: 0, min: minAmount + bucketSize * 2, max: minAmount + bucketSize * 3 },
      { range: `₹${Math.round(minAmount + bucketSize * 3)} - ₹${Math.round(minAmount + bucketSize * 4)}`, count: 0, min: minAmount + bucketSize * 3, max: minAmount + bucketSize * 4 },
      { range: `₹${Math.round(minAmount + bucketSize * 4)} - ₹${Math.round(minAmount + bucketSize * 5)}`, count: 0, min: minAmount + bucketSize * 4, max: minAmount + bucketSize * 5 },
      { range: `₹${Math.round(minAmount + bucketSize * 5)}+`, count: 0, min: minAmount + bucketSize * 5, max: Infinity }
    ];

    // Distribute amounts into buckets
    amounts.forEach(amount => {
      for (let i = 0; i < buckets.length; i++) {
        if (amount >= buckets[i].min && (amount < buckets[i].max || i === buckets.length - 1)) {
          buckets[i].count++;
          break;
        }
      }
    });

    return buckets.filter(bucket => bucket.count > 0);
  }, [expenses, analyticsViewMode, selectedPersonIdForAnalytics]);

  const chartTitle = analyticsViewMode === 'personal'
    ? 'Your Expense Size Distribution'
    : 'Group Expense Size Distribution';

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {chartTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            No expense size data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {chartTitle}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Distribution of expenses by amount ranges
        </div>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="range" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 8 }} 
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
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
              formatter={(value: number) => [
                `${value} expense${value !== 1 ? 's' : ''}`, 
                'Count'
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Bar 
              dataKey="count" 
              name="Number of Expenses"
              fill="hsl(var(--primary))" 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}