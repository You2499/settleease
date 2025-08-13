"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, PartyPopper } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { PayerShare, CelebrationContribution } from "@/lib/settleease/types";

interface ExpensePaymentInfoProps {
  sortedPaidBy: PayerShare[];
  celebrationContributionOpt: CelebrationContribution | null | undefined;
  amountEffectivelySplit: number;
  peopleMap: Record<string, string>;
}

export default function ExpensePaymentInfo({
  sortedPaidBy,
  celebrationContributionOpt,
  amountEffectivelySplit,
  peopleMap,
}: ExpensePaymentInfoProps) {
  return (
    <Card>
      <CardHeader className="pt-3 sm:pt-4 pb-2">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          Payment & Contribution
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">
        <div>
          <span className="font-medium text-muted-foreground block mb-1">
            Paid By:
          </span>
          {sortedPaidBy.length > 0 ? (
            <ul className="list-disc list-inside pl-4 space-y-0.5">
              {sortedPaidBy.map((p: PayerShare) => (
                <li key={p.personId} className="flex justify-between">
                  <span>{peopleMap[p.personId] || "Unknown"}</span>
                  <span className="font-medium">
                    {formatCurrency(Number(p.amount))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pl-4 text-muted-foreground italic">
              No payers listed.
            </p>
          )}
        </div>
        {celebrationContributionOpt && (
          <>
            <Separator className="my-2 sm:my-2.5" />
            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
              <PartyPopper className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Celebration Contribution:</span>
            </div>
            <div className="pl-4 space-y-0.5">
              <div className="flex justify-between">
                <span>Contributed by:</span>
                <span className="font-medium text-right">
                  {peopleMap[celebrationContributionOpt.personId] || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-bold text-primary text-right">
                  {formatCurrency(celebrationContributionOpt.amount)}
                </span>
              </div>
            </div>
          </>
        )}
        <Separator className="my-2 sm:my-2.5" />
        <div className="flex justify-between font-semibold">
          <span>Net Amount For Splitting:</span>
          <span className="text-right min-w-[80px]">
            {formatCurrency(amountEffectivelySplit)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}