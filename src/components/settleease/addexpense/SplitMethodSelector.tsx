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
    <div className="space-y-3 sm:space-y-5">
      <Label className="text-md sm:text-lg font-medium">Split Method</Label>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
        {options.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={splitMethod === value ? 'default' : 'outline'}
            size="lg"
            onClick={() => setSplitMethod(value)}
            className="flex-1 min-w-[120px] sm:min-w-[160px] justify-center text-base sm:text-lg py-4 sm:py-5 h-auto rounded-xl shadow-md border-2 border-muted-foreground/20 hover:border-primary transition-all duration-150"
          >
            <Icon className="mr-3 h-6 w-6 sm:h-7 sm:w-7" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
