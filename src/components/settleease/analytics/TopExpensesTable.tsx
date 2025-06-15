
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { TopExpenseData } from '@/lib/settleease/types';

interface TopExpensesTableProps {
  topExpensesData: TopExpenseData[];
  analyticsViewMode: 'group' | 'personal';
  peopleMap: Record<string, string>;
}

export default function TopExpensesTable({ topExpensesData, analyticsViewMode, peopleMap }: TopExpensesTableProps) {
  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <CardTitle className="text-md sm:text-lg flex items-center">
          <Award className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Top 10 Largest Expenses {analyticsViewMode === 'personal' ? '(By Your Share)' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-2 pb-0 pt-1">
        <ScrollArea className="h-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-2 text-xs">Description</TableHead>
                <TableHead className="py-2 px-2 text-xs text-right">Amount {analyticsViewMode === 'personal' ? '(Share)' : '(Total)'}</TableHead>
                <TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Category</TableHead>
                <TableHead className="py-2 px-2 text-xs hidden md:table-cell">Date</TableHead>
                <TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Paid By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topExpensesData.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell className="py-1.5 px-2 text-xs font-medium truncate max-w-[100px] sm:max-w-xs" title={exp.description}>{exp.description}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right font-semibold text-primary">{formatCurrency(exp.total_amount)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs hidden sm:table-cell">{exp.category}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs hidden md:table-cell">{new Date(exp.created_at || '').toLocaleDateString()}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs truncate max-w-[80px] sm:max-w-[150px] hidden sm:table-cell" title={exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}>
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
