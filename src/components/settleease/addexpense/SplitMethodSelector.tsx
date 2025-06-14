
"use client";

import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Expense } from '@/lib/settleease/types';

interface SplitMethodSelectorProps {
  splitMethod: Expense['split_method'];
  setSplitMethod: (method: Expense['split_method']) => void;
}

export default function SplitMethodSelector({ splitMethod, setSplitMethod }: SplitMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-lg font-medium">Split Method</Label>
      <RadioGroup value={splitMethod} onValueChange={(val) => setSplitMethod(val as Expense['split_method'])} className="flex space-x-4">
        <div className="flex items-center space-x-1.5"><RadioGroupItem value="equal" id="splitEqual" /><Label htmlFor="splitEqual" className="font-normal text-sm">Equally</Label></div>
        <div className="flex items-center space-x-1.5"><RadioGroupItem value="unequal" id="splitUnequal" /><Label htmlFor="splitUnequal" className="font-normal text-sm">Unequally</Label></div>
        <div className="flex items-center space-x-1.5"><RadioGroupItem value="itemwise" id="splitItemwise" /><Label htmlFor="splitItemwise" className="font-normal text-sm">Item-wise</Label></div>
      </RadioGroup>
    </div>
  );
}
