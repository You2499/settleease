
"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Card } from "@/components/ui/card";
import type { Person } from '@/lib/settleease/types';

interface UnequalSplitSectionProps {
  people: Person[];
  unequalShares: Record<string, string>;
  handleUnequalShareChange: (personId: string, value: string) => void;
}

export default function UnequalSplitSection({ people, unequalShares, handleUnequalShareChange }: UnequalSplitSectionProps) {
  return (
    <Card className="p-4 bg-card/50 shadow-sm mt-2 space-y-2.5">
      {people.length > 0 ? people.map(person => (
        <div key={person.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <Label htmlFor={`unequal-${person.id}`} className="text-sm">{person.name}</Label>
          <Input
            id={`unequal-${person.id}`}
            type="number"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            value={unequalShares[person.id] || ''}
            onChange={e => handleUnequalShareChange(person.id, e.target.value)}
            placeholder="Amount"
            className="w-28"
          />
        </div>
      )) : <p className="text-xs text-muted-foreground">No people available for unequal split.</p>}
    </Card>
  );
}
