"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { Expense, Category } from "@/lib/settleease/types";

interface ExpenseGeneralInfoProps {
  expense: Expense;
  totalOriginalBill: number;
  CategoryIcon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export default function ExpenseGeneralInfo({
  expense,
  totalOriginalBill,
  CategoryIcon,
}: ExpenseGeneralInfoProps) {
  return (
    <Card>
      <CardHeader className="pt-3 sm:pt-4 pb-2">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          General Information
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0">
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span className="text-muted-foreground shrink-0 mr-2">
            Description:
          </span>
          <span
            className="font-medium text-left sm:text-right truncate"
            title={expense.description}
          >
            {expense.description}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-baseline">
          <span className="text-muted-foreground shrink-0 mr-2">
            Total Bill Amount:
          </span>
          <span className="font-bold text-lg sm:text-xl text-primary text-left sm:text-right">
            {formatCurrency(totalOriginalBill)}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span className="text-muted-foreground shrink-0 mr-2">
            Main Category:
          </span>
          <span className="font-medium flex items-center self-start sm:self-auto">
            <CategoryIcon className="mr-1.5 h-4 w-4" />
            {expense.category}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span className="text-muted-foreground shrink-0 mr-2">
            Expense Date:
          </span>
          <span className="font-medium flex items-center self-start sm:self-auto">
            <Calendar className="mr-1.5 h-4 w-4" />
            {expense.created_at
              ? new Date(expense.created_at).toLocaleDateString("default", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Not set"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}