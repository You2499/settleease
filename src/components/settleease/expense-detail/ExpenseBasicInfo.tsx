"use client";

import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Info,
  Calendar,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type { ExpenseDetailProps, ExpenseCalculations } from "./types";

interface ExpenseBasicInfoProps extends ExpenseDetailProps {
  calculations: ExpenseCalculations;
}

export default function ExpenseBasicInfo({
  expense,
  peopleMap,
  getCategoryIconFromName,
  categories,
  calculations,
}: ExpenseBasicInfoProps) {
  const categoryObj = categories.find((cat) => cat.name === expense.category);
  const CategoryIcon = getCategoryIconFromName(categoryObj?.icon_name || "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg font-bold">
          <Info className="mr-2 h-5 w-5 text-green-600" />
          Step 1: Basic Information
        </CardTitle>
        <CardDescription className="text-sm">
          Core details about this expense
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Basic Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-sm transition-all">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <div>
                <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                  {expense.created_at
                    ? new Date(expense.created_at).toLocaleDateString("default", { 
                        year: "numeric", 
                        month: "short", 
                        day: "numeric" 
                      })
                    : "Not set"}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Date
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 p-3 sm:p-4 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm transition-all">
            <div className="flex items-center space-x-2">
              <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-900 dark:text-green-100">
                  {expense.category}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Category
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description and Amount */}
        <div className="relative p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-sm transition-all">
          <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-purple-500 text-white shadow-sm">
            TOTAL
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center shadow-sm">
                <DollarSign className="w-5 h-5 text-purple-800 dark:text-purple-200" />
              </div>
              <div>
                <h3 className="font-bold text-purple-900 dark:text-purple-100">
                  {expense.description}
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Expense description
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(calculations.totalOriginalBill)}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Total Amount
              </div>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Understanding This Expense
              </div>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <p>
                  <strong>Total Bill:</strong> The complete amount paid for this expense
                </p>
                <p>
                  <strong>Split Method:</strong> How the costs are divided among people ({expense.split_method})
                </p>
                <p>
                  <strong>Net Effect:</strong> Each person's final financial position after payments and shares
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}