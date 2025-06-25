import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense } from '@/lib/settleease/types';

interface ExpenseListItemProps {
  expense: Expense;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  onClick?: (expense: Expense) => void;
  actions?: React.ReactNode;
}

export default function ExpenseListItem({
  expense,
  peopleMap,
  getCategoryIconFromName,
  onClick,
  actions,
}: ExpenseListItemProps) {
  const CategoryIcon = getCategoryIconFromName(expense.category);
  const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
    ? "Multiple Payers"
    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
      ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
      : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));

  return (
    <li onClick={() => onClick?.(expense)} className={onClick ? 'cursor-pointer' : ''}>
      <Card className="bg-card/70 hover:bg-card/90 transition-all rounded-md">
        <CardHeader className="pb-1.5 pt-2.5 px-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <CardTitle className="text-sm sm:text-[0.9rem] font-semibold leading-tight flex-1 mr-2 truncate" title={expense.description}>
              {expense.description}
            </CardTitle>
            <span className="text-sm sm:text-md font-bold text-primary mt-1 sm:mt-0">
              {formatCurrency(Number(expense.total_amount))}
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center">
              <CategoryIcon className="mr-1 h-3 w-3" /> {expense.category}
            </div>
            <span className="mt-0.5 sm:mt-0">
              Paid by: <span className="font-medium">{displayPayerText}</span>
            </span>
          </div>
          {actions && (
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:justify-end sm:space-x-2.5 pt-2">
              {actions}
            </div>
          )}
        </CardContent>
      </Card>
    </li>
  );
} 