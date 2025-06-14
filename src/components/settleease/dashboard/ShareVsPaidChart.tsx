
"use client";

import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { BarChart3 } from 'lucide-react'; // Added icon

interface ShareVsPaidDataPoint {
  name: string;
  paid: number;
  share: number;
}

interface ShareVsPaidChartProps {
  shareVsPaidData: ShareVsPaidDataPoint[];
}

export default function ShareVsPaidChart({ shareVsPaidData }: ShareVsPaidChartProps) {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-xl">
          <BarChart3 className="mr-2 h-5 w-5 text-primary" />
          Share vs. Paid Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        {shareVsPaidData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={shareVsPaidData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} 
                interval={0} 
                angle={shareVsPaidData.length > 4 ? -30 : 0} 
                textAnchor={shareVsPaidData.length > 4 ? "end" : "middle"} 
                height={shareVsPaidData.length > 4 ? 50: 30} 
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} barSize={Math.min(20, 60 / (shareVsPaidData.length || 1))} />
              <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} barSize={Math.min(20, 60 / (shareVsPaidData.length || 1))} />
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for comparison chart.</p>)}
      </CardContent>
    </Card>
  );
}
