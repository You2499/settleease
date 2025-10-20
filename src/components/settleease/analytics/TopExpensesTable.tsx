"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
import type { TopExpenseData } from '@/lib/settleease/types';

interface TopExpensesTableProps {
  topExpensesData: TopExpenseData[];
  analyticsViewMode: 'group' | 'personal';
  peopleMap: Record<string, string>;
}

export default function TopExpensesTable({ topExpensesData, analyticsViewMode, peopleMap }: TopExpensesTableProps) {
  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <Award className={ANALYTICS_STYLES.icon} />
          Top 10 Largest Expenses {analyticsViewMode === 'personal' ? '(By Your Share)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.tableContent}>
        <ScrollArea className="h-auto max-h-[400px]">
          <Table>
            <TableHeader><TableRow>
              <TableHead className={ANALYTICS_STYLES.tableHeader}>Description</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right`}>Amount {analyticsViewMode === 'personal' ? '(Share)' : '(Total)'}</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden sm:table-cell`}>Category</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden md:table-cell`}>Date</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden sm:table-cell`}>Paid By</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {topExpensesData.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} font-medium truncate max-w-[100px] sm:max-w-xs`} title={exp.description}>{exp.description}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right font-semibold text-primary`}>{formatCurrency(exp.total_amount)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden sm:table-cell`}>{exp.category}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden md:table-cell`}>{new Date(exp.created_at || '').toLocaleDateString()}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} truncate max-w-[80px] sm:max-w-[150px] hidden sm:table-cell`} title={exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}>
                    {exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}
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
