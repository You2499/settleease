"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Card } from "@/components/ui/card";
import type { Person } from '@/lib/settleease/types';
import { formatCurrency } from '@/lib/settleease/utils';

interface UnequalSplitSectionProps {
  people: Person[];
  shares: Record<string, string>;
  onShareChange: (personId: string, value: string) => void;
  amountToSplit: number;
}

export default function UnequalSplitSection({ people, shares, onShareChange, amountToSplit }: UnequalSplitSectionProps) {
    const totalAssigned = Object.values(shares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const remaining = amountToSplit - totalAssigned;

    return (
        <div className="space-y-3">
            <div className="text-right">
                <p className={`text-sm font-medium ${remaining < -0.001 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {formatCurrency(remaining)} remaining
                </p>
            </div>
            <div className="space-y-2 rounded-md border p-2">
                {people.map(person => (
                    <div key={person.id} className="grid grid-cols-[1fr_auto] gap-3 items-center rounded-md p-2 hover:bg-muted">
                        <Label htmlFor={`unequal-${person.id}`} className="font-normal">{person.name}</Label>
                        <Input
                            id={`unequal-${person.id}`}
                            type="number"
                            value={shares[person.id] || ''}
                            onChange={e => onShareChange(person.id, e.target.value)}
                            placeholder="0.00"
                            className="w-32"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
