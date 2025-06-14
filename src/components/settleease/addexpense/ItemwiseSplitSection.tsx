
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
    <Card className="p-4 bg-card/50 shadow-sm mt-2 space-y-4">
        {items.map((item, itemIndex) => (
        <Card key={item.id} className="p-4 bg-background shadow-md rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-3">
                <Input 
                    value={item.name} 
                    onChange={e => handleItemChange(itemIndex, 'name', e.target.value)} 
                    placeholder={`Item ${itemIndex + 1} Name`} 
                    className="flex-grow h-10"
                />
                <Input 
                    type="number" 
                    value={item.price as string} 
                    onChange={e => handleItemChange(itemIndex, 'price', e.target.value)} 
                    placeholder="Price" 
                    className="w-32 h-10"
                />
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(itemIndex)} 
                    className="text-destructive h-10 w-10" 
                    disabled={items.length <=1}
                    aria-label={`Remove item ${itemIndex + 1}`}
                >
                    <MinusCircle className="h-5 w-5" />
                </Button>
            </div>
            
            <Label className="text-sm font-medium block mb-2 text-muted-foreground">Shared by:</Label>
            {people.length > 0 ? (
              <ScrollArea className="h-32 rounded-md border p-1 bg-card/30">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-2">
                    {people.map(person => (
                    <div key={person.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`item-${itemIndex}-person-${person.id}`}
                            checked={item.sharedBy.includes(person.id)}
                            onCheckedChange={() => handleItemSharedByChange(itemIndex, person.id)}
                            className="h-4 w-4"
                        />
                        <Label 
                            htmlFor={`item-${itemIndex}-person-${person.id}`} 
                            className="text-sm font-normal cursor-pointer hover:text-foreground transition-colors"
                        >
                            {person.name}
                        </Label>
                    </div>
                    ))}
                </div>
              </ScrollArea>
            ) : <p className="text-xs text-muted-foreground">No people available to share items.</p>}
        </Card>
        ))}
        <Button variant="outline" size="default" onClick={addItem} className="w-full sm:w-auto mt-3 py-2 px-4">
            <PlusCircle className="mr-2 h-5 w-5" /> Add Item
        </Button>
    </Card>
  );
}
