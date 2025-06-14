
"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency } from '@/lib/settleease/utils';
import type { Person } from '@/lib/settleease/types';

interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

interface SettlementSummaryProps {
  settlement: SettlementTransaction[];
  peopleMap: Record<string, string>;
  simplifySettlement: boolean;
  setSimplifySettlement: (simplify: boolean) => void;
  settlementCardDescription: string;
}

export default function SettlementSummary({
  settlement,
  peopleMap,
  simplifySettlement,
  setSimplifySettlement,
  settlementCardDescription,
}: SettlementSummaryProps) {
  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center text-xl">
            <ArrowRight className="mr-2 h-5 w-5 text-primary" /> Settlement Summary
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            {settlementCardDescription}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2 pt-1 sm:pt-0">
          <Switch
            id="simplify-settlement-toggle"
            checked={simplifySettlement}
            onCheckedChange={setSimplifySettlement}
            aria-label="Toggle settlement simplification"
          />
          <Label htmlFor="simplify-settlement-toggle" className="text-sm font-medium">
            Simplify
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        {settlement.length > 0 ? (
          <ul className="space-y-1.5">
            {settlement.map((txn, i) => (
              <li key={`${txn.from}-${txn.to}-${i}`} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-md text-sm">
                <span className="font-medium text-foreground">{peopleMap[txn.from] || 'Unknown'}</span>
                <ArrowRight className="h-4 w-4 text-accent mx-2 shrink-0" />
                <span className="font-medium text-foreground">{peopleMap[txn.to] || 'Unknown'}</span>
                <span className="ml-auto font-semibold text-primary pl-2">{formatCurrency(txn.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (<p className="text-sm text-muted-foreground p-2">All debts are settled, or no expenses to settle yet!</p>)}
      </CardContent>
    </Card>
  );
}
