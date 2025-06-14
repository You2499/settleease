
"use client";

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';
import { ArrowRight, FileText, Settings2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import ExpenseDetailModal from './ExpenseDetailModal';

import { formatCurrency, CHART_COLORS, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease';
import type { Person, Expense, Category } from '@/lib/settleease';

interface DashboardViewProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

export default function DashboardView({ expenses, people, peopleMap, dynamicCategories, getCategoryIconFromName }: DashboardViewProps) {
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const settlement = useMemo(() => {
    if (people.length === 0 || expenses.length === 0) return [];
    const balances: Record<string, number> = {};
    people.forEach(p => balances[p.id] = 0);

    expenses.forEach(expense => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach(payment => {
          balances[payment.personId] = (balances[payment.personId] || 0) + Number(payment.amount);
        });
      }
      if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            balances[share.personId] = (balances[share.personId] || 0) - Number(share.amount);
          });
      }
    });

    const debtors = Object.entries(balances).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => a.amount - b.amount);
    const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => b.amount - a.amount);
    const transactions: { from: string, to: string, amount: number }[] = [];
    let debtorIdx = 0, creditorIdx = 0;
    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx], creditor = creditors[creditorIdx];
      const amountToSettle = Math.min(-debtor.amount, creditor.amount);
      if (amountToSettle > 0.01) {
        transactions.push({ from: debtor.id, to: creditor.id, amount: amountToSettle });
        debtor.amount += amountToSettle;
        creditor.amount -= amountToSettle;
      }
      if (Math.abs(debtor.amount) < 0.01) debtorIdx++;
      if (Math.abs(creditor.amount) < 0.01) creditorIdx++;
    }
    return transactions;
  }, [expenses, people]);

  const shareVsPaidData = useMemo(() => {
    if (!people.length) return [];

    return people.map(person => {
      let totalPaidByPerson = 0;
      let totalShareForPerson = 0;

      expenses.forEach(expense => {
        if (Array.isArray(expense.paid_by)) {
          expense.paid_by.forEach(payment => {
            if (payment.personId === person.id) {
              totalPaidByPerson += Number(payment.amount);
            }
          });
        }
        if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            if (share.personId === person.id) {
              totalShareForPerson += Number(share.amount);
            }
          });
        }
      });
      return {
        name: peopleMap[person.id] || person.name,
        paid: totalPaidByPerson,
        share: totalShareForPerson,
      };
    }).filter(d => d.paid > 0 || d.share > 0 || people.length <= 5);
  }, [expenses, people, peopleMap]);
  
  const yAxisDomainTop = useMemo(() => {
      const overallMax = shareVsPaidData.reduce((max, item) => Math.max(max, item.paid, item.share), 0);
      const paddedMax = Math.max(overallMax, 500) * 1.1;
      return Math.ceil(paddedMax / 50) * 50;
  }, [shareVsPaidData]);


  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      const categoryName = exp.category || "Uncategorized";
      data[categoryName] = (data[categoryName] || 0) + Number(exp.total_amount);
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount: Number(amount) })).filter(d => d.amount > 0);
  }, [expenses]);

  const handleExpenseCardClick = (expense: Expense) => {
    setSelectedExpenseForModal(expense);
    setIsExpenseModalOpen(true);
  };

  if (people.length === 0 && expenses.length === 0) {
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-primary">Welcome to SettleEase!</CardTitle></CardHeader>
        <CardContent className="space-y-3"><FileText className="mx-auto h-12 w-12 text-primary/70" />
          <p className="text-md text-muted-foreground">No people added and no expenses recorded yet.</p>
          <p className="text-sm">Navigate to "Manage People" to add participants, then to "Add Expense" to start managing your group finances.</p>
        </CardContent>
      </Card>
    );
  }
  if (expenses.length === 0) {
     return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-primary">Ready to Settle?</CardTitle></CardHeader>
        <CardContent className="space-y-3"><FileText className="mx-auto h-12 w-12 text-primary/70" />
          <p className="text-md text-muted-foreground">No expenses recorded yet.</p>
          <p className="text-sm">Navigate to "Add Expense" to start managing your group finances.</p>
           {people.length === 0 && <p className="text-sm mt-2">First, go to "Manage People" to add participants to your group.</p>}
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl"><ArrowRight className="mr-2 h-5 w-5 text-primary" /> Settlement Summary</CardTitle>
          <CardDescription className="text-sm">Minimum transactions required to settle all debts.</CardDescription>
        </CardHeader>
        <CardContent>
          {settlement.length > 0 ? (
            <ul className="space-y-1.5">
              {settlement.map((txn, i) => (
                <li key={i} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-md text-sm">
                  <span className="font-medium text-foreground">{peopleMap[txn.from] || 'Unknown'}</span>
                  <ArrowRight className="h-4 w-4 text-accent mx-2 shrink-0" />
                  <span className="font-medium text-foreground">{peopleMap[txn.to] || 'Unknown'}</span>
                  <span className="ml-auto font-semibold text-primary pl-2">{formatCurrency(txn.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (<p className="text-sm text-muted-foreground p-2">All debts are settled, or no expenses to settle yet!</p>)}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Share vs. Paid Comparison</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {shareVsPaidData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shareVsPaidData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 0,
                    bottom: 20
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval={0} angle={shareVsPaidData.length > 4 ? -30 : 0} textAnchor={shareVsPaidData.length > 4 ? "end" : "middle"} height={shareVsPaidData.length > 4 ? 50: 30} />
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'paid' ? 'Total Paid' : 'Total Share']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} barSize={Math.min(20, 60 / shareVsPaidData.length)} />
                  <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} barSize={Math.min(20, 60 / shareVsPaidData.length)} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for comparison chart.</p>)}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Expenses by Category</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                  <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} outerRadius={Math.min(80, (typeof window !== "undefined" ? window.innerWidth : 300) / 8)} fill="#8884d8" dataKey="amount" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                    {expensesByCategory.map((entry, index) => (<RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for category chart.</p>)}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl"><FileText className="mr-2 h-5 w-5 text-primary" /> Expense Log</CardTitle>
          <CardDescription className="text-sm">A list of all recorded expenses, most recent first. Click an expense for details.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ScrollArea className="max-h-[350px] pr-2">
              <ul className="space-y-2.5">
                {expenses.map(expense => {
                  const CategoryIcon = getCategoryIconFromName(expense.category);
                  const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
                    ? "Multiple Payers"
                    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
                      ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
                      : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));

                  return (
                    <li key={expense.id} onClick={() => handleExpenseCardClick(expense)} className="cursor-pointer">
                      <Card className="bg-card/70 hover:bg-card/90 transition-all rounded-md">
                        <CardHeader className="pb-1.5 pt-2.5 px-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-[0.9rem] font-semibold leading-tight">{expense.description}</CardTitle>
                            <span className="text-md font-bold text-primary">{formatCurrency(Number(expense.total_amount))}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center"><CategoryIcon className="mr-1 h-3 w-3" /> {expense.category}</div>
                            <span>Paid by: <span className="font-medium">{displayPayerText}</span></span>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          ) : (<p className="text-sm text-muted-foreground p-2">No expenses recorded yet.</p>)}
        </CardContent>
      </Card>
      {selectedExpenseForModal && (
        <ExpenseDetailModal
          expense={selectedExpenseForModal}
          isOpen={isExpenseModalOpen}
          onOpenChange={setIsExpenseModalOpen}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
        />
      )}
    </div>
  );
}
