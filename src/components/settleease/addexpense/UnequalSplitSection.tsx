
"use client";

import React, { useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Wallet, AlertCircle, Sparkles, Eraser } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Person } from '@/lib/settleease/types';

interface UnequalSplitSectionProps {
  people: Person[];
  unequalShares: Record<string, string>;
  handleUnequalShareChange: (personId: string, value: string) => void;
  amountToSplit?: number;
}

export default function UnequalSplitSection({ people, unequalShares, handleUnequalShareChange, amountToSplit }: UnequalSplitSectionProps) {
  const totalEntered = useMemo(() => {
    return Object.values(unequalShares).reduce((sum, val) => {
      const num = parseFloat(val) || 0;
      return sum + num;
    }, 0);
  }, [unequalShares]);
  
  const remaining = amountToSplit ? amountToSplit - totalEntered : 0;
  const isBalanced = amountToSplit ? Math.abs(remaining) < 0.01 : false;
  
  const handleClearAll = () => {
    people.forEach(person => {
      handleUnequalShareChange(person.id, '');
    });
  };
  
  const handleDistributeRemaining = () => {
    if (remaining <= 0) return;
    
    // Find people with no amount entered
    const emptyPeople = people.filter(p => !unequalShares[p.id] || parseFloat(unequalShares[p.id]) === 0);
    
    if (emptyPeople.length > 0) {
      const perPerson = (remaining / emptyPeople.length).toFixed(2);
      emptyPeople.forEach(person => {
        handleUnequalShareChange(person.id, perPerson);
      });
    }
  };
  
  return (
    <Card className="p-5 bg-card/50 shadow-sm mt-3">
      <div className="mb-4 space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Enter custom amounts for each person
        </Label>
        <div className="flex gap-2 flex-wrap">
          {remaining > 0.01 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDistributeRemaining}
              className="text-xs h-8"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Distribute Remaining
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-8"
          >
            <Eraser className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
      </div>
      
      {people.length > 0 ? (
        <div className="space-y-3">
          {people.map(person => {
            const hasValue = unequalShares[person.id] && parseFloat(unequalShares[person.id]) > 0;
            return (
              <div 
                key={person.id} 
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  hasValue ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'
                }`}
              >
                <Label 
                  htmlFor={`unequal-${person.id}`} 
                  className="text-sm font-medium flex-1 min-w-0"
                >
                  {person.name}
                </Label>
                <Input
                  id={`unequal-${person.id}`}
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={unequalShares[person.id] || ''}
                  onChange={e => handleUnequalShareChange(person.id, e.target.value)}
                  placeholder="0.00"
                  className="w-32 h-10 text-right font-mono"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No people available for unequal split.</p>
      )}
      
      {amountToSplit !== undefined && amountToSplit > 0 && (
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total to split:</span>
            <span className="font-semibold">{formatCurrency(amountToSplit)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Amount entered:</span>
            <span className="font-semibold">{formatCurrency(totalEntered)}</span>
          </div>
          <div className={`flex justify-between items-center text-sm font-semibold ${
            isBalanced ? 'text-green-600 dark:text-green-400' : remaining > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
          }`}>
            <span className="flex items-center gap-1">
              {!isBalanced && <AlertCircle className="h-4 w-4" />}
              Remaining:
            </span>
            <span>{formatCurrency(Math.abs(remaining))}</span>
          </div>
          {isBalanced && (
            <p className="text-xs text-green-600 dark:text-green-400 text-center pt-1">
              ✓ Amounts are balanced
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
