
"use client";

import React, { useMemo } from 'react';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIconLucide, Users, TrendingUp, DollarSign, CalendarDays, Sigma, ListFilter } from 'lucide-react';
import {
  LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { CHART_COLORS } from '@/lib/settleease/constants';
import type { Expense, Person, Category as DynamicCategory } from '@/lib/settleease/types';
import ShareVsPaidChart from './dashboard/ShareVsPaidChart'; // Added import

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

interface CategoryAnalyticsData {
  name: string;
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface ParticipantAnalyticsData {
  name: string;
  totalPaid: number;
  totalShared: number;
  netBalance: number;
}

interface ExpenseAmountDistributionData {
  range: string;
  count: number;
}

export default function AnalyticsTab({
  expenses,
  people,
  peopleMap,
  dynamicCategories,
  getCategoryIconFromName,
}: AnalyticsTabProps) {

  const overallStats = useMemo(() => {
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
    
    return { totalAmount, expenseCount, averageAmount, firstDate, lastDate };
  }, [expenses]);

  const monthlyExpenseData: MonthlyExpenseData[] = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      if (exp.created_at) {
        const monthYear = new Date(exp.created_at).toLocaleDateString('default', { year: 'numeric', month: 'short' });
        data[monthYear] = (data[monthYear] || 0) + Number(exp.total_amount);
      }
    });
    // Sort by date for the line chart
    return Object.entries(data)
      .map(([month, totalAmount]) => ({ month, totalAmount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [expenses]);

  const categoryAnalyticsData: CategoryAnalyticsData[] = useMemo(() => {
    const data: Record<string, { totalAmount: number; expenseCount: number }> = {};
    expenses.forEach(exp => {
      const categoryName = exp.category || "Uncategorized";
      if (!data[categoryName]) {
        data[categoryName] = { totalAmount: 0, expenseCount: 0 };
      }
      data[categoryName].totalAmount += Number(exp.total_amount);
      data[categoryName].expenseCount += 1;
    });
    return Object.entries(data).map(([name, { totalAmount, expenseCount }]) => ({
      name,
      totalAmount,
      expenseCount,
      averageAmount: expenseCount > 0 ? totalAmount / expenseCount : 0,
      Icon: getCategoryIconFromName(name),
    })).sort((a,b) => b.totalAmount - a.totalAmount);
  }, [expenses, getCategoryIconFromName]);

  const participantAnalyticsData: ParticipantAnalyticsData[] = useMemo(() => {
    return people.map(person => {
      let totalPaid = 0;
      let totalShared = 0;
      expenses.forEach(exp => {
        if (Array.isArray(exp.paid_by)) {
          exp.paid_by.forEach(p => {
            if (p.personId === person.id) totalPaid += Number(p.amount);
          });
        }
        if (Array.isArray(exp.shares)) {
          exp.shares.forEach(s => {
            if (s.personId === person.id) totalShared += Number(s.amount);
          });
        }
      });
      return {
        name: person.name,
        totalPaid,
        totalShared,
        netBalance: totalPaid - totalShared,
      };
    }).sort((a,b) => b.totalPaid - a.totalPaid);
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
        {/* Overall Stats */}
        <Card className="shadow-md rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center"><Sigma className="mr-2 h-5 w-5 text-primary"/>Overall Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-card/50 rounded-md shadow-sm">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-accent"/>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-xl font-bold">{formatCurrency(overallStats.totalAmount)}</p>
            </div>
            <div className="p-3 bg-card/50 rounded-md shadow-sm">
              <ListFilter className="h-6 w-6 mx-auto mb-1 text-accent"/>
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-xl font-bold">{overallStats.expenseCount}</p>
            </div>
            <div className="p-3 bg-card/50 rounded-md shadow-sm">
               <DollarSign className="h-6 w-6 mx-auto mb-1 text-accent"/>
              <p className="text-xs text-muted-foreground">Avg. Expense</p>
              <p className="text-xl font-bold">{formatCurrency(overallStats.averageAmount)}</p>
            </div>
             <div className="p-3 bg-card/50 rounded-md shadow-sm col-span-2 md:col-span-1">
              <CalendarDays className="h-6 w-6 mx-auto mb-1 text-accent"/>
              <p className="text-xs text-muted-foreground">Date Range</p>
              <p className="text-sm font-semibold">
                {overallStats.firstDate ? overallStats.firstDate.toLocaleDateString() : 'N/A'} - {overallStats.lastDate ? overallStats.lastDate.toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Over Time */}
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
        
        {/* Share vs. Paid Comparison Chart - Moved from Dashboard */}
        <ShareVsPaidChart shareVsPaidData={shareVsPaidData} />

        {/* Detailed Category Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md rounded-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><PieChartIconLucide className="mr-2 h-5 w-5 text-primary"/>Spending by Category (Top 5)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryAnalyticsData.slice(0,5)} dataKey="totalAmount" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                    {categoryAnalyticsData.slice(0,5).map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }} formatter={(value:number) => [formatCurrency(value), "Amount"]} />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-md rounded-lg flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center"><ListFilter className="mr-2 h-5 w-5 text-primary"/>Category Details</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow min-h-0">
                <ScrollArea className="h-[260px]">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="py-2 px-2 text-xs">Category</TableHead>
                            <TableHead className="py-2 px-2 text-xs text-right">Total</TableHead>
                            <TableHead className="py-2 px-2 text-xs text-right">#</TableHead>
                            <TableHead className="py-2 px-2 text-xs text-right">Avg.</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {categoryAnalyticsData.map(cat => (
                            <TableRow key={cat.name}>
                            <TableCell className="py-1.5 px-2 text-xs font-medium flex items-center"><cat.Icon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>{cat.name}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(cat.totalAmount)}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right">{cat.expenseCount}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(cat.averageAmount)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Participant Financial Summary */}
        <Card className="shadow-md rounded-lg">
            <CardHeader>
            <CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-primary"/>Participant Financial Summary (Expenses Only)</CardTitle>
            <CardDescription className="text-xs">This shows amounts paid and shared from expenses, not reflecting recorded settlements.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-auto max-h-[300px]">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="py-2 px-2 text-xs">Participant</TableHead>
                            <TableHead className="py-2 px-2 text-xs text-right">Total Paid</TableHead>
                            <TableHead className="py-2 px-2 text-xs text-right">Total Shared (Owed)</TableHead>
                            <TableHead className="py-2 px-2 text-xs text-right">Net (Paid - Shared)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {participantAnalyticsData.map(p => (
                            <TableRow key={p.name}>
                            <TableCell className="py-1.5 px-2 text-xs font-medium">{p.name}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalPaid)}</TableCell>
                            <TableCell className="py-1.5 px-2 text-xs text-right">{formatCurrency(p.totalShared)}</TableCell>
                            <TableCell className={`py-1.5 px-2 text-xs text-right font-semibold ${p.netBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {formatCurrency(p.netBalance)}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>

        {/* Expense Amount Distribution */}
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
    </ScrollArea>
  );
}
