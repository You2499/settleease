"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FixedCalendar } from "@/components/ui/fixed-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FileText, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/settleease/types";
import * as LucideIcons from "lucide-react";
import SettleEaseErrorBoundary from "../../ui/SettleEaseErrorBoundary";
import { crashTestManager } from "@/lib/settleease/crashTestContext";

interface ExpenseBasicInfoProps {
  description: string;
  setDescription: (value: string) => void;
  totalAmount: string;
  setTotalAmount: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  expenseDate: Date | undefined;
  setExpenseDate: (date: Date | undefined) => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  dynamicCategories: Category[];
}

// Individual component wrappers with crash test logic
const DescriptionInputComponent = ({ description, setDescription }: { description: string; setDescription: (value: string) => void }) => {
  crashTestManager.checkAndCrash('descriptionInput', 'Description Input crashed: Invalid input validation failed');
  
  return (
    <div>
      <Label htmlFor="description" className="text-sm sm:text-base">
        Description
      </Label>
      <Input
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g., Dinner, Groceries"
        className="mt-1 h-10 sm:h-11"
      />
    </div>
  );
};

const AmountInputComponent = ({ totalAmount, setTotalAmount }: { totalAmount: string; setTotalAmount: (value: string) => void }) => {
  crashTestManager.checkAndCrash('amountInput', 'Amount Input crashed: Currency validation failed with invalid decimal format');
  
  return (
    <div>
      <Label htmlFor="totalAmount" className="text-sm sm:text-base">
        Total Bill Amount
      </Label>
      <Input
        id="totalAmount"
        type="number"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        value={totalAmount}
        onChange={(e) => setTotalAmount(e.target.value)}
        placeholder="e.g., 100.00"
        className="mt-1 h-10 sm:h-11"
      />
    </div>
  );
};

const CategorySelectComponent = ({ category, setCategory, dynamicCategories }: { 
  category: string; 
  setCategory: (value: string) => void; 
  dynamicCategories: Category[] 
}) => {
  crashTestManager.checkAndCrash('categorySelect', 'Category Select crashed: Category lookup failed with corrupted category data');
  
  return (
    <div>
      <Label htmlFor="category" className="text-sm sm:text-base">
        Main Category
      </Label>
      <Select value={category} onValueChange={setCategory} disabled={dynamicCategories.length === 0}>
        <SelectTrigger id="category" className="mt-1 text-sm sm:text-base h-10 sm:h-11">
          <SelectValue placeholder="Select main category" />
        </SelectTrigger>
        <SelectContent>
          {dynamicCategories.map((cat) => {
            const IconComponent = (LucideIcons as any)[cat.icon_name] || FileText;
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
  );
};

const DatePickerComponent = ({ expenseDate, setExpenseDate, calendarOpen, setCalendarOpen }: { 
  expenseDate: Date | undefined; 
  setExpenseDate: (date: Date | undefined) => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
}) => {
  crashTestManager.checkAndCrash('datePicker', 'Date Picker crashed: Date parsing failed with invalid date format');
  
  return (
    <div>
      <Label className="text-sm sm:text-base">Expense Date</Label>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal mt-1 h-10 sm:h-11",
              "border-border bg-background hover:bg-accent hover:text-accent-foreground",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
              !expenseDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border border-border shadow-md rounded-lg bg-popover">
          <FixedCalendar
            selected={expenseDate}
            onSelect={(date) => {
              setExpenseDate(date);
              setCalendarOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default function ExpenseBasicInfo({
  description,
  setDescription,
  totalAmount,
  setTotalAmount,
  category,
  setCategory,
  expenseDate,
  setExpenseDate,
  calendarOpen,
  setCalendarOpen,
  dynamicCategories,
}: ExpenseBasicInfoProps) {
  // Check for section-level crash
  crashTestManager.checkAndCrash('expenseBasicInfo', 'Expense Basic Info Section crashed: Form validation engine failed');
  return (
    <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
      <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
        <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
        Bill Information
      </h3>
      <div className="space-y-3 sm:space-y-4">
        <SettleEaseErrorBoundary componentName="Description Input" size="small">
          <DescriptionInputComponent 
            description={description}
            setDescription={setDescription}
          />
        </SettleEaseErrorBoundary>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <SettleEaseErrorBoundary componentName="Amount Input" size="small">
            <AmountInputComponent 
              totalAmount={totalAmount}
              setTotalAmount={setTotalAmount}
            />
          </SettleEaseErrorBoundary>
          
          <SettleEaseErrorBoundary componentName="Category Select" size="small">
            <CategorySelectComponent 
              category={category}
              setCategory={setCategory}
              dynamicCategories={dynamicCategories}
            />
          </SettleEaseErrorBoundary>
        </div>
        
        <SettleEaseErrorBoundary componentName="Date Picker" size="small">
          <DatePickerComponent 
            expenseDate={expenseDate}
            setExpenseDate={setExpenseDate}
            calendarOpen={calendarOpen}
            setCalendarOpen={setCalendarOpen}
          />
        </SettleEaseErrorBoundary>
      </div>
    </div>
  );
}