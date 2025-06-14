
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
    <Card className="p-4 bg-card/50 shadow-sm mt-2 flex flex-col">
      <Label className="mb-2 block text-sm font-medium shrink-0">Select who shared:</Label>
      {people.length > 0 ? (
        <ScrollArea className="h-40"> {/* Changed from max-h-40 flex-1 min-h-0 */}
          <div className="space-y-1.5 pr-2">
          {people.map(person => (
            <div key={person.id} className="flex items-center space-x-2 p-1.5 rounded-sm">
              <Checkbox
                id={`equal-${person.id}`}
                checked={selectedPeopleEqual.includes(person.id)}
                onCheckedChange={() => handleEqualSplitChange(person.id)}
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

