"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Trash2, Settings2, ShoppingCart, UserCheck, UserX } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import * as LucideIcons from 'lucide-react';
import type { Person, ExpenseItemDetail, Category as DynamicCategory } from '@/lib/settleease/types';

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
  const totalItemsPrice = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price as string) || 0;
      return sum + price;
    }, 0);
  }, [items]);
  
  const handleSelectAllForItem = (itemIndex: number) => {
    people.forEach(person => {
      if (!items[itemIndex].sharedBy.includes(person.id)) {
        handleItemSharedByChange(itemIndex, person.id);
      }
    });
  };
  
  const handleDeselectAllForItem = (itemIndex: number) => {
    items[itemIndex].sharedBy.forEach(personId => {
      handleItemSharedByChange(itemIndex, personId);
    });
  };
  
  return (
    <Card className="p-5 bg-card/50 shadow-sm mt-3">
      <div className="mb-5 space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          Add items and select who shared each
        </Label>
        {totalItemsPrice > 0 && (
          <div className="text-sm font-semibold text-muted-foreground">
            Total: <span className="text-foreground">{formatCurrency(totalItemsPrice)}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-4">
        {items.map((item, itemIndex) => {
          const allSelected = people.length > 0 && item.sharedBy.length === people.length;
          const noneSelected = item.sharedBy.length === 0;
          const itemPrice = parseFloat(item.price as string) || 0;
          
          return (
            <Card key={item.id} className="p-4 bg-background border-2 border-border transition-all">
              {/* Item Header */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-3">
                    {/* Item Name - Full Width */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Item Name</Label>
                      <Input 
                        value={item.name} 
                        onChange={e => handleItemChange(itemIndex, 'name', e.target.value)} 
                        placeholder={`e.g., Pizza, Drinks, etc.`} 
                        className="h-10 w-full"
                      />
                    </div>
                    
                    {/* Price - Full Width */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Price</Label>
                      <Input 
                        type="number" 
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        value={item.price as string} 
                        onChange={e => handleItemChange(itemIndex, 'price', e.target.value)} 
                        placeholder="0.00" 
                        className="h-10 w-full text-right font-mono"
                      />
                    </div>
                    
                    {/* Category - Full Width */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                      <Select
                        value={item.categoryName || ''}
                        onValueChange={(value) => handleItemChange(itemIndex, 'categoryName', value)}
                        disabled={dynamicCategories.length === 0}
                      >
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {dynamicCategories.map(cat => {
                            const IconComponent = (LucideIcons as any)[cat.icon_name] || Settings2;
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
                    </div>
                  </div>
                  
                  {/* Delete Button - Top Right */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(itemIndex)} 
                    className="text-destructive h-10 w-10 shrink-0"
                    disabled={items.length <= 1}
                    aria-label={`Remove item ${itemIndex + 1}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              
              {/* Shared By Section */}
              <div className="pt-3 border-t">
                <div className="mb-3 space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Shared by
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAllForItem(itemIndex)}
                      disabled={allSelected}
                      className="text-xs h-8"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeselectAllForItem(itemIndex)}
                      disabled={noneSelected}
                      className="text-xs h-8"
                    >
                      <UserX className="h-3 w-3 mr-1" />
                      None
                    </Button>
                  </div>
                </div>
                
                {people.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {people.map(person => {
                      const isSharing = item.sharedBy.includes(person.id);
                      return (
                        <div 
                          key={person.id} 
                          className={`flex items-center space-x-2 p-2 rounded-md border transition-all cursor-pointer ${
                            isSharing 
                              ? 'bg-primary/5 border-primary/30' 
                              : 'bg-card/50 border-border'
                          }`}
                          onClick={() => handleItemSharedByChange(itemIndex, person.id)}
                        >
                          <Checkbox
                            id={`item-${itemIndex}-person-${person.id}`}
                            checked={isSharing}
                            onCheckedChange={() => handleItemSharedByChange(itemIndex, person.id)}
                            className="h-4 w-4"
                          />
                          <Label 
                            htmlFor={`item-${itemIndex}-person-${person.id}`} 
                            className="text-xs font-medium cursor-pointer flex-1"
                          >
                            {person.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">No people available</p>
                )}
                
                {item.sharedBy.length > 0 && itemPrice > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-3 pt-2 border-t">
                    {formatCurrency(itemPrice / item.sharedBy.length)} per person ({item.sharedBy.length} {item.sharedBy.length === 1 ? 'person' : 'people'})
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      <Button 
        variant="outline" 
        size="default" 
        onClick={addItem} 
        className="w-full mt-4 h-11 text-sm font-medium"
      >
        <PlusCircle className="mr-2 h-5 w-5" /> 
        Add Another Item
      </Button>
    </Card>
  );
}
