
"use client";

import React, { useMemo } from 'react';
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIconLucide, Users, TrendingUp, DollarSign, CalendarDays, Sigma, ListFilter,
  CalendarClock, GitFork, Award, SearchCheck, User, FileText as FileTextIcon
} from 'lucide-react';
import {
  LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { CHART_COLORS } from '@/lib/settleease/constants';
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


export default function AnalyticsTab({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
}: AnalyticsTabProps) {

  const enhancedOverallStats = useMemo(() => {
    const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
    const expenseCount = expenses.length;
    const averageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0;
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;

    if (expenseCount > 0) {
      const sortedExpenses = [...expenses].sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      firstDate = new Date(sortedExpenses[0].created_at || Date.now());
      lastDate = new Date(sortedExpenses[expenseCount - 1].created_at || Date.now());
    }

    const distinctParticipants = new Set<string>();
    expenses.forEach(exp => {
      exp.paid_by.forEach(p => distinctParticipants.add(p.personId));
      exp.shares.forEach(s => distinctParticipants.add(s.personId));
    });

    let mostExpensiveCatData: { name: string; totalAmount: number; } = { name: 'N/A', totalAmount: 0 };
    if (dynamicCategories.length > 0 && expenses.length > 0) {
        const categorySpending: Record<string, number> = {};
        expenses.forEach(exp => {
            categorySpending[exp.category] = (categorySpending[exp.category] || 0) + Number(exp.total_amount);
        });
        const sortedCategories = Object.entries(categorySpending).sort(([,a],[,b]) => b-a);
        if (sortedCategories.length > 0) {
            mostExpensiveCatData = { name: sortedCategories[0][0], totalAmount: sortedCategories[0][1] };
        }
    }


    let largestSingleExp: { description: string; amount: number; date: string } = { description: 'N/A', amount: 0, date: '' };
    if (expenseCount > 0) {
      const sortedByAmount = [...expenses].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
      largestSingleExp = {
        description: sortedByAmount[0].description,
        amount: Number(sortedByAmount[0].total_amount),
        date: new Date(sortedByAmount[0].created_at || Date.now()).toLocaleDateString()
      };
    }

    return {
      totalAmount, expenseCount, averageAmount, firstDate, lastDate,
      distinctParticipantCount: distinctParticipants.size,
      mostExpensiveCategory: mostExpensiveCatData,
      largestSingleExpense: largestSingleExp,
    };
  }, [expenses, dynamicCategories]);

  const monthlyExpenseData: MonthlyExpenseData[] = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      if (exp.created_at) {
        const monthYear = new Date(exp.created_at).toLocaleDateString('default', { year: 'numeric', month: 'short' });
        data[monthYear] = (data[monthYear] || 0) + Number(exp.total_amount);
      }
    });
    return Object.entries(data)
      .map(([month, totalAmount]) => ({ month, totalAmount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [expenses]);

  const detailedCategoryAnalytics: CategoryAnalyticsData[] = useMemo(() => {
    const data: Record<string, { totalAmount: number; expenseCount: number; expensesInCategory: Expense[] }> = {};
    expenses.forEach(exp => {
      const categoryName = exp.category || "Uncategorized";
      if (!data[categoryName]) {
        data[categoryName] = { totalAmount: 0, expenseCount: 0, expensesInCategory: [] };
      }
      data[categoryName].totalAmount += Number(exp.total_amount);
      data[categoryName].expenseCount += 1;
      data[categoryName].expensesInCategory.push(exp);
    });

    return Object.entries(data).map(([name, { totalAmount, expenseCount, expensesInCategory }]) => {
      let mostExpensiveItemData: { description: string; amount: number; date: string; } | null = null;
      if (expensesInCategory.length > 0) {
        const sortedItems = [...expensesInCategory].sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
        mostExpensiveItemData = {
          description: sortedItems[0].description,
          amount: Number(sortedItems[0].total_amount),
          date: new Date(sortedItems[0].created_at || Date.now()).toLocaleDateString()
        };
      }

      let largestPayerData: { name: string; amount: number; } | null = null;
      if (expensesInCategory.length > 0) {
        const payerAmounts: Record<string, number> = {};
        expensesInCategory.forEach(exp => {
          exp.paid_by.forEach(p => {
            payerAmounts[p.personId] = (payerAmounts[p.personId] || 0) + Number(p.amount);
          });
        });
        const sortedPayers = Object.entries(payerAmounts)
                                .map(([personId, amount]) => ({ name: peopleMap[personId] || 'Unknown', amount }))
                                .sort((a, b) => b.amount - a.amount);
        if (sortedPayers.length > 0) {
          largestPayerData = sortedPayers[0];
        }
      }

      return {
        name,
        totalAmount,
        expenseCount,
        averageAmount: expenseCount > 0 ? totalAmount / expenseCount : 0,
        Icon: getCategoryIconFromName(name),
        mostExpensiveItem: mostExpensiveItemData,
        largestPayer: largestPayerData,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [expenses, getCategoryIconFromName, peopleMap]);

  const detailedParticipantAnalytics: ParticipantAnalyticsData[] = useMemo(() => {
    return people.map(person => {
      let totalPaid = 0;
      let totalShared = 0;
      let expensesPaidCount = 0;
      let expensesSharedCount = 0;
      const categoryShares: Record<string, number> = {};

      expenses.forEach(exp => {
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

        let personSharedThisExpense = false;
        if (Array.isArray(exp.shares)) {
          exp.shares.forEach(s => {
            if (s.personId === person.id) {
              totalShared += Number(s.amount);
              personSharedThisExpense = true;
              categoryShares[exp.category] = (categoryShares[exp.category] || 0) + Number(s.amount);
            }
          });
        }
        if (personSharedThisExpense) expensesSharedCount++;
      });

      const sortedCategoryShares = Object.entries(categoryShares).sort(([, a], [, b]) => b - a);
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
  }, [expenses, people]);

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

    expenses.forEach(exp => {
      const amount = Number(exp.total_amount);
      for (const range of ranges) {
        if (amount >= range.min && amount <= range.max) {
          distribution[range.label]++;
          break;
        }
      }
    });
    return Object.entries(distribution).map(([range, count]) => ({ range, count })).filter(d => d.count > 0);
  }, [expenses]);

  const shareVsPaidData = useMemo(() => {
    if (!people.length) return [];
    return people.map(person => {
      let totalPaidByPerson = 0;
      let totalShareForPerson = 0;
      expenses.forEach(expense => {
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
  }, [expenses, people, peopleMap]);

  const spendingByDayOfWeekData: SpendingByDayOfWeekData[] = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const spending: Record<string, number> = days.reduce((acc, day) => { acc[day] = 0; return acc; }, {} as Record<string, number>);
    expenses.forEach(exp => {
      if (exp.created_at) {
        const dayOfWeek = days[new Date(exp.created_at).getDay()];
        spending[dayOfWeek] = (spending[dayOfWeek] || 0) + Number(exp.total_amount);
      }
    });
    return days.map(day => ({ day, totalAmount: spending[day] })).filter(d => d.totalAmount > 0);
  }, [expenses]);

  const splitMethodDistributionData: SplitMethodDistributionData[] = useMemo(() => {
    const counts: Record<string, number> = { 'equal': 0, 'unequal': 0, 'itemwise': 0 };
    expenses.forEach(exp => {
      counts[exp.split_method] = (counts[exp.split_method] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([method, count]) => ({ method: method.charAt(0).toUpperCase() + method.slice(1), count }))
      .filter(d => d.count > 0);
  }, [expenses]);

  const topExpensesData: TopExpenseData[] = useMemo(() => {
    return [...expenses]
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount))
      .slice(0, 10); // Top 10 expenses
  }, [expenses]);


  if (expenses.length === 0) {
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
        {/* Overall Stats - Enhanced */}
        <Card className="shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Sigma className="mr-2 h-5 w-5 text-primary"/>Overall Snapshot</CardTitle>
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
            <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5">
              <p className="text-xs text-muted-foreground">Participants</p>
              <p className="text-lg font-bold">{enhancedOverallStats.distinctParticipantCount}</p>
            </div>
            <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5 col-span-2 md:col-span-1">
              <p className="text-xs text-muted-foreground">Top Category</p>
              <p className="text-base font-semibold truncate" title={enhancedOverallStats.mostExpensiveCategory.name}>
                {enhancedOverallStats.mostExpensiveCategory.name}
              </p>
              <p className="text-xs text-muted-foreground">{formatCurrency(enhancedOverallStats.mostExpensiveCategory.totalAmount)}</p>
            </div>
            <div className="p-3 bg-card/50 rounded-md shadow-sm space-y-0.5 col-span-2 md:col-span-1">
              <p className="text-xs text-muted-foreground">Largest Expense</p>
              <p className="text-base font-semibold truncate" title={enhancedOverallStats.largestSingleExpense.description}>
                {enhancedOverallStats.largestSingleExpense.description}
              </p>
              <p className="text-xs text-muted-foreground">{formatCurrency(enhancedOverallStats.largestSingleExpense.amount)} on {enhancedOverallStats.largestSingleExpense.date}</p>
            </div>
             <div className="p-3 bg-card/50 rounded-md shadow-sm col-span-2 md:col-span-3 space-y-0.5">
              <p className="text-xs text-muted-foreground">Date Range</p>
              <p className="text-sm font-semibold">
                {enhancedOverallStats.firstDate ? enhancedOverallStats.firstDate.toLocaleDateString() : 'N/A'} - {enhancedOverallStats.lastDate ? enhancedOverallStats.lastDate.toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Row for Time-based and Share vs Paid */}
        <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-md rounded-lg">
            <CardHeader>
                <CardTitle className="text-lg flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-primary"/>Expenses Over Time (Monthly)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyExpenseData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
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
            <ShareVsPaidChart shareVsPaidData={shareVsPaidData} />
        </div>

        {/* Row for Day of Week Spending and Split Method Distribution */}
        <div className="grid md:grid-cols-2 gap-6">
            {spendingByDayOfWeekData.length > 0 && (
            <Card className="shadow-md rounded-lg">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center"><CalendarClock className="mr-2 h-5 w-5 text-primary"/>Spending by Day of Week</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendingByDayOfWeekData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                    <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}/>
                    <YAxis tickFormatter={(value) => formatCurrencyForAxis(value, '₹')} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}/>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [formatCurrency(value), "Total Spent"]}/>
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="totalAmount" name="Total Spent" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} barSize={30}/>
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
                <CardContent className="h-[300px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={splitMethodDistributionData} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                        {splitMethodDistributionData.map((entry, index) => (
                        <RechartsCell key={`cell-split-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [value, "Expenses"]}/>
                    <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                    </PieChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
            )}
        </div>
        
        {/* Top N Expenses Overall */}
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

        {/* Detailed Category Analytics Table */}
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
        
        {/* Detailed Participant Analytics Table */}
        <Card className="shadow-md rounded-lg">
            <CardHeader>
            <CardTitle className="text-lg flex items-center"><User className="mr-2 h-5 w-5 text-primary"/>Participant Deep Dive (Based on Expenses)</CardTitle>
            <CardDescription className="text-xs">This shows financial details derived purely from expense records, not reflecting settlements.</CardDescription>
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

        {/* Existing Charts (Category Pie / Expense Amount Dist.) - Kept for completeness but might be redundant with new tables */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><PieChartIconLucide className="mr-2 h-5 w-5 text-primary"/>Spending by Category (Top 5)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={detailedCategoryAnalytics.slice(0,5)} dataKey="totalAmount" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                    {detailedCategoryAnalytics.slice(0,5).map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [formatCurrency(value), "Amount"]} />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {expenseAmountDistributionData.length > 0 && (
          <Card className="shadow-md rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Expense Amount Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseAmountDistributionData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))"/>
                  <XAxis type="number" allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis type="category" dataKey="range" width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value: number) => [value, "Number of Expenses"]} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="count" name="Expenses" fill="hsl(var(--chart-4))" radius={[0, 3, 3, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        </div>

      </div>
    </ScrollArea>
  );
}

