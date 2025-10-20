"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { CategoryAnalyticsData } from '@/lib/settleease/types';

interface CategoryAnalyticsTableProps {
  detailedCategoryAnalytics: CategoryAnalyticsData[];
  analyticsViewMode: 'group' | 'personal';
}

export default function CategoryAnalyticsTable({ detailedCategoryAnalytics, analyticsViewMode }: CategoryAnalyticsTableProps) {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <SearchCheck className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Category Deep Dive {analyticsViewMode === 'personal' ? '(Your Spending)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="h-auto max-h-[400px]">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="py-2 px-2 text-xs">Category</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right">Total {analyticsViewMode === 'personal' ? 'Share' : 'Spent'}</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right hidden sm:table-cell"># Exp.</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right hidden md:table-cell">Avg.</TableHead>
              <TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Largest Item/Exp.</TableHead>
              {analyticsViewMode === 'personal' && <TableHead className="py-2 px-2 text-xs hidden md:table-cell">Your Payments</TableHead>}
              {analyticsViewMode === 'group' && <TableHead className="py-2 px-2 text-xs hidden md:table-cell">Top Payer</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {detailedCategoryAnalytics.filter(cat => cat.totalAmount > 0).map(cat => (
                <TableRow key={cat.name}>
                  <TableCell className="py-1.5 px-2 text-xs font-medium flex items-center"><cat.Icon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />{cat.name}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(cat.totalAmount)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right hidden sm:table-cell">{cat.expenseCount}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right hidden md:table-cell">{formatCurrency(cat.averageAmount)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs truncate max-w-[100px] sm:max-w-[200px] hidden sm:table-cell" title={cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description} (${formatCurrency(cat.mostExpensiveItem.amount)}) on ${cat.mostExpensiveItem.date}` : 'N/A'}>
                    {cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description.substring(0, 20)}... (${formatCurrency(cat.mostExpensiveItem.amount)})` : 'N/A'}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-xs truncate max-w-[80px] sm:max-w-[150px] hidden md:table-cell" title={cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}>
                    {cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
