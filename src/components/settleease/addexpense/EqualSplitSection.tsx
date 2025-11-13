
"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX } from 'lucide-react';
import type { Person } from '@/lib/settleease/types';

interface EqualSplitSectionProps {
  people: Person[];
  selectedPeopleEqual: string[];
  handleEqualSplitChange: (personId: string) => void;
}

export default function EqualSplitSection({ people, selectedPeopleEqual, handleEqualSplitChange }: EqualSplitSectionProps) {
  const allSelected = people.length > 0 && selectedPeopleEqual.length === people.length;
  const noneSelected = selectedPeopleEqual.length === 0;
  
  const handleSelectAll = () => {
    people.forEach(person => {
      if (!selectedPeopleEqual.includes(person.id)) {
        handleEqualSplitChange(person.id);
      }
    });
  };
  
  const handleDeselectAll = () => {
    selectedPeopleEqual.forEach(personId => {
      handleEqualSplitChange(personId);
    });
  };
  
  return (
    <Card className="p-5 bg-card/50 shadow-sm mt-3 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Select who shared this expense
        </Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
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
            onClick={handleDeselectAll}
            disabled={noneSelected}
            className="text-xs h-8"
          >
            <UserX className="h-3 w-3 mr-1" />
            None
          </Button>
        </div>
      </div>
      
      {people.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {people.map(person => {
            const isSelected = selectedPeopleEqual.includes(person.id);
            return (
              <div 
                key={person.id} 
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                  isSelected 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-background border-border hover:border-primary/20'
                }`}
                onClick={() => handleEqualSplitChange(person.id)}
              >
                <Checkbox
                  id={`equal-${person.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleEqualSplitChange(person.id)}
                  className="h-5 w-5"
                />
                <Label 
                  htmlFor={`equal-${person.id}`} 
                  className="font-medium text-sm flex-grow cursor-pointer"
                >
                  {person.name}
                </Label>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No people available to select.</p>
      )}
      
      {selectedPeopleEqual.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-semibold text-primary">{selectedPeopleEqual.length}</span> {selectedPeopleEqual.length === 1 ? 'person' : 'people'} selected • Split equally among them
          </p>
        </div>
      )}
    </Card>
  );
}

