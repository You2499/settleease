"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileText, Search, Filter, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, SettlementPayment } from '@/lib/settleease/types';
import type { Category } from '@/lib/settleease/types';
import { Separator } from '@/components/ui/separator';
import ExpenseListItem from '../ExpenseListItem';
import SettlementListItem from '../SettlementListItem';

interface ExpenseLogProps {
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  peopleMap: Record<string, string>;
  handleExpenseCardClick: (expense: Expense) => void;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: Category[];
  isLoadingExpenses?: boolean;
  isLoadingSettlements?: boolean;
}

type ActivityItem =
  | { type: 'expense'; id: string; date: string; data: Expense }
  | { type: 'settlement'; id: string; date: string; data: SettlementPayment };

export default function ExpenseLog({
  expenses,
  settlementPayments,
  peopleMap,
  handleExpenseCardClick,
  getCategoryIconFromName,
  categories,
}: ExpenseLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combine expenses and settlements into a single activity list
  const allActivities: ActivityItem[] = useMemo(() => [
    ...expenses
      .filter(expense => !expense.exclude_from_settlement)
      .map(expense => ({
        type: 'expense' as const,
        id: expense.id,
        date: expense.created_at || new Date().toISOString(),
        data: expense,
      })),
    ...settlementPayments.map(settlement => ({
      type: 'settlement' as const,
      id: settlement.id,
      date: settlement.settled_at,
      data: settlement,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [expenses, settlementPayments]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return allActivities.filter(item => {
      // 1. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (item.type === 'expense') {
          if (!item.data.description.toLowerCase().includes(query)) return false;
        } else {
          // Search in settlements (names or notes)
          const debtor = peopleMap[item.data.debtor_id] || '';
          const creditor = peopleMap[item.data.creditor_id] || '';
          const note = item.data.notes || '';
          const searchStr = `payment ${debtor} ${creditor} ${note}`.toLowerCase();
          if (!searchStr.includes(query)) return false;
        }
      }

      // 2. Person Filter
      if (filterPerson !== 'all') {
        if (item.type === 'expense') {
          // Check if person is payer or involved in split
          const isPayer = item.data.paid_by.some(p => p.personId === filterPerson);
          const isSharer = item.data.shares.some(s => s.personId === filterPerson);
          if (!isPayer && !isSharer) return false;
        } else {
          if (item.data.debtor_id !== filterPerson && item.data.creditor_id !== filterPerson) return false;
        }
      }

      // 3. Category Filter
      if (filterCategory !== 'all') {
        if (item.type === 'expense') {
          const mainCategoryMatch = item.data.category === filterCategory;
          let itemCategoryMatch = false;
          if (item.data.split_method === 'itemwise' && item.data.items) {
            itemCategoryMatch = item.data.items.some(i => i.categoryName === filterCategory);
          }

          if (!mainCategoryMatch && !itemCategoryMatch) return false;
        } else {
          // Settlements don't have categories, so hide them if a category is selected
          return false;
        }
      }

      return true;
    });
  }, [allActivities, searchQuery, filterPerson, filterCategory, peopleMap]);

  // Group by date
  const groupedActivities = useMemo(() => filteredActivities.reduce((acc, activity) => {
    const date = new Date(activity.date).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityItem[]>), [filteredActivities]);

  const activityDates = useMemo(() => Object.keys(groupedActivities), [groupedActivities]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterPerson('all');
    setFilterCategory('all');
  };

  const hasActiveFilters = searchQuery || filterPerson !== 'all' || filterCategory !== 'all';

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
              <FileText className="mr-2 h-5 w-5 text-primary" /> Activity Feed
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {filteredActivities.length} {filteredActivities.length === 1 ? 'transaction' : 'transactions'} found
            </CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Search and Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="relative sm:col-span-6 md:col-span-5">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="expense-search-input"
              ref={searchInputRef}
              placeholder="Search..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-6 md:col-span-7">
            <Select value={filterPerson} onValueChange={setFilterPerson}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                {Object.entries(peopleMap).map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
        {filteredActivities.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4">
              {activityDates.map((date, index) => (
                <div key={date}>
                  <div className={`relative ${index === 0 ? 'mb-3' : 'my-3'}`}>
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="bg-border shadow-inner opacity-80" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground font-semibold rounded shadow-inner border border-border/60" style={{ position: 'relative', top: '1px' }}>
                        {date}
                      </span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 px-0.5 sm:px-1">
                    {groupedActivities[date].map(activity => {
                      if (activity.type === 'expense') {
                        return (
                          <ExpenseListItem
                            key={activity.id}
                            expense={activity.data}
                            peopleMap={peopleMap}
                            getCategoryIconFromName={getCategoryIconFromName}
                            categories={categories}
                            onClick={handleExpenseCardClick}
                            highlightedCategory={filterCategory}
                          />
                        );
                      } else {
                        return (
                          <SettlementListItem
                            key={activity.id}
                            settlement={activity.data}
                            peopleMap={peopleMap}
                          />
                        );
                      }
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
            <Filter className="h-10 w-10 mb-2 opacity-20" />
            <p>No transactions found.</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}