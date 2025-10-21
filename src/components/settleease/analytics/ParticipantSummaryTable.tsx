"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';
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
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          <User className={ANALYTICS_STYLES.icon} />
          {analyticsViewMode === 'personal' && personName ? `${personName}'s Financial Summary` : 'Participant Financial Summary'}
        </CardTitle>
        <CardDescription className={ANALYTICS_STYLES.subtitle}>Financial details derived from expense records (paid vs. share), not reflecting simplified settlements.</CardDescription>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.tableContent}>
        <ScrollArea className="h-auto max-h-[400px] w-full">
          <div className="min-w-[750px]">
            <Table>
            <TableHeader><TableRow>
              <TableHead className={ANALYTICS_STYLES.tableHeader}>Participant</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right`}>Paid</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right`}>Shared</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right hidden sm:table-cell`}>Net</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right hidden sm:table-cell`}># Paid</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right hidden sm:table-cell`}># Shared</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} text-right hidden md:table-cell`}>Avg. Share</TableHead>
              <TableHead className={`${ANALYTICS_STYLES.tableHeader} hidden md:table-cell`}>Top Category (Shared)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {detailedParticipantAnalytics.map(p => (
                <TableRow key={p.name}>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} font-medium truncate min-w-[120px] max-w-[120px]`} title={p.name}>{p.name}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right min-w-[80px]`}>{formatCurrency(p.totalPaid)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right min-w-[80px]`}>{formatCurrency(p.totalShared)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right font-semibold hidden sm:table-cell min-w-[80px] ${p.netBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatCurrency(p.netBalance)}
                  </TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right hidden sm:table-cell min-w-[60px]`}>{p.expensesPaidCount}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right hidden sm:table-cell min-w-[60px]`}>{p.expensesSharedCount}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} text-right hidden md:table-cell min-w-[80px]`}>{formatCurrency(p.averageShareAmount)}</TableCell>
                  <TableCell className={`${ANALYTICS_STYLES.tableCell} hidden md:table-cell truncate min-w-[150px] max-w-[150px]`} title={p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name} (${formatCurrency(p.mostFrequentCategoryShared.amount)})` : 'N/A'}>
                    {p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name}` : 'N/A'}
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
