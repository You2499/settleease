"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PartyPopper, Info } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Person } from "@/lib/settleease/types";
import SettleEaseErrorBoundary from "../../ui/SettleEaseErrorBoundary";
import { crashTestManager } from "@/lib/settleease/crashTestContext";

interface CelebrationSectionProps {
  isCelebrationMode: boolean;
  setIsCelebrationMode: (value: boolean) => void;
  celebrationPayerId: string;
  setCelebrationPayerId: (value: string) => void;
  celebrationAmountInput: string;
  setCelebrationAmountInput: (value: string) => void;
  actualCelebrationAmount: number;
  totalAmount: string;
  amountToSplit: number;
  people: Person[];
  peopleMap: Record<string, string>;
}

// Individual component wrappers with crash test logic
const CelebrationPayerSelectComponent = ({ celebrationPayerId, setCelebrationPayerId, people }: {
  celebrationPayerId: string;
  setCelebrationPayerId: (value: string) => void;
  people: Person[];
}) => {
  crashTestManager.checkAndCrash('celebrationPayerSelect', 'Celebration Payer Select crashed: Person lookup failed with invalid person ID');
  
  return (
    <div>
      <Label htmlFor="celebrationPayer" className="text-sm font-medium mb-2 block">
        Who is treating?
      </Label>
      <Select value={celebrationPayerId} onValueChange={setCelebrationPayerId}>
        <SelectTrigger id="celebrationPayer" className="text-sm h-10">
          <SelectValue placeholder="Select person" />
        </SelectTrigger>
        <SelectContent>
          {people.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const CelebrationAmountInputComponent = ({ celebrationAmountInput, setCelebrationAmountInput, totalAmount }: {
  celebrationAmountInput: string;
  setCelebrationAmountInput: (value: string) => void;
  totalAmount: string;
}) => {
  crashTestManager.checkAndCrash('celebrationAmountInput', 'Celebration Amount Input crashed: Invalid celebration amount format');
  
  const total = parseFloat(totalAmount) || 0;
  
  const handlePercentageClick = (percentage: number) => {
    if (total > 0) {
      const amount = (total * percentage / 100).toFixed(2);
      setCelebrationAmountInput(amount);
    }
  };
  
  return (
    <div>
      <Label htmlFor="celebrationAmount" className="text-sm font-medium mb-2 block">
        Contribution Amount
      </Label>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => handlePercentageClick(25)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors"
        >
          25%
        </button>
        <button
          type="button"
          onClick={() => handlePercentageClick(50)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors"
        >
          50%
        </button>
        <button
          type="button"
          onClick={() => setCelebrationAmountInput('')}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors"
        >
          Other
        </button>
      </div>
      <Input
        id="celebrationAmount"
        type="number"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={celebrationAmountInput}
        onChange={(e) => setCelebrationAmountInput(e.target.value)}
        placeholder="e.g., 20.00"
        className="h-10"
      />
    </div>
  );
};

export default function CelebrationSection({
  isCelebrationMode,
  setIsCelebrationMode,
  celebrationPayerId,
  setCelebrationPayerId,
  celebrationAmountInput,
  setCelebrationAmountInput,
  actualCelebrationAmount,
  totalAmount,
  amountToSplit,
  people,
  peopleMap,
}: CelebrationSectionProps) {
  // Check for section-level crash
  crashTestManager.checkAndCrash('celebrationSection', 'Celebration Section crashed: Celebration mode validation failed');
  return (
    <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
      <div className="flex items-center space-x-2 mb-3 sm:mb-4">
        <Checkbox
          id="celebrationMode"
          checked={isCelebrationMode}
          onCheckedChange={(checked) => setIsCelebrationMode(!!checked)}
        />
        <Label
          htmlFor="celebrationMode"
          className="text-sm sm:text-base font-medium cursor-pointer flex items-center"
        >
          <PartyPopper className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
          Someone is treating (celebration contribution)
        </Label>
      </div>
      {isCelebrationMode && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-start space-x-2 text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                This allows someone to contribute extra as a treat (e.g., covering part of the bill as a
                gift). The remaining amount will be split among the group.
              </p>
            </div>
            <div className="space-y-4">
              <SettleEaseErrorBoundary componentName="Celebration Payer Select" size="small">
                <CelebrationPayerSelectComponent 
                  celebrationPayerId={celebrationPayerId}
                  setCelebrationPayerId={setCelebrationPayerId}
                  people={people}
                />
              </SettleEaseErrorBoundary>
              
              <SettleEaseErrorBoundary componentName="Celebration Amount Input" size="small">
                <CelebrationAmountInputComponent 
                  celebrationAmountInput={celebrationAmountInput}
                  setCelebrationAmountInput={setCelebrationAmountInput}
                  totalAmount={totalAmount}
                />
              </SettleEaseErrorBoundary>
            </div>
            {actualCelebrationAmount > 0 && (
              <div className="text-xs sm:text-sm space-y-1 bg-yellow-100 dark:bg-yellow-900/30 p-2 sm:p-3 rounded">
                <p>
                  <strong>{peopleMap[celebrationPayerId] || "Unknown"}</strong> is contributing{" "}
                  <strong className="text-yellow-700 dark:text-yellow-300">
                    {formatCurrency(actualCelebrationAmount)}
                  </strong>{" "}
                  as a treat.
                </p>
                <p>
                  Remaining amount to split:{" "}
                  <strong className="text-primary">{formatCurrency(amountToSplit)}</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}