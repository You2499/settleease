"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MinusCircle, Settings2 } from 'lucide-react';
import type { Person, ExpenseItemDetail, Category as DynamicCategory } from '@/lib/settleease/types';
import { AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';


interface ItemwiseSplitSectionProps {
  items: ExpenseItemDetail[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: DynamicCategory[];
  defaultCategory: string;
  onItemChange: <K extends keyof ExpenseItemDetail>(index: number, field: K, value: ExpenseItemDetail[K]) => void;
  onSharedByChange: (itemIndex: number, personId: string) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
}

export default function ItemwiseSplitSection({
  items,
  people,
  onItemChange,
  onSharedByChange,
  onRemoveItem,
  onAddItem,
  dynamicCategories,
  defaultCategory,
}: ItemwiseSplitSectionProps) {
    return (
        <div className="space-y-3">
            {items.map((item, itemIndex) => (
                <div key={item.id} className="space-y-3 rounded-md border p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <Input
                            value={item.name}
                            onChange={e => onItemChange(itemIndex, 'name', e.target.value)}
                            placeholder={`Item #${itemIndex + 1}`}
                        />
                        <Input
                            type="number"
                            value={item.price as string}
                            onChange={e => onItemChange(itemIndex, 'price', e.target.value)}
                            placeholder="Price"
                            className="w-full sm:w-28"
                        />
                         <Select
                            value={item.categoryName || defaultCategory}
                            onValueChange={(value) => onItemChange(itemIndex, 'categoryName', value)}
                         >
                            <SelectTrigger className="w-full sm:w-36">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {dynamicCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="relative">
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(itemIndex)} className="absolute -top-11 right-0 text-muted-foreground hover:text-destructive" disabled={items.length <= 1}>
                            <MinusCircle className="h-4 w-4" />
                        </Button>
                        <Label className="text-xs text-muted-foreground">Shared By</Label>
                        <ScrollArea className="h-24 rounded-md border mt-1">
                            <div className="p-2 grid grid-cols-2 gap-1">
                                {people.map(person => (
                                    <div key={person.id} className="flex items-center space-x-2 p-1 rounded-md hover:bg-muted">
                                        <Checkbox
                                            id={`item-${itemIndex}-person-${person.id}`}
                                            checked={item.sharedBy.includes(person.id)}
                                            onCheckedChange={() => onSharedByChange(itemIndex, person.id)}
                                        />
                                        <Label htmlFor={`item-${itemIndex}-person-${person.id}`} className="font-normal text-sm cursor-pointer">{person.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={onAddItem} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>
    );
}
