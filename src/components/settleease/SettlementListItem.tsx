import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/settleease/utils';
import type { SettlementPayment } from '@/lib/settleease/types';
import { HandCoins, ArrowRight } from 'lucide-react';

interface SettlementListItemProps {
  settlement: SettlementPayment;
  peopleMap: Record<string, string>;
}

export default function SettlementListItem({
  settlement,
  peopleMap,
}: SettlementListItemProps) {
  const debtorName = peopleMap[settlement.debtor_id] || 'Unknown';
  const creditorName = peopleMap[settlement.creditor_id] || 'Unknown';
  
  // Determine if this is a custom settlement or auto settlement
  const isCustom = !!settlement.notes;

  return (
    <li className="cursor-default">
      <Card className="bg-card/70 transition-all rounded-md border-l-4 border-green-500">
        <CardHeader className="pb-1.5 pt-2.5 px-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <HandCoins className="h-4 w-4 text-green-600" />
              <span className="flex items-center gap-1">
                <span>{debtorName}</span>
                <ArrowRight className="h-4 w-4 text-green-600" />
                <span>{creditorName}</span>
              </span>
            </CardTitle>
            <span className="text-sm sm:text-md font-bold text-green-600 mt-1 sm:mt-0">
              {formatCurrency(Number(settlement.amount_settled))}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              {isCustom ? 'Custom Payment' : 'Settlement'}
            </span>
            {settlement.notes && (
              <span className="italic text-muted-foreground">
                {settlement.notes}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
