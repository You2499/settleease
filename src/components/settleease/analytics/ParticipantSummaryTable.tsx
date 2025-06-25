"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { ParticipantAnalyticsData } from '@/lib/settleease/types';

interface ParticipantSummaryTableProps {
  detailedParticipantAnalytics: ParticipantAnalyticsData[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
  peopleMap: Record<string, string>;
}

export default function ParticipantSummaryTable({
  detailedParticipantAnalytics,
  analyticsViewMode,
  selectedPersonIdForAnalytics,
  peopleMap,
}: ParticipantSummaryTableProps) {
  const personName = selectedPersonIdForAnalytics ? peopleMap[selectedPersonIdForAnalytics] : '';
  return (
    <Card className="shadow-md rounded-lg">
      <CardHeader className="p-0 pb-1">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {analyticsViewMode === 'personal' && personName ? `${personName}'s Financial Summary` : 'Participant Financial Summary'}
        </CardTitle>
        <CardDescription className="text-xs">Financial details derived from expense records (paid vs. share), not reflecting simplified settlements.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-0">
        <ScrollArea className="h-auto max-h-[400px]">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="py-2 px-2 text-xs">Participant</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right">Paid</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right">Shared</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right hidden sm:table-cell">Net</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right hidden md:table-cell"># Paid</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right hidden md:table-cell"># Shared</TableHead>
              <TableHead className="py-2 px-2 text-xs text-right hidden lg:table-cell">Avg. Share</TableHead>
              <TableHead className="py-2 px-2 text-xs hidden sm:table-cell">Top Category (Shared)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {detailedParticipantAnalytics.map(p => (
                <TableRow key={p.name}>
                  <TableCell className="py-1.5 px-2 text-xs font-medium truncate max-w-[80px] sm:max-w-xs">{p.name}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalPaid)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalShared)}</TableCell>
                  <TableCell className={`py-1.5 px-2 text-xs text-right font-semibold hidden sm:table-cell ${p.netBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(p.netBalance)}
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right hidden md:table-cell">{p.expensesPaidCount}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right hidden md:table-cell">{p.expensesSharedCount}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs text-right hidden lg:table-cell">{formatCurrency(p.averageShareAmount)}</TableCell>
                  <TableCell className="py-1.5 px-2 text-xs truncate max-w-[100px] sm:max-w-[150px] hidden sm:table-cell" title={p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name} (${formatCurrency(p.mostFrequentCategoryShared.amount)})` : 'N/A'}>
                    {p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name}` : 'N/A'}
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
