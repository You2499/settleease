"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart4 } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import type { ShareVsPaidDataPoint } from '@/lib/settleease/types';

interface ShareVsPaidComparisonChartProps {
  shareVsPaidData: ShareVsPaidDataPoint[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
  peopleMap: Record<string, string>;
}

export default function ShareVsPaidComparisonChart({
  shareVsPaidData,
  analyticsViewMode,
  selectedPersonIdForAnalytics,
  peopleMap
}: ShareVsPaidComparisonChartProps) {
  const personName = selectedPersonIdForAnalytics ? peopleMap[selectedPersonIdForAnalytics] : '';

  if (shareVsPaidData.length === 0) {
    return null; // Don't render the card if there's no data
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <BarChart4 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {analyticsViewMode === 'personal' && personName ? `Share vs. Paid (For ${personName})` : 'Share vs. Paid'}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={shareVsPaidData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} interval={0} />
            <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '\u20b9')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px', color: 'hsl(var(--popover-foreground))' }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number) => [formatCurrency(value), 'Amount']} />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} barSize={20} />
            <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
