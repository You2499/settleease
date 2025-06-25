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
import * as LucideIconsImport from 'lucide-react';

const LucideIcons = LucideIconsImport as Record<string, React.FC<React.SVGProps<SVGSVGElement>>>;

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
    <Card className="p-3 sm:p-4 bg-card/50 shadow-sm mt-2 space-y-3 sm:space-y-4">
        {items.map((item, itemIndex) => (
        <Card key={item.id} className="p-3 sm:p-4 bg-background shadow-md rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-3 mb-2 sm:mb-3 items-center">
                <Input 
                    value={item.name} 
                    onChange={e => handleItemChange(itemIndex, 'name', e.target.value)} 
                    placeholder={`Item ${itemIndex + 1} Name`} 
                    className="h-9 sm:h-10 text-sm"
                />
                <Input 
                    type="number" 
                    value={item.price as string} 
                    onChange={e => handleItemChange(itemIndex, 'price', e.target.value)} 
                    placeholder="Price" 
                    className="w-full md:w-24 h-9 sm:h-10 text-sm"
                />
                <Select
                  value={item.categoryName || ''}
                  onValueChange={(value) => handleItemChange(itemIndex, 'categoryName', value)}
                  disabled={dynamicCategories.length === 0}
                >
                  <SelectTrigger className="h-9 sm:h-10 w-full md:w-36 sm:w-40 text-xs sm:text-sm">
                    <SelectValue placeholder="Item Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicCategories.map(cat => {
                      const IconComponent = LucideIcons[cat.icon_name] || LucideIcons['Settings2'];
                      return (
                        <SelectItem key={cat.id} value={cat.name}>
                          <div className="flex items-center">
                            <IconComponent className="mr-2 h-4 w-4" />
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
                    className="text-destructive h-9 w-9 sm:h-10 sm:w-10 md:w-auto justify-self-end md:justify-self-auto"
                    disabled={items.length <=1}
                    aria-label={`Remove item ${itemIndex + 1}`}
                >
                    <MinusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
            </div>
            
            <Label className="text-xs sm:text-sm font-medium block mb-1.5 sm:mb-2 text-muted-foreground">Shared by:</Label>
            {people.length > 0 ? (
              <ScrollArea className="h-28 sm:h-32 rounded-md border p-1 bg-card/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 p-1.5 sm:p-2">
                    {people.map(person => (
                    <div key={person.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`item-${itemIndex}-person-${person.id}`