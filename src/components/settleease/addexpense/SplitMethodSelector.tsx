
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
    <div className="space-y-3">
      <Label className="text-lg font-medium">Split Method</Label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={splitMethod === value ? 'default' : 'outline'}
            size="lg"
            onClick={() => setSplitMethod(value)}
            className="w-full justify-center sm:justify-start"
          >
            <Icon className="mr-2 h-5 w-5" />
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

