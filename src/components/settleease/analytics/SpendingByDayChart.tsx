"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import type { SpendingByDayOfWeekData } from '@/lib/settleease/types';

interface SpendingByDayChartProps {
  spendingByDayOfWeekData: SpendingByDayOfWeekData[];
  analyticsViewMode: 'group' | 'personal';
}

export default function SpendingByDayChart({ spendingByDayOfWeekData, analyticsViewMode }: SpendingByDayChartProps) {
  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <CardTitle className="text-md sm:text-lg flex items-center">
          <CalendarClock className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {analyticsViewMode === 'personal' ? 'Your Spending by Day' : 'Group Spending by Day'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spendingByDayOfWeekData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px', color: 'hsl(var(--popover-foreground))' }} 
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                formatter={(value:number) => [formatCurrency(value), analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"]}/>
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Bar dataKey="totalAmount" name={analyticsViewMode === 'personal' ? "Your Total Share" : "Total Spent"} fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
