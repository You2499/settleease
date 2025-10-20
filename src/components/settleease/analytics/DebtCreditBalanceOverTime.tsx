"use client";

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatCurrencyForAxis } from '@/lib/settleease/utils';
import { ANALYTICS_STYLES, createEmptyState } from '@/lib/settleease/analytics-styles';
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
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            <TrendingUp className={ANALYTICS_STYLES.icon} />
            Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState("Balance Over Time", TrendingUp, "Balance tracking is available in Personal view only.")}
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className={ANALYTICS_STYLES.card}>
        <CardHeader className={ANALYTICS_STYLES.header}>
          <CardTitle className={ANALYTICS_STYLES.title}>
            {isPositive ? <TrendingUp className={ANALYTICS_STYLES.icon} /> : <TrendingDown className={ANALYTICS_STYLES.icon} />}
            Your Balance Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className={ANALYTICS_STYLES.chartContent}>
          {createEmptyState("Your Balance Over Time", isPositive ? TrendingUp : TrendingDown, "No balance history available.")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={ANALYTICS_STYLES.card}>
      <CardHeader className={ANALYTICS_STYLES.header}>
        <CardTitle className={ANALYTICS_STYLES.title}>
          {isPositive ? <TrendingUp className={ANALYTICS_STYLES.icon} /> : <TrendingDown className={ANALYTICS_STYLES.icon} />}
          Your Balance Over Time
        </CardTitle>
      </CardHeader>
      <CardContent className={ANALYTICS_STYLES.chartContent}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={ANALYTICS_STYLES.chartMargins}>
            <CartesianGrid {...ANALYTICS_STYLES.grid} />
            <XAxis 
              dataKey="displayWeek" 
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <YAxis 
              tickFormatter={(value) => formatCurrencyForAxis(value, '₹')}
              tick={ANALYTICS_STYLES.axisTick} 
            />
            <Tooltip 
              {...ANALYTICS_STYLES.tooltip}
              formatter={(value: number) => [
                formatCurrency(value), 
                value >= 0 ? 'You are owed' : 'You owe'
              ]}
            />
            <Legend wrapperStyle={ANALYTICS_STYLES.legend} />
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
              stroke={isPositive ? ANALYTICS_STYLES.positiveColor : ANALYTICS_STYLES.negativeColor} 
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