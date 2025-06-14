
"use client";

import React, { useMemo, useState } from 'react';
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIconLucide, Users, TrendingUp, DollarSign, CalendarDays, Sigma, ListFilter,
  CalendarClock, GitFork, Award, SearchCheck, User, FileText as FileTextIcon, Eye, UserSquare
} from 'lucide-react';
import {
  LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { CHART_COLORS, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants'; // Added AVAILABLE_CATEGORY_ICONS
import type {
  Expense, Person, Category as DynamicCategory,
  CategoryAnalyticsData, ParticipantAnalyticsData, ExpenseAmountDistributionData,
  SpendingByDayOfWeekData, SplitMethodDistributionData, TopExpenseData
} from '@/lib/settleease/types';
import ShareVsPaidChart from './dashboard/ShareVsPaidChart';

interface AnalyticsTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: DynamicCategory[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

interface MonthlyExpenseData {
  month: string;
  totalAmount: number;
}

const UNCATEGORIZED = "Uncategorized";


export default function AnalyticsTab({
  expenses: allExpenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
}: AnalyticsTabProps) {
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'group' | 'personal'>('group');
  const [selectedPersonIdForAnalytics, setSelectedPersonIdForAnalytics] = useState<string | null>(null);

  const displayedExpenses = useMemo(() => {
    if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
      return allExpenses.filter(exp => {
        const personPaid = exp.paid_by.some(p => p.personId === selectedPersonIdForAnalytics);
        const personShared = exp.shares.some(s => s.personId === selectedPersonIdForAnalytics);
        return personPaid || personShared;
      });
    }
    return allExpenses;
  }, [allExpenses, analyticsViewMode, selectedPersonIdForAnalytics]);


  const enhancedOverallStats = useMemo(() => {
    const totalAmount = displayedExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
    const expenseCount = displayedExpenses.length;
    const averageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0;
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;

    if (expenseCount > 0) {
      const sortedExpensesByDate = [...displayedExpenses].sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      firstDate = new Date(sortedExpensesByDate[0].created_at || Date.now());
      lastDate = new Date(sortedExpensesByDate[expenseCount - 1].created_at || Date.now());
    }

    const distinctParticipants = new Set<string>();
    displayedExpenses.forEach(exp => {
      exp.paid_by.forEach(p => distinctParticipants.add(p.personId));
      exp.shares.forEach(s => distinctParticipants.add(s.personId));
    });

    let mostExpensiveCatData: { name: string; totalAmount: number; } = { name: 'N/A', totalAmount: 0 };
    // This will be derived from detailedCategoryAnalytics later for accuracy with item-level cats
    // For now, a simple placeholder, the real one will come from detailedCategoryAnalytics
    const tempCategorySpending: Record<string, number> = {};
    displayedExpenses.forEach(exp => {
        if (exp.split_method === 'itemwise' && exp.items) {
            exp.items.forEach(item => {
                const cat = item.categoryName || exp.category || UNCATEGORIZED;
                tempCategorySpending[cat] = (tempCategorySpending[cat] || 0) + Number(item.price);
            });
        } else {
            const cat = exp.category || UNCATEGORIZED;
            tempCategorySpending[cat] = (tempCategorySpending[cat] || 0) + Number(exp.total_amount);
        }
    });
    const sortedTempCategories = Object.entries(tempCategorySpending).sort(([,a],[,b]) => b-a);
    if (sortedTempCategories.length > 0) {
        mostExpensiveCatData = { name: sortedTempCategories[0][0], totalAmount: sortedTempCategories[0][1] };
    }


    let largestSingleExp: { description: string; amount: number; date: string } = { description: 'N/A', amount: 0, date: '' };
    if (expenseCount > 0) {
      const sortedByAmount = [...displayedExpenses].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
      largestSingleExp = {
        description: sortedByAmount[0].description,
        amount: Number(sortedByAmount[0].total_amount),
        date: new Date(sortedByAmount[0].created_at || Date.now()).toLocaleDateString()
      };
    }

    return {
      totalAmount, expenseCount, averageAmount, firstDate, lastDate,
      distinctParticipantCount: distinctParticipants.size,
      mostExpensiveCategory: mostExpensiveCatData, // This will be updated by detailedCategoryAnalytics if needed
      largestSingleExpense: largestSingleExp,
    };
  }, [displayedExpenses]);

  const monthlyExpenseData: MonthlyExpenseData[] = useMemo(() => {
    const data: Record<string, number> = {};
    displayedExpenses.forEach(exp => {
      if (exp.created_at) {
        const monthYear = new Date(exp.created_at).toLocaleDateString('default', { year: 'numeric', month: 'short' });
        data[monthYear] = (data[monthYear] || 0) + Number(exp.total_amount);
      }
    });
    return Object.entries(data)
      .map(([month, totalAmount]) => ({ month, totalAmount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [displayedExpenses]);

  const detailedCategoryAnalytics: CategoryAnalyticsData[] = useMemo(() => {
    const categoryDataMap: Record<string, {
      totalAmount: number;
      expenseIds: Set<string>;
      potentialMostExpensive: Array<{ type: 'expense' | 'item', id: string, description: string, amount: number, date: string, mainExpenseDescription?: string }>;
      payerContributions: Record<string, number>;
    }> = {};

    // Initialize for all known dynamic categories and a general "Uncategorized"
    dynamicCategories.forEach(cat => {
      categoryDataMap[cat.name] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], payerContributions: {} };
    });
    if (!categoryDataMap[UNCATEGORIZED]) {
      categoryDataMap[UNCATEGORIZED] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], payerContributions: {} };
    }

    displayedExpenses.forEach(exp => {
      const expDate = new Date(exp.created_at || Date.now()).toLocaleDateString();
      const expenseTotalAmountNum = Number(exp.total_amount) || 0;

      if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
        exp.items.forEach(item => {
          const itemPrice = Number(item.price) || 0;
          if (itemPrice <= 0) return;

          const targetCategory = item.categoryName || exp.category || UNCATEGORIZED;
          if (!categoryDataMap[targetCategory]) { // Ensure category exists in map
            categoryDataMap[targetCategory] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], payerContributions: {} };
          }

          categoryDataMap[targetCategory].totalAmount += itemPrice;
          categoryDataMap[targetCategory].expenseIds.add(exp.id);
          categoryDataMap[targetCategory].potentialMostExpensive.push({
            type: 'item',
            id: item.id, // item's own id
            description: item.name,
            amount: itemPrice,
            date: expDate,
            mainExpenseDescription: exp.description
          });

          if (expenseTotalAmountNum > 0) {
            const itemProportionOfExpense = itemPrice / expenseTotalAmountNum;
            exp.paid_by.forEach(payer => {
              const payerAmount = Number(payer.amount) || 0;
              const payerContributionToItem = itemProportionOfExpense * payerAmount;
              categoryDataMap[targetCategory].payerContributions[payer.personId] =
                (categoryDataMap[targetCategory].payerContributions[payer.personId] || 0) + payerContributionToItem;
            });
          }
        });
      } else { // Not itemwise or no items
        if (expenseTotalAmountNum <= 0) return;

        const targetCategory = exp.category || UNCATEGORIZED;
        if (!categoryDataMap[targetCategory]) { // Ensure category exists in map
          categoryDataMap[targetCategory] = { totalAmount: 0, expenseIds: new Set(), potentialMostExpensive: [], payerContributions: {} };
        }

        categoryDataMap[targetCategory].totalAmount += expenseTotalAmountNum;
        categoryDataMap[targetCategory].expenseIds.add(exp.id);
        categoryDataMap[targetCategory].potentialMostExpensive.push({
          type: 'expense',
          id: exp.id,
          description: exp.description,
          amount: expenseTotalAmountNum,
          date: expDate
        });
        exp.paid_by.forEach(payer => {
          const payerAmount = Number(payer.amount) || 0;
          categoryDataMap[targetCategory].payerContributions[payer.personId] =
            (categoryDataMap[targetCategory].payerContributions[payer.personId] || 0) + payerAmount;
        });
      }
    });

    return Object.entries(categoryDataMap).map(([name, data]) => {
      const { totalAmount, expenseIds, potentialMostExpensive, payerContributions } = data;
      const expenseCount = expenseIds.size;

      let mostExpensiveItemData: { description: string; amount: number; date: string; } | null = null;
      if (potentialMostExpensive.length > 0) {
        const sortedItems = [...potentialMostExpensive].sort((a, b) => b.amount - a.amount);
        const topItem = sortedItems[0];
        mostExpensiveItemData = {
          description: topItem.type === 'item' ? `${topItem.description} (from "${topItem.mainExpenseDescription}")` : topItem.description,
          amount: topItem.amount,
          date: topItem.date
        };
      }

      let largestPayerData: { name: string; amount: number; } | null = null;
      if (Object.keys(payerContributions).length > 0) {
        const sortedPayers = Object.entries(payerContributions)
          .map(([personId, amount]) => ({ name: peopleMap[personId] || 'Unknown', amount }))
          .sort((a, b) => b.amount - a.amount);
        if (sortedPayers.length > 0 && sortedPayers[0].amount > 0.001) {
          largestPayerData = sortedPayers[0];
        }
      }

      return {
        name,
        totalAmount,
        expenseCount,
        averageAmount: expenseCount > 0 && totalAmount > 0 ? totalAmount / expenseCount : 0, // ensure totalAmount > 0 for avg
        Icon: getCategoryIconFromName(name),
        mostExpensiveItem: mostExpensiveItemData,
        largestPayer: largestPayerData,
      };
    }).filter(cat => cat.totalAmount > 0.001 || dynamicCategories.some(dc => dc.name === cat.name))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [displayedExpenses, dynamicCategories, getCategoryIconFromName, peopleMap]);


  const detailedParticipantAnalytics: ParticipantAnalyticsData[] = useMemo(() => {
    const peopleToAnalyze = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
      ? people.filter(p => p.id === selectedPersonIdForAnalytics)
      : people;

    return peopleToAnalyze.map(person => {
      let totalPaid = 0;
      let totalShared = 0;
      let expensesPaidCount = 0;
      let expensesSharedCount = 0;
      const categoryShares: Record<string, number> = {};

      displayedExpenses.forEach(exp => {
        let personPaidThisExpense = false;
        if (Array.isArray(exp.paid_by)) {
          exp.paid_by.forEach(p => {
            if (p.personId === person.id) {
              totalPaid += Number(p.amount);
              personPaidThisExpense = true;
            }
          });
        }
        if (personPaidThisExpense) expensesPaidCount++;

        const personShareInExpense = exp.shares.find(s => s.personId === person.id);
        if (personShareInExpense && Number(personShareInExpense.amount) > 0.001) {
          const shareAmountForPersonInExpense = Number(personShareInExpense.amount);
          totalShared += shareAmountForPersonInExpense;
          expensesSharedCount++;

          if (exp.split_method === 'itemwise' && Array.isArray(exp.items) && exp.items.length > 0) {
            let sumOfOriginalPricesOfItemsSharedByPersonThisExpense = 0;
            const itemsSharedByPersonDetailsThisExpense: Array<{ originalPrice: number; category: string }> = [];

            exp.items.forEach(item => {
              if (item.sharedBy.includes(person.id)) {
                const originalItemPrice = Number(item.price) || 0;
                sumOfOriginalPricesOfItemsSharedByPersonThisExpense += originalItemPrice;
                itemsSharedByPersonDetailsThisExpense.push({
                  originalPrice: originalItemPrice,
                  category: item.categoryName || exp.category || UNCATEGORIZED,
                });
              }
            });

            if (sumOfOriginalPricesOfItemsSharedByPersonThisExpense > 0.001) {
              itemsSharedByPersonDetailsThisExpense.forEach(itemDetail => {
                const proportionOfShare = itemDetail.originalPrice / sumOfOriginalPricesOfItemsSharedByPersonThisExpense;
                const amountForThisCategory = proportionOfShare * shareAmountForPersonInExpense;
                categoryShares[itemDetail.category] = (categoryShares[itemDetail.category] || 0) + amountForThisCategory;
              });
            } else if (itemsSharedByPersonDetailsThisExpense.length > 0) {
              // Fallback: if items have 0 price, distribute share equally or to main category
              const fallbackCat = exp.category || itemsSharedByPersonDetailsThisExpense[0]?.category || UNCATEGORIZED;
              categoryShares[fallbackCat] = (categoryShares[fallbackCat] || 0) + shareAmountForPersonInExpense;
            } else {
                 // If person has a share but not linked to specific items (edge case, should not happen with correct logic)
                 const mainCat = exp.category || UNCATEGORIZED;
                 categoryShares[mainCat] = (categoryShares[mainCat] || 0) + shareAmountForPersonInExpense;
            }
          } else { // Not itemwise
            const targetCategory = exp.category || UNCATEGORIZED;
            categoryShares[targetCategory] = (categoryShares[targetCategory] || 0) + shareAmountForPersonInExpense;
          }
        }
      });

      const sortedCategoryShares = Object.entries(categoryShares)
                                     .filter(([,amount]) => amount > 0.001)
                                     .sort(([, a], [, b]) => b - a);
      const mostFreqCatShared = sortedCategoryShares.length > 0 ? { name: sortedCategoryShares[0][0], amount: sortedCategoryShares[0][1] } : null;

      return {
        name: person.name,
        totalPaid,
        totalShared,
        netBalance: totalPaid - totalShared,
        expensesPaidCount,
        expensesSharedCount,
        mostFrequentCategoryShared: mostFreqCatShared,
        averageShareAmount: expensesSharedCount > 0 ? totalShared / expensesSharedCount : 0,
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid);
  }, [displayedExpenses, people, analyticsViewMode, selectedPersonIdForAnalytics]);


  const expenseAmountDistributionData: ExpenseAmountDistributionData[] = useMemo(() => {
    const ranges = [
      { label: `₹0 - ₹500`, min: 0, max: 500 },
      { label: `₹501 - ₹1k`, min: 501, max: 1000 },
      { label: `₹1k - ₹2.5k`, min: 1001, max: 2500 },
      { label: `₹2.5k - ₹5k`, min: 2501, max: 5000 },
      { label: `₹5k - ₹10k`, min: 5001, max: 10000 },
      { label: `₹10k+`, min: 10001, max: Infinity },
    ];
    const distribution: Record<string, number> = ranges.reduce((acc, range) => {
      acc[range.label] = 0;
      return acc;
    }, {} as Record<string, number>);

    displayedExpenses.forEach(exp => {
      const amount = Number(exp.total_amount);
      for (const range of ranges) {
        if (amount >= range.min && amount <= range.max) {
          distribution[range.label]++;
          break;
        }
      }
    });
    return Object.entries(distribution).map(([range, count]) => ({ range, count })).filter(d => d.count > 0);
  }, [displayedExpenses]);

  const shareVsPaidData = useMemo(() => {
    const peopleToAnalyze = analyticsViewMode === 'personal' && selectedPersonIdForAnalytics
      ? people.filter(p => p.id === selectedPersonIdForAnalytics)
      : people;
    if (!peopleToAnalyze.length) return [];

    return peopleToAnalyze.map(person => {
      let totalPaidByPerson = 0;
      let totalShareForPerson = 0;
      displayedExpenses.forEach(expense => {
        if (Array.isArray(expense.paid_by)) {
          expense.paid_by.forEach(payment => {
            if (payment.personId === person.id) totalPaidByPerson += Number(payment.amount);
          });
        }
        if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            if (share.personId === person.id) totalShareForPerson += Number(share.amount);
          });
        }
      });
      return { name: peopleMap[person.id] || person.name, paid: totalPaidByPerson, share: totalShareForPerson };
    }).filter(d => d.paid > 0.01 || d.share > 0.01);
  }, [displayedExpenses, people, peopleMap, analyticsViewMode, selectedPersonIdForAnalytics]);

  const spendingByDayOfWeekData: SpendingByDayOfWeekData[] = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const spending: Record<string, number> = days.reduce((acc, day) => { acc[day] = 0; return acc; }, {} as Record<string, number>);
    displayedExpenses.forEach(exp => {
      if (exp.created_at) {
        const dayOfWeek = days[new Date(exp.created_at).getDay()];
        spending[dayOfWeek] = (spending[dayOfWeek] || 0) + Number(exp.total_amount);
      }
    });
    return days.map(day => ({ day, totalAmount: spending[day] })).filter(d => d.totalAmount > 0);
  }, [displayedExpenses]);

  const splitMethodDistributionData: SplitMethodDistributionData[] = useMemo(() => {
    const counts: Record<string, number> = { 'equal': 0, 'unequal': 0, 'itemwise': 0 };
    displayedExpenses.forEach(exp => {
      counts[exp.split_method] = (counts[exp.split_method] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([method, count]) => ({ method: method.charAt(0).toUpperCase() + method.slice(1), count }))
      .filter(d => d.count > 0);
  }, [displayedExpenses]);

  const topExpensesData: TopExpenseData[] = useMemo(() => {
    return [...displayedExpenses]
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
      .slice(0, 10); // Top 10 expenses
  }, [displayedExpenses]);

  const actualMostExpensiveCategoryFromAnalytics = useMemo(() => {
    if (detailedCategoryAnalytics.length > 0) {
      return { name: detailedCategoryAnalytics[0].name, totalAmount: detailedCategoryAnalytics[0].totalAmount };
    }
    return { name: 'N/A', totalAmount: 0 };
  }, [detailedCategoryAnalytics]);


  if (allExpenses.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg text-center py-10">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary flex items-center justify-center">
            <BarChart3 className="mr-3 h-7 w-7" /> Expense Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-md text-muted-foreground">No expenses recorded yet to analyze.</p>
          <p className="text-sm">Add some expenses to see detailed analytics here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-full p-0.5">
      <div className="space-y-6">
        <Tabs value={analyticsViewMode} onValueChange={(value) => {
          setAnalyticsViewMode(value as 'group' | 'personal');
          if (value === 'group') setSelectedPersonIdForAnalytics(null);
          else if (people.length > 0 && !selectedPersonIdForAnalytics) setSelectedPersonIdForAnalytics(people[0].id);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10 bg-background/90 backdrop-blur-sm">
            <TabsTrigger value="group" className="flex items-center gap-2">
              <Eye className="h-4 w-4"/> Group Overview
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <UserSquare className="h-4 w-4"/> Personal Insights
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="group">
            {/* Content for Group Overview will be rendered below */}
          </TabsContent>
          <TabsContent value="personal">
            <Card className="mb-6 p-4 shadow-sm">
              <Label htmlFor="person-analytics-select" className="block text-sm font-medium mb-2 text-primary">
                Select Person for Detailed Insights:
              </Label>
              <Select
                value={selectedPersonIdForAnalytics || ''}
                onValueChange={setSelectedPersonIdForAnalytics}
                disabled={people.length === 0}
              >
                <SelectTrigger id="person-analytics-select">
                  <SelectValue placeholder="Select a person..." />
                </SelectTrigger>
                <SelectContent>
                  {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Card>
             {analyticsViewMode === 'personal' && !selectedPersonIdForAnalytics && (
              <Card className="shadow-md rounded-lg text-center py-6">
                <CardContent>
                  <p className="text-md text-muted-foreground">Please select a person to view their personal analytics.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {(analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics)) && displayedExpenses.length === 0 && (
            <Card className="shadow-md rounded-lg text-center py-6">
                <CardContent>
                <p className="text-md text-muted-foreground">
                    {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? 
                    `${peopleMap[selectedPersonIdForAnalytics] || 'The selected person'} is not involved in any expenses.` :
                    "No expenses match the current filter."}
                </p>
                </CardContent>
            </Card>
        )}

        {(analyticsViewMode === 'group' || (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics && displayedExpenses.length > 0)) && (
          <>
            <Card className="shadow-md rounded-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center"><Sigma className="mr-2 h-5 w-5 text-primary"/>
                  {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? `${peopleMap[selectedPersonIdForAnalytics]}'s Snapshot` : 'Overall Snapshot'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-bold text-accent">{formatCurrency(enhancedOverallStats.totalAmount)}</p>
                </div>
                <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total Expenses</p>
                  <p className="text-lg font-bold">{enhancedOverallStats.expenseCount}</p>
                </div>
                <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5">
                  <p className="text-xs text-muted-foreground">Avg. Expense</p>
                  <p className="text-lg font-bold">{formatCurrency(enhancedOverallStats.averageAmount)}</p>
                </div>
                {analyticsViewMode === 'group' && (
                  <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5">
                    <p className="text-xs text-muted-foreground">Participants</p>
                    <p className="text-lg font-bold">{enhancedOverallStats.distinctParticipantCount}</p>
                  </div>
                )}
                <div className={`p-3 bg-card/50 rounded-md shadow-sm space-y-0.5 ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-1'}`}>
                  <p className="text-xs text-muted-foreground">Top Category</p>
                  <p className="text-base font-semibold truncate" title={actualMostExpensiveCategoryFromAnalytics.name}>
                    {actualMostExpensiveCategoryFromAnalytics.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(actualMostExpensiveCategoryFromAnalytics.totalAmount)}</p>
                </div>
                <div className={`p-3 bg-card/50 rounded-md shadow-sm space-y-0.5 ${analyticsViewMode === 'group' ? 'col-span-2 md:col-span-1' : 'col-span-2'}`}>
                  <p className="text-xs text-muted-foreground">Largest Expense</p>
                  <p className="text-base font-semibold truncate" title={enhancedOverallStats.largestSingleExpense.description}>
                    {enhancedOverallStats.largestSingleExpense.description}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(enhancedOverallStats.largestSingleExpense.amount)} on {enhancedOverallStats.largestSingleExpense.date}</p>
                </div>
                <div className="p-3 bg-card/50 rounded-md shadow-sm col-span-2 md:col-span-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Date Range (of these expenses)</p>
                  <p className="text-sm font-semibold">
                    {enhancedOverallStats.firstDate ? enhancedOverallStats.firstDate.toLocaleDateString() : 'N/A'} - {enhancedOverallStats.lastDate ? enhancedOverallStats.lastDate.toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="shadow-md rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-primary"/>Expenses Over Time (Monthly)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyExpenseData} margin={{ top: 10, right: 20, left: -5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [formatCurrency(value), "Total Spent"]} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="totalAmount" name="Total Spent" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                    </ResponsiveContainer>
                </CardContent>
                </Card>
                <Card className="shadow-md rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                        Share vs. Paid Comparison
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {shareVsPaidData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                            data={shareVsPaidData}
                            margin={{ top: 10, right: 20, left: 10, bottom: (shareVsPaidData.length > 4 && analyticsViewMode === 'group') ? 25 : 5 }}
                            >
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                                dataKey="name" 
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                                interval={0} 
                                angle={(shareVsPaidData.length > 4 && analyticsViewMode === 'group') ? -30 : 0} 
                                textAnchor={(shareVsPaidData.length > 4 && analyticsViewMode === 'group') ? "end" : "middle"} 
                                height={(shareVsPaidData.length > 4 && analyticsViewMode === 'group') ? 50: 30} 
                            />
                             <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <Tooltip
                                formatter={(value: number) => [formatCurrency(value), "Amount"]}
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} barSize={Math.min(25, (shareVsPaidData.length > 0 ? (200 / shareVsPaidData.length / 2) : 25) * 0.8 )} />
                            <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} barSize={Math.min(25, (shareVsPaidData.length > 0 ? (200 / shareVsPaidData.length / 2) : 25) * 0.8 )} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for comparison chart.</p>)}
                    </CardContent>
                </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {spendingByDayOfWeekData.length > 0 && (
                <Card className="shadow-md rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center"><CalendarClock className="mr-2 h-5 w-5 text-primary"/>Spending by Day of Week</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={spendingByDayOfWeekData} margin={{ top: 10, right: 20, left: -5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                        <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}/>
                        <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}/>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [formatCurrency(value), "Total Spent"]}/>
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="totalAmount" name="Total Spent" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} barSize={25}/>
                        </BarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                )}
                {splitMethodDistributionData.length > 0 && (
                <Card className="shadow-md rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center"><GitFork className="mr-2 h-5 w-5 text-primary"/>Split Method Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie data={splitMethodDistributionData} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                            {splitMethodDistributionData.map((entry, index) => (
                            <RechartsCell key={`cell-split-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [value, "Expenses"]}/>
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        </PieChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                )}
            </div>
            
            {topExpensesData.length > 0 && (
            <Card className="shadow-md rounded-lg">
                <CardHeader>
                <CardTitle className="text-lg flex items-center"><Award className="mr-2 h-5 w-5 text-primary"/>Top 10 Largest Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                <ScrollArea className="h-auto max-h-[400px]">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="py-2 px-2 text-xs">Description</TableHead>
                        <TableHead className="py-2 px-2 text-xs text-right">Amount</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Category</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Date</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Paid By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {topExpensesData.map(exp => (
                        <TableRow key={exp.id}>
                            <TableCell className="py-1.5 px-2 text-xs font-medium truncate max-w-xs" title={exp.description}>{exp.description}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right font-semibold text-primary">{formatCurrency(exp.total_amount)}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs">{exp.category}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs">{new Date(exp.created_at || '').toLocaleDateString()}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs truncate max-w-[150px]" title={exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}>
                            {exp.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')}
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </ScrollArea>
                </CardContent>
            </Card>
            )}

            <Card className="shadow-md rounded-lg">
            <CardHeader>
                <CardTitle className="text-lg flex items-center"><SearchCheck className="mr-2 h-5 w-5 text-primary"/>Category Deep Dive</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-auto max-h-[400px]">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="py-2 px-2 text-xs">Category</TableHead>
                        <TableHead className="py-2 px-2 text-xs text-right">Total</TableHead>
                        <TableHead className="py-2 px-2 text-xs text-right"># Exp.</TableHead>
                        <TableHead className="py-2 px-2 text-xs text-right">Avg.</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Largest Expense in Category</TableHead>
                        <TableHead className="py-2 px-2 text-xs">Top Payer in Category</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {detailedCategoryAnalytics.map(cat => (
                        <TableRow key={cat.name}>
                        <TableCell className="py-1.5 px-2 text-xs font-medium flex items-center"><cat.Icon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>{cat.name}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(cat.totalAmount)}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs text-right">{cat.expenseCount}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(cat.averageAmount)}</TableCell>
                        <TableCell className="py-1.5 px-2 text-xs truncate max-w-[200px]" title={cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description} (${formatCurrency(cat.mostExpensiveItem.amount)}) on ${cat.mostExpensiveItem.date}` : 'N/A'}>
                            {cat.mostExpensiveItem ? `${cat.mostExpensiveItem.description} (${formatCurrency(cat.mostExpensiveItem.amount)})` : 'N/A'}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-xs truncate max-w-[150px]" title={cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}>
                            {cat.largestPayer ? `${cat.largestPayer.name} (${formatCurrency(cat.largestPayer.amount)})` : 'N/A'}
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </CardContent>
            </Card>
            
            <Card className="shadow-md rounded-lg">
                <CardHeader>
                <CardTitle className="text-lg flex items-center">
                    <User className="mr-2 h-5 w-5 text-primary"/>
                    {analyticsViewMode === 'personal' && selectedPersonIdForAnalytics ? `${peopleMap[selectedPersonIdForAnalytics]}'s Financial Summary (Involved Expenses)` : 'Participant Deep Dive (Based on Expenses)'}
                </CardTitle>
                <CardDescription className="text-xs">This shows financial details derived purely from the displayed expense records, not reflecting settlements.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-auto max-h-[400px]">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="py-2 px-2 text-xs">Participant</TableHead>
                                <TableHead className="py-2 px-2 text-xs text-right">Paid</TableHead>
                                <TableHead className="py-2 px-2 text-xs text-right">Shared</TableHead>
                                <TableHead className="py-2 px-2 text-xs text-right">Net</TableHead>
                                <TableHead className="py-2 px-2 text-xs text-right"># Paid</TableHead>
                                <TableHead className="py-2 px-2 text-xs text-right"># Shared</TableHead>
                                <TableHead className="py-2 px-2 text-xs text-right">Avg. Share</TableHead>
                                <TableHead className="py-2 px-2 text-xs">Top Category (Shared)</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {detailedParticipantAnalytics.map(p => (
                                <TableRow key={p.name}>
                                <TableCell className="py-1.5 px-2 text-xs font-medium">{p.name}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalPaid)}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalShared)}</TableCell>
                                <TableCell className={`py-1.5 px-2 text-xs text-right font-semibold ${p.netBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                    {formatCurrency(p.netBalance)}
                                </TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{p.expensesPaidCount}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{p.expensesSharedCount}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.averageShareAmount)}</TableCell>
                                <TableCell className="py-1.5 px-2 text-xs truncate max-w-[150px]" title={p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name} (${formatCurrency(p.mostFrequentCategoryShared.amount)})` : 'N/A'}>
                                    {p.mostFrequentCategoryShared ? `${p.mostFrequentCategoryShared.name}` : 'N/A'}
                                </TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-md rounded-lg">
                <CardHeader>
                <CardTitle className="text-lg flex items-center"><PieChartIconLucide className="mr-2 h-5 w-5 text-primary"/>Spending by Category (Top 5)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={detailedCategoryAnalytics.slice(0,5)} dataKey="totalAmount" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                        {detailedCategoryAnalytics.slice(0,5).map((entry, index) => (
                        <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [formatCurrency(value), "Amount"]} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    </PieChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
            {expenseAmountDistributionData.length > 0 && (
            <Card className="shadow-md rounded-lg">
                <CardHeader>
                <CardTitle className="text-lg flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Expense Amount Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseAmountDistributionData} layout="vertical" margin={{ top: 10, right: 20, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                    <YAxis type="category" dataKey="range" width={75} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value: number) => [value, "Number of Expenses"]} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="count" name="Expenses" fill="hsl(var(--chart-4))" radius={[0, 3, 3, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
            )}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
