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
  dynamicCategories: DynamicCategory[];
  handleItemChange: <K extends keyof ExpenseItemDetail>(index: number, field: K, value: ExpenseItemDetail[K]) => void;
  handleItemSharedByChange: (itemIndex: number, personId: string) => void;
  removeItem: (index: number) => void;
  addItem: () => void;
}

export default function ItemwiseSplitSection({
  items,
  people,
  dynamicCategories,
  handleItemChange,
  handleItemSharedByChange,
  removeItem,
  addItem,
}: ItemwiseSplitSectionProps) {
  return (
    <Card className="p-5 sm:p-7 bg-card/50 shadow-sm mt-3 space-y-6 sm:space-y-8">
        {items.map((item, itemIndex) => (
        <Card key={item.id} className="p-5 sm:p-6 bg-background shadow-md rounded-2xl mb-2">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_auto] gap-4 sm:gap-6 mb-4 items-center">
                <Input 
                    value={item.name} 
                    onChange={e => handleItemChange(itemIndex, 'name', e.target.value)} 
                    placeholder={`Item ${itemIndex + 1} Name`} 
                    className="h-11 text-base px-4"
                />
                <Input 
                    type="number" 
                    value={item.price as string} 
                    onChange={e => handleItemChange(itemIndex, 'price', e.target.value)} 
                    placeholder="Price" 
                    className="w-full md:w-32 h-11 text-base px-4"
                />
                <Select
                  value={item.categoryName || ''}
                  onValueChange={(value) => handleItemChange(itemIndex, 'categoryName', value)}
                  disabled={dynamicCategories.length === 0}
                >
                  <SelectTrigger className="h-11 w-full md:w-48 sm:w-56 text-base">
                    <SelectValue placeholder="Item Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(cat => {
                      const iconInfo = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === cat.icon_name);
                      const IconComponent = iconInfo ? iconInfo.IconComponent : Settings2;
                      return (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center">
                            <IconComponent className="mr-2 h-5 w-5" />
                            {cat.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(itemIndex)} 
                    className="text-destructive h-11 w-11 md:w-auto justify-self-end md:justify-self-auto"
                    disabled={items.length <=1}
                    aria-label={`Remove item ${itemIndex + 1}`}
                >
                    <MinusCircle className="h-5 w-5" />
                </Button>
            </div>
            
            <Label className="text-base font-semibold block mb-2 text-muted-foreground">Shared by:</Label>
            {people.length > 0 ? (
              <ScrollArea className="h-36 sm:h-44 rounded-md border p-2 bg-card/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-2">
                    {people.map(person => (
                    <div key={person.id} className="flex items-center space-x-3">
                        <Checkbox
                            id={`item-${itemIndex}-person-${person.id}`}
                            checked={item.sharedBy.includes(person.id)}
                            onCheckedChange={() => handleItemSharedByChange(itemIndex, person.id)}
                            className="h-5 w-5"
                        />
                        <Label 
                            htmlFor={`item-${itemIndex}-person-${person.id}`} 
                            className="text-base font-medium cursor-pointer hover:text-foreground transition-colors select-none"
                        >
                            {person.name}
                        </Label>
                    </div>
                    ))}
                </div>
              </ScrollArea>
            ) : <p className="text-sm text-muted-foreground">No people available to share items.</p>}
        </Card>
        ))}
        <Button variant="outline" size="lg" onClick={addItem} className="w-full sm:w-auto mt-6 py-3 px-6 text-base rounded-xl">
            <PlusCircle className="mr-3 h-5 w-5" /> Add Item
        </Button>
    </Card>
  );
}
