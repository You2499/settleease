"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { Card } from "@/components/ui/card";
import { Trash2, PlusCircle } from 'lucide-react';
import type { Person, PayerInputRow } from '@/lib/settleease/types';

interface PayerInputSectionProps {
  isMultiplePayers: boolean;
  onToggleMultiplePayers: () => void;
  payers: PayerInputRow[];
  people: Person[];
  totalAmount: string;
  onPayerChange: (index: number, field: keyof PayerInputRow, value: string) => void;
  onAddPayer: () => void;
  onRemovePayer: (index: number) => void;
}

export default function PayerInputSection({
  isMultiplePayers,
  onToggleMultiplePayers,
  payers,
  people,
  onPayerChange,
  onAddPayer,
  onRemovePayer,
}: PayerInputSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="multiple-payers" checked={isMultiplePayers} onCheckedChange={onToggleMultiplePayers} />
        <Label htmlFor="multiple-payers" className="text-sm font-medium">This bill was paid by multiple people</Label>
      </div>

      {isMultiplePayers ? (
        <div className="space-y-2.5 pl-6">
          {payers.map((payer, index) => (
            <div key={payer.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
              <Select value={payer.personId} onValueChange={val => onPayerChange(index, 'personId', val)} disabled={people.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
                <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" value={payer.amount} onChange={e => onPayerChange(index, 'amount', e.target.value)} placeholder="Amount paid" className="w-full sm:w-32" />
              <Button variant="ghost" size="icon" onClick={() => onRemovePayer(index)} className="text-muted-foreground hover:text-destructive" disabled={payers.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAddPayer} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" />Add Payer
          </Button>
        </div>
      ) : (
        <div className="pl-6">
            <Select value={payers[0]?.personId || ''} onValueChange={val => onPayerChange(0, 'personId', val)} disabled={people.length === 0}>
              <SelectTrigger><SelectValue placeholder="Select who paid" /></SelectTrigger>
              <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      )}
    </div>
  );
}
