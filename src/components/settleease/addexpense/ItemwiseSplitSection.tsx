
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from "@/components/ui/card";
import { PlusCircle, MinusCircle } from 'lucide-react';
import type { Person, ExpenseItemDetail } from '@/lib/settleease/types';

interface ItemwiseSplitSectionProps {
  items: ExpenseItemDetail[];
  people: Person[];
  handleItemChange: <K extends keyof ExpenseItemDetail>(index: number, field: K, value: ExpenseItemDetail[K]) => void;
  handleItemSharedByChange: (itemIndex: number, personId: string) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
}

export default function ItemwiseSplitSection({
  items,
  people,
  handleItemChange,
  handleItemSharedByChange,
  removeItem,
  addItem,
}: ItemwiseSplitSectionProps) {
  return (
    <Card className="p-4 bg-card/50 shadow-sm mt-2 space-y-3">
        {items.map((item, itemIndex) => (
        <Card key={item.id} className="p-3 bg-background shadow-inner">
            <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-grow space-y-1.5">
                <Input value={item.name} onChange={e => handleItemChange(itemIndex, 'name', e.target.value)} placeholder={`Item ${itemIndex + 1} Name`} className="h-8 text-sm"/>
                <Input type="number" value={item.price as string} onChange={e => handleItemChange(itemIndex, 'price', e.target.value)} placeholder="Price" className="h-8 text-sm w-24"/>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeItem(itemIndex)} className="text-destructive h-7 w-7 shrink-0" disabled={items.length <=1}>
                <MinusCircle className="h-4 w-4" />
            </Button>
            </div>
            <Label className="text-xs block mb-1 text-muted-foreground">Shared by:</Label>
            {people.length > 0 ? (
              <ScrollArea className="max-h-28">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 pr-1">
                  {people.map(person => (
                  <div key={person.id} className="flex items-center space-x-1.5">
                      <Checkbox
                      id={`item-${itemIndex}-person-${person.id}`}
                      checked={item.sharedBy.includes(person.id)}
                      onCheckedChange={() => handleItemSharedByChange(itemIndex, person.id)}
                      className="h-3.5 w-3.5"
                      />
                      <Label htmlFor={`item-${itemIndex}-person-${person.id}`} className="text-xs font-normal cursor-pointer">{person.name}</Label>
                  </div>
                  ))}
              </div>
              </ScrollArea>
            ) : <p className="text-xs text-muted-foreground">No people available to share items.</p>}
        </Card>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="text-xs mt-2"><PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Item</Button>
    </Card>
  );
}
