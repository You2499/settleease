"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from "@/components/ui/card";
import type { Person } from '@/lib/settleease/types';

interface EqualSplitSectionProps {
  people: Person[];
  selectedPeopleEqual: string[];
  handleEqualSplitChange: (personId: string) => void;
}

export default function EqualSplitSection({ people, selectedPeopleEqual, handleEqualSplitChange }: EqualSplitSectionProps) {
  return (
    <Card className="p-6 bg-card/50 shadow-sm mt-3 flex flex-col">
      <Label className="mb-3 block text-base font-semibold shrink-0">Select who shared:</Label>
      {people.length > 0 ? (
        <ScrollArea className="h-60 rounded-md border p-2 bg-background">
          <div className="space-y-3 p-1">
          {people.map(person => (
            <div key={person.id} className="flex items-center space-x-3 p-3 bg-card/70 rounded-lg hover:bg-accent/30 transition-colors">
              <Checkbox
                id={`equal-${person.id}`}
                checked={selectedPeopleEqual.includes(person.id)}
                onCheckedChange={() => handleEqualSplitChange(person.id)}
                className="h-5 w-5"
              />
              <Label htmlFor={`equal-${person.id}`} className="font-medium text-base flex-grow cursor-pointer select-none">{person.name}</Label>
            </div>
          ))}
          </div>
        </ScrollArea>
      ) : <p className="text-sm text-muted-foreground">No people available to select.</p>}
    </Card>
  );
}

