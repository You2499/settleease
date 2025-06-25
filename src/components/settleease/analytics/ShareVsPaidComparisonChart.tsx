"use client";

import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from 'lucide-react';
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
  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Share vs. Paid {analyticsViewMode === 'personal' && personName ? `(For ${personName})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-2 sm:p-4 pt-1">
        {shareVsPaidData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={shareVsPaidData}
              margin={{ top: 5, right: 10, left: -5, bottom: (shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? 20 : 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                interval={0}
                angle={(shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? -25 : 0}
                textAnchor={(shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? "end" : "middle"}
                height={(shareVsPaidData.length > 3 && analyticsViewMode === 'group') ? 35 : 20}
              />
              <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
              <RechartsTooltip
                formatter={(value: number) => [formatCurrency(value), "Amount"]}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '11px', padding: '2px 6px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
              <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} barSize={Math.min(20, (shareVsPaidData.length > 0 ? (150 / shareVsPaidData.length / 2) : 20) * 0.8 )} />
              <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} barSize={Math.min(20, (shareVsPaidData.length > 0 ? (150 / shareVsPaidData.length / 2) : 20) * 0.8 )} />
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-xs sm:text-sm">No data for comparison chart.</p>)}
      </CardContent>
    </Card>
  );
}
