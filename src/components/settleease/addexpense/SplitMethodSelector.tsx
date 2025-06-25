"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Scale, SlidersHorizontal, ClipboardList } from 'lucide-react';
import type { Expense } from '@/lib/settleease/types';

interface SplitMethodSelectorProps {
  splitMethod: Expense['split_method'];
  onSplitMethodChange: (method: Expense['split_method']) => void;
}

export default function SplitMethodSelector({ splitMethod, onSplitMethodChange }: SplitMethodSelectorProps) {
  const options: { value: Expense['split_method']; label: string; Icon: React.ElementType }[] = [
    { value: 'equal', label: 'Equally', Icon: Scale },
    { value: 'unequal', label: 'Unequally', Icon: SlidersHorizontal },
    { value: 'itemwise', label: 'Item-wise', Icon: ClipboardList },
  ];

  return (
    <div className="space-y-2 sm:space-y-3">
      <Label className="text-md sm:text-lg font-medium">Split Method</Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={splitMethod === value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onSplitMethodChange(value)}
            className="w-full justify-start"
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
