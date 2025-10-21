"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import type { CategoryAnalyticsData } from '@/lib/settleease/types';

interface CategoryAnalyticsTableProps {
  detailedCategoryAnalytics: CategoryAnalyticsData[];
  analyticsViewMode: 'group' | 'personal';
}

export default function CategoryAnalyticsTable({ detailedCategoryAnalytics, analyticsViewMode }: CategoryAnalyticsTableProps) {
  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <SearchCheck className={ANALYTICS_STYLES.icon} />
          Category Deep Dive {analyticsViewMode === 'personal' ? '(Your Spending)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.tableContent}>
        <ScrollArea className="h-auto max-h-[400px] w-full">
          <div className="min-w-[650px]">
            <Table>
            <TableHeader><TableRow>
              <TableHead className={ANALYTICS_STYLES.tableHeader}>Category</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right`}>Total {analyticsViewMode === 'personal' ? 'Share' : 'Spent'}</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right hidden sm:table-cell`}># Exp.</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right hidden sm:table-cell`}>Avg.</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden md:table-cell`}>Largest Item/Exp.</TableHead>
              {analyticsViewMode === 'personal' && <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden md:table-cell`}>Your Payments</TableHead>}
              {analyticsViewMode === 'group' && <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden md:table-cell`}>Top Payer</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {detailedCategoryAnalytics.filter(cat => cat.totalAmount > 0).map(cat => (
                <TableRow key={cat.name}>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} font-medium flex items-center truncate min-w-[120px] max-w-[120px]`} title={cat.name}>
                    <cat.Icon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />{cat.name}
                  </TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right min-w-[80px]`}>{formatCurrency(cat.totalAmount)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right hidden sm:table-cell min-w-[60px]`}>{cat.expenseCount}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right hidden sm:table-cell min-w-[80px]`}>{formatCurrency(cat.averageAmount)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden md:table-cell truncate min-w-[200px] max-w-[200px]`} title={cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description} (${formatCurrency(cat.mostExpensiveItem.amount)}) on ${cat.mostExpensiveItem.date}` : 'N/A'}>
                    {cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description.substring(0, 20)}... (${formatCurrency(cat.mostExpensiveItem.amount)})` : 'N/A'}
                  </TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden md:table-cell truncate min-w-[150px] max-w-[150px]`} title={cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}>
                    {cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
