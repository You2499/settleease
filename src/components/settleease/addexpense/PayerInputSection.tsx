
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
  defaultPayerId: string;
  handlePayerChange: (index: number, field: keyof PayerInputRow, value: string) => void;
  addPayer: () => void;
  removePayer: (index: number) => void;
  expenseToEdit?: any; // Simplified for brevity, can be typed more strictly
}

export default function PayerInputSection({
  isMultiplePayers,
  onToggleMultiplePayers,
  payers,
  people,
  defaultPayerId,
  handlePayerChange,
  addPayer,
  removePayer,
  expenseToEdit,
}: PayerInputSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-medium">Paid By</Label>
        <div className="flex items-center space-x-2">
          <Label htmlFor="multiplePayersSwitch" className="text-sm text-muted-foreground">Multiple Payers?</Label>
          <Checkbox id="multiplePayersSwitch" checked={isMultiplePayers} onCheckedChange={onToggleMultiplePayers} />
        </div>
      </div>
      {isMultiplePayers ? (
        <div className="space-y-2.5">
          {payers.map((payer, index) => (
            <Card key={payer.id} className="p-3 bg-card/50 shadow-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <Select value={payer.personId} onValueChange={val => handlePayerChange(index, 'personId', val)} disabled={people.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                  <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={payer.amount} onChange={e => handlePayerChange(index, 'amount', e.target.value)} placeholder="Amount" className="w-28" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removePayer(index)} 
                  className="text-destructive h-8 w-8"
                  disabled={payers.length <= 1 && (!expenseToEdit || (expenseToEdit && payers.length === 1 && payers[0].personId === expenseToEdit.paid_by[0]?.personId))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          <Button variant="outline" size="sm" onClick={addPayer} className="text-xs" disabled={people.length === 0}><PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Another Payer</Button>
        </div>
      ) : (
        <Select value={payers[0]?.personId || ''} onValueChange={val => handlePayerChange(0, 'personId', val)} disabled={people.length === 0}>
          <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
          <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}
