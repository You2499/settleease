"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import type { Expense, SettlementPayment } from '@/lib/settleease/types';

interface DebtCreditBalanceOverTimeProps {
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  analyticsViewMode: 'group' | 'personal';
  selectedPersonIdForAnalytics?: string | null;
  peopleMap: Record<string, string>;
}

export default function DebtCreditBalanceOverTime({ 
  expenses, 
  settlementPayments,
  analyticsViewMode, 
  selectedPersonIdForAnalytics,
  peopleMap
}: DebtCreditBalanceOverTimeProps) {
  
  const chartData = useMemo(() => {
    if (analyticsViewMode === 'personal' && !selectedPersonIdForAnalytics) return [];

    // Combine expenses and settlements with dates
    const allTransactions: Array<{
      date: Date;
      type: 'expense' | 'settlement';
      data: Expense | SettlementPayment;
    }> = [];

    expenses.forEach(exp => {
      if (exp.created_at) {
        allTransactions.push({
          date: new Date(exp.created_at),
          type: 'expense',
          data: exp
        });
      }
    });

    settlementPayments.forEach(settlement => {
      if (settlement.settled_at) {
        allTransactions.push({
          date: new Date(settlement.settled_at),
          type: 'settlement',
          data: settlement
        });
      }
    });

    // Sort by date
    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    const balanceOverTime: Array<{
      date: string;
      displayDate: string;
      balance: number;
    }> = [];

    let currentBalance = 0;

    allTransactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        const exp = transaction.data as Expense;
        
        if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
          // Calculate net effect for this person
          const paidAmount = exp.paid_by.find(p => p.personId === selectedPersonIdForAnalytics)?.amount || 0;
          const shareAmount = exp.shares.find(s => s.personId === selectedPersonIdForAnalytics)?.amount || 0;
          const celebrationAmount = exp.celebration_contribution?.personId === selectedPersonIdForAnalytics 
            ? Number(exp.celebration_contribution.amount) : 0;
          
          const netEffect = Number(paidAmount) - (Number(shareAmount) + celebrationAmount);
          currentBalance += netEffect;
        }
      } else if (transaction.type === 'settlement') {
        const settlement = transaction.data as SettlementPayment;
        
        if (analyticsViewMode === 'personal' && selectedPersonIdForAnalytics) {
          if (settlement.debtor_id === selectedPersonIdForAnalytics) {
            currentBalance -= Number(settlement.amount_settled);
          } else if (settlement.creditor_id === selectedPersonIdForAnalytics) {
            currentBalance += Number(settlement.amount_settled);
          }
        }
      }

      balanceOverTime.push({
        date: transaction.date.toLocaleDateString('en-CA'),
        displayDate: transaction.date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        balance: currentBalance
      });
    });

    // Group by week to reduce data points
    const weeklyBalances: Record<string, number> = {};
    balanceOverTime.forEach(point => {
      const date = new Date(point.date);
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const weekStart = new Date(date.setDate(diff));
      const weekKey = weekStart.toLocaleDateString('en-CA');
      
      weeklyBalances[weekKey] = point.balance; // Use latest balance for the week
    });

    return Object.entries(weeklyBalances)
      .map(([week, balance]) => ({
        week,
        balance,
        displayWeek: new Date(week).toLocaleDateString('default', { month: 'short', day: 'numeric' })
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-12); // Show last 12 weeks
  }, [expenses, settlementPayments, analyticsViewMode, selectedPersonIdForAnalytics]);

  const currentBalance = chartData.length > 0 ? chartData[chartData.length - 1].balance : 0;
  const isPositive = currentBalance >= 0;

  if (analyticsViewMode === 'group') {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Balance tracking is available in Personal view only.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="px-4 py-3">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            {isPositive ? <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" /> : <TrendingDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
            Your Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
          <p className="text-muted-foreground text-xs sm:text-sm">
            No balance history available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg rounded-lg">
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          {isPositive ? <TrendingUp className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" /> : <TrendingDown className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
          Your Balance Over Time
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Current balance: <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(currentBalance)}
          </span> {isPositive ? '(you are owed)' : '(you owe)'}
        </div>
      </CardHeader>
      <CardContent className="h-[250px] sm:h-[300px] p-4 pt-0 pb-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="displayWeek" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
            />
            <YAxis 
              tickFormatter={(value) => formatCurrencyForAxis(value, '₹')}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                borderColor: 'hsl(var(--border))', 
                borderRadius: 'var(--radius)', 
                fontSize: '11px', 
                padding: '8px', 
                color: 'hsl(var(--popover-foreground))' 
              }} 
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number) => [
                formatCurrency(value), 
                value >= 0 ? 'You are owed' : 'You owe'
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }} />
            {/* Zero line */}
            <Line 
              type="monotone" 
              dataKey={() => 0} 
              name="Break Even"
              stroke="hsl(var(--muted-foreground))" 
              strokeWidth={1} 
              strokeDasharray="3 3"
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              name="Your Balance"
              stroke={isPositive ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"} 
              strokeWidth={2} 
              dot={{ r: 3 }} 
              activeDot={{ r: 5 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}