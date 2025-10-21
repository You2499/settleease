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
        <ScrollArea className="h-auto max-h-[400px] w-full">
          <div className="min-w-[650px]">
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
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} font-medium truncate min-w-[120px] max-w-[120px] sm:max-w-[200px]`} title={exp.description}>{exp.description}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right font-semibold text-primary min-w-[80px]`}>{formatCurrency(exp.total_amount)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden sm:table-cell truncate min-w-[100px] max-w-[100px]`} title={exp.category}>{exp.category}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden md:table-cell min-w-[100px]`}>{new Date(exp.created_at || '').toLocaleDateString()}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden sm:table-cell truncate min-w-[150px] max-w-[150px]`} title={exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}>
                    {exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}
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
