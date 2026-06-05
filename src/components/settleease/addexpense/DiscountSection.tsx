"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag, Info } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import SettleEaseErrorBoundary from "../../ui/SettleEaseErrorBoundary";

interface DiscountSectionProps {
  isDiscountMode: boolean;
  setIsDiscountMode: (value: boolean) => void;
  discountAmountInput: string;
  setDiscountAmountInput: (value: string) => void;
  actualDiscountAmount: number;
  totalAmount: string;
  amountToSplit: number;
}

const DiscountAmountInputComponent = ({
  discountAmountInput,
  setDiscountAmountInput,
  totalAmount,
}: {
  discountAmountInput: string;
  setDiscountAmountInput: (value: string) => void;
  totalAmount: string;
}) => {
  const total = parseFloat(totalAmount) || 0;

  const handlePercentageClick = (percentage: number) => {
    if (total > 0) {
      const amount = ((total * percentage) / 100).toFixed(2);
      setDiscountAmountInput(amount);
    }
  };

  return (
    <div>
      <Label htmlFor="discountAmount" className="text-sm font-medium mb-2 block">
        Discount Amount
      </Label>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => handlePercentageClick(10)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors hover:bg-muted"
        >
          10%
        </button>
        <button
          type="button"
          onClick={() => handlePercentageClick(20)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors hover:bg-muted"
        >
          20%
        </button>
        <button
          type="button"
          onClick={() => handlePercentageClick(25)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors hover:bg-muted"
        >
          25%
        </button>
        <button
          type="button"
          onClick={() => handlePercentageClick(50)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors hover:bg-muted"
        >
          50%
        </button>
        <button
          type="button"
          onClick={() => setDiscountAmountInput("")}
          className="flex-1 px-3 py-2 text-sm border border-border rounded bg-background transition-colors hover:bg-muted"
        >
          Other
        </button>
      </div>
      <Input
        id="discountAmount"
        type="number"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={discountAmountInput}
        onChange={(e) => setDiscountAmountInput(e.target.value)}
        placeholder="e.g., 15.00"
        className="h-10 text-right font-mono"
      />
    </div>
  );
};

export default function DiscountSection({
  isDiscountMode,
  setIsDiscountMode,
  discountAmountInput,
  setDiscountAmountInput,
  actualDiscountAmount,
  totalAmount,
  amountToSplit,
}: DiscountSectionProps) {
  return (
    <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
      <div className="flex items-center space-x-2 mb-3 sm:mb-4">
        <Checkbox
          id="discountMode"
          checked={isDiscountMode}
          onCheckedChange={(checked) => setIsDiscountMode(!!checked)}
        />
        <Label
          htmlFor="discountMode"
          className="text-sm sm:text-base font-medium cursor-pointer flex items-center"
        >
          <Tag className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
          This bill has a discount
        </Label>
      </div>
      {isDiscountMode && (
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-start space-x-2 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                This allows applying a discount or promo to the total bill, reducing the amount to split.
              </p>
            </div>
            <div className="space-y-4">
              <SettleEaseErrorBoundary componentName="Discount Amount Input" size="small">
                <DiscountAmountInputComponent
                  discountAmountInput={discountAmountInput}
                  setDiscountAmountInput={setDiscountAmountInput}
                  totalAmount={totalAmount}
                />
              </SettleEaseErrorBoundary>
            </div>
            {actualDiscountAmount > 0 && (
              <div className="text-xs sm:text-sm space-y-1 bg-emerald-100 dark:bg-emerald-900/30 p-2 sm:p-3 rounded">
                <p>
                  Discount applied:{" "}
                  <strong className="text-emerald-700 dark:text-emerald-300">
                    -{formatCurrency(actualDiscountAmount)}
                  </strong>
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
