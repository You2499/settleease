"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from "@/components/ui/card";
import type { Person } from '@/lib/settleease/types';

interface EqualSplitSectionProps {
  people: Person[];
  selectedPeople: string[];
  onSelectionChange: (personId: string) => void;
}

export default function EqualSplitSection({ people, selectedPeople, onSelectionChange }: EqualSplitSectionProps) {
  const allSelected = people.length > 0 && selectedPeople.length === people.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      people.forEach(p => {
        if (selectedPeople.includes(p.id)) onSelectionChange(p.id);
      });
    } else {
      people.forEach(p => {
        if (!selectedPeople.includes(p.id)) onSelectionChange(p.id);
      });
    }
  };

  return (
    <Card className="p-4 bg-card/50 shadow-sm mt-2 flex flex-col">
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <Checkbox id="select-all-equal" checked={allSelected} onCheckedChange={toggleSelectAll} />
          <Label htmlFor="select-all-equal" className="text-xs font-normal">Select All</Label>
        </div>
      </div>
      <Label className="mb-2 block text-sm font-medium shrink-0">Select who shared:</Label>
      {people.length > 0 ? (
        <ScrollArea className="h-40 rounded-md border p-1 bg-background">
          <div className="space-y-1.5 p-1">
            {people.map(person => (
              <div key={person.id} className="flex items-center space-x-2 p-2 bg-card/50 rounded-sm">
                <Checkbox
                  id={`equal-${person.id}`}
                  checked={selectedPeople.includes(person.id)}
                  onCheckedChange={() => onSelectionChange(person.id)}
                />
                <Label htmlFor={`equal-${person.id}`} className="font-normal text-sm flex-grow cursor-pointer">{person.name}</Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : <p className="text-xs text-muted-foreground">No people available to select.</p>}
    </Card>
  );
}

