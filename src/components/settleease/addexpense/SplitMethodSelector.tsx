
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Scale, SlidersHorizontal, ClipboardList } from 'lucide-react';
import type { Expense } from '@/lib/settleease/types';

interface SplitMethodSelectorProps {
  splitMethod: Expense['split_method'];
  setSplitMethod: (method: Expense['split_method']) => void;
}

export default function SplitMethodSelector({ splitMethod, setSplitMethod }: SplitMethodSelectorProps) {
  const options: { value: Expense['split_method']; label: string; Icon: React.ElementType }[] = [
    { value: 'equal', label: 'Equally', Icon: Scale },
    { value: 'unequal', label: 'Unequally', Icon: SlidersHorizontal },
    { value: 'itemwise', label: 'Item-wise', Icon: ClipboardList },
  ];

  return (
    <div className="space-y-2 sm:space-y-3">
      <Label className="text-md sm:text-lg font-medium">Split Method</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {options.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={splitMethod === value ? 'default' : 'outline'}
            size="default"
            onClick={() => setSplitMethod(value)}
            className="h-11 min-w-0 justify-center overflow-hidden rounded-lg px-3 text-sm sm:min-w-[7.75rem] sm:flex-1"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
