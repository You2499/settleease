"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Users, FileText, TrendingUp, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import {
  calculateNetBalances,
  calculatePairwiseTransactions,
  calculateSimplifiedTransactions,
} from "@/lib/settleease/settlementCalculations";
import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
  Category,
  UserRole,
} from "@/lib/settleease/types";

interface ComprehensiveDebugProps {
  people: Person[];
  expenses: Expense[];
  settlementPayments: SettlementPayment[];
  peopleMap: Record<string, string>;
  categories: Category[];
  userRole: UserRole;
  isInSheet?: boolean; // Flag to indicate if rendered inside a Sheet
}

type PersonBalanceRow = {
  totalPaid: number;
  totalOwed: number;
  settledAsDebtor: number;
  settledAsCreditor: number;
  netBalance: number;
};

export default function ComprehensiveDebug({
  people,
  expenses,
  settlementPayments,
  peopleMap,
  categories,
  userRole,
  isInSheet = false,
}: ComprehensiveDebugProps) {
  const [showBalancedPeople, setShowBalancedPeople] = useState(false);

  // Calculate person balances
  const personBalances: Record<string, PersonBalanceRow> = useMemo(() => {
    const balances: Record<string, PersonBalanceRow> = {};
    people.forEach((p) => {
      balances[p.id] = {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };
    });

    expenses.forEach((expense) => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach((payment) => {
          if (balances[payment.personId]) {
            balances[payment.personId].totalPaid += Number(payment.amount);
          }
        });
      }
      if (Array.isArray(expense.shares)) {
        expense.shares.forEach((share) => {
          if (balances[share.personId]) {
            balances[share.personId].totalOwed += Number(share.amount);
          }
        });
      }
      if (expense.celebration_contribution && expense.celebration_contribution.amount > 0) {
        const cid = expense.celebration_contribution.personId;
        if (balances[cid]) {
          balances[cid].totalOwed += Number(expense.celebration_contribution.amount);
        }
      }
    });

    settlementPayments.forEach((payment) => {
      if (balances[payment.debtor_id]) {
        balances[payment.debtor_id].settledAsDebtor += Number(payment.amount_settled);
      }
      if (balances[payment.creditor_id]) {
        balances[payment.creditor_id].settledAsCreditor += Number(payment.amount_settled);
      }
    });

    const netBalances = calculateNetBalances(people, expenses, settlementPayments);
    Object.keys(balances).forEach((pid) => {
      balances[pid].netBalance = netBalances[pid] || 0;
    });

    return balances;
  }, [people, expenses, settlementPayments]);

  // Calculate transactions
  const allSimplified: CalculatedTransaction[] = useMemo(
    () => calculateSimplifiedTransactions(people, expenses, settlementPayments),
    [people, expenses, settlementPayments]
  );
  
  const allPairwise: CalculatedTransaction[] = useMemo(
    () => calculatePairwiseTransactions(people, expenses, settlementPayments),
    [people, expenses, settlementPayments]
  );

  const pairwiseSortedForDisplay = useMemo(() => {
    const copy = [...allPairwise];
    copy.sort(
      (a, b) =>
        (peopleMap[a.from] || "").localeCompare(peopleMap[b.from] || "") ||
        (peopleMap[a.to] || "").localeCompare(peopleMap[b.to] || "")
    );
    return copy;
  }, [allPairwise, peopleMap]);

  const unpaidSimplified = useMemo(() => {
    return allSimplified.map((txn) => {
      const settledAmount = settlementPayments
        .filter((p) => p.debtor_id === txn.from && p.creditor_id === txn.to)
        .reduce((sum, p) => sum + Number(p.amount_settled), 0);
      const outstanding = Number(txn.amount) - settledAmount;
      return { ...txn, settledAmount, outstanding };
    });
  }, [allSimplified, settlementPayments]);

  const filteredPeople = useMemo(() => {
    if (showBalancedPeople) return people;
    return people.filter((p) => {
      const b = personBalances[p.id];
      return b && Math.abs(b.netBalance) > 0.01;
    });
  }, [people, personBalances, showBalancedPeople]);

  // Per-person detailed breakdown
  const perPerson = useMemo(() => {
    return people.map((person) => {
      const relevantExpenses = expenses
        .filter((e) => {
          const wasPayer = Array.isArray(e.paid_by) ? e.paid_by.some((p) => p.personId === person.id) : false;
          const hadShare = Array.isArray(e.shares) ? e.shares.some((s) => s.personId === person.id) : false;
          const hadCelebration = e.celebration_contribution?.personId === person.id;
          return wasPayer || hadShare || hadCelebration;
        })
        .map((e) => {
          const amountPaid = Array.isArray(e.paid_by)
            ? Number(e.paid_by.find((p) => p.personId === person.id)?.amount || 0)
            : 0;
          const shareAmount = Array.isArray(e.shares)
            ? Number(e.shares.find((s) => s.personId === person.id)?.amount || 0)
            : 0;
          const celebrationAmount =
            e.celebration_contribution?.personId === person.id
              ? Number(e.celebration_contribution.amount || 0)
              : 0;
          const totalOwed = shareAmount + celebrationAmount;
          const netForExpense = amountPaid - totalOwed;
          return {
            id: e.id,
            description: e.description,
            created_at: e.created_at,
            total_amount: e.total_amount,
            amountPaid,
            shareAmount,
            celebrationAmount,
            netForExpense,
          };
        });

      const debtsSimplified = allSimplified.filter((t) => t.from === person.id);
      const creditsSimplified = allSimplified.filter((t) => t.to === person.id);
      const recordedPayments = settlementPayments.filter(
        (sp) => sp.debtor_id === person.id || sp.creditor_id === person.id
      );

      return {
        person,
        personSummary: personBalances[person.id],
        relevantExpenses,
        debtsSimplified,
        creditsSimplified,
        recordedPayments,
      };
    });
  }, [people, expenses, personBalances, allSimplified, settlementPayments]);

  // Step 3 filtered view (modal-like)
  const step3Filtered = useMemo(() => {
    const visibleIds = new Set((showBalancedPeople ? people : filteredPeople).map((p) => p.id));
    const directDebts = pairwiseSortedForDisplay
      .filter((t) => t.amount > 0.01)
      .filter((t) => visibleIds.has(t.from) || visibleIds.has(t.to));
    const simplifiedFiltered = unpaidSimplified.filter((t) => visibleIds.has(t.from) && visibleIds.has(t.to));
    const efficiency = directDebts.length > 0
      ? Math.round((1 - simplifiedFiltered.length / directDebts.length) * 100)
      : 0;
    return { directDebts, simplifiedFiltered, efficiency };
  }, [showBalancedPeople, people, filteredPeople, pairwiseSortedForDisplay, unpaidSimplified]);

  // Build full debug object
  const fullDebug = useMemo(() => {
    return {
      generatedAt: new Date().toISOString(),
      ui: {
        userRole,
        canMarkAsPaid: userRole === "admin",
        showBalancedPeople,
      },
      counts: {
        people: people.length,
        expenses: expenses.length,
        settlementPayments: settlementPayments.length,
        pairwiseTransactions: allPairwise.length,
        simplifiedTransactions: allSimplified.length,
      },
      overviewDescriptions: {
        simplifyOn: "Minimum transactions required to settle all debts.",
        simplifyOff: "Detailed pairwise debts reflecting direct expense involvements and payments.",
      },
      personBalances,
      filteredPeopleIdsWhenHidingBalanced: filteredPeople.map((p) => p.id),
      transactions: {
        pairwise: allPairwise,
        pairwiseSortedForDisplay,
        simplified: allSimplified,
        simplifiedWithSettlement: unpaidSimplified,
        step3Filtered: {
          directDebts: step3Filtered.directDebts,
          simplifiedFiltered: step3Filtered.simplifiedFiltered,
          efficiencyPercent: step3Filtered.efficiency,
        },
      },
      categories,
      perPerson,
      settlementPayments,
      expenses,
    };
  }, [people, expenses, settlementPayments, allPairwise, allSimplified, personBalances, categories, userRole, showBalancedPeople, filteredPeople, pairwiseSortedForDisplay, unpaidSimplified, step3Filtered, perPerson]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(fullDebug, null, 2));
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(fullDebug, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settleease-debug-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={isInSheet ? "shadow-none border-0" : "shadow-lg"}>
      <CardHeader className={isInSheet ? "px-4 py-4" : ""}>
        <div className="flex flex-col gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold">Debug Information</CardTitle>
            <CardDescription className="text-sm">
              Comprehensive view of all calculations and data
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalancedPeople((s) => !s)}
              className="w-full sm:w-auto justify-start"
            >
              {showBalancedPeople ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide Balanced
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show All
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} className="w-full sm:w-auto justify-start">
              <Copy className="mr-2 h-4 w-4" />
              Copy JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="w-full sm:w-auto justify-start">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isInSheet ? "px-4 pb-4" : ""}>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-0.5 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">Overview</TabsTrigger>
            <TabsTrigger value="balances" className="text-xs sm:text-sm px-2 py-2">Balances</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm px-2 py-2">Transactions</TabsTrigger>
            <TabsTrigger value="perPerson" className="text-xs sm:text-sm px-2 py-2">Per Person</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm px-2 py-2">Expenses</TabsTrigger>
            <TabsTrigger value="json" className="text-xs sm:text-sm px-2 py-2">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    People
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-2xl font-bold">{people.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredPeople.length} with outstanding balances
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-2xl font-bold">{expenses.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {formatCurrency(expenses.reduce((sum, e) => sum + Number(e.total_amount), 0))}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    Settlements
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-2xl font-bold">{settlementPayments.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {formatCurrency(settlementPayments.reduce((sum, p) => sum + Number(p.amount_settled), 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="px-3 pt-3 pb-2">
                <CardTitle className="text-base">Transaction Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Pairwise Transactions</div>
                    <div className="text-2xl font-bold">{allPairwise.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Direct debts between people</p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Simplified Transactions</div>
                    <div className="text-2xl font-bold">{allSimplified.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {allPairwise.length > 0 
                        ? `${Math.round((1 - allSimplified.length / allPairwise.length) * 100)}% reduction`
                        : "No transactions"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="space-y-3 mt-3">
            <div className="text-sm text-muted-foreground">
              Showing {filteredPeople.length} of {people.length} people
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPeople.map((p) => {
                const b = personBalances[p.id];
                const isCreditor = b?.netBalance > 0.01;
                const isDebtor = b?.netBalance < -0.01;
                const isBalanced = !isCreditor && !isDebtor;
                
                return (
                  <Card key={p.id}>
                    <CardHeader className="pb-2 px-3 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base truncate">{p.name}</CardTitle>
                        {isBalanced ? (
                          <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-foreground text-xs flex-shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Balanced
                          </Badge>
                        ) : isCreditor ? (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-xs flex-shrink-0">
                            Receives
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-xs flex-shrink-0">
                            Pays
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 px-3 pb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Paid</span>
                        <span className="font-medium text-green-600">+{formatCurrency(b?.totalPaid || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Owed</span>
                        <span className="font-medium text-red-600">-{formatCurrency(b?.totalOwed || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Settled (Paid)</span>
                        <span className="font-medium">-{formatCurrency(b?.settledAsDebtor || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Settled (Received)</span>
                        <span className="font-medium">+{formatCurrency(b?.settledAsCreditor || 0)}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm font-bold">
                          <span>Net Balance</span>
                          <span className={isCreditor ? "text-green-600" : isDebtor ? "text-red-600" : ""}>
                            {formatCurrency(Math.abs(b?.netBalance || 0))}
                            {isCreditor ? " (receives)" : isDebtor ? " (pays)" : ""}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="px-3 pt-3 pb-2">
                  <CardTitle className="text-sm sm:text-base">Simplified Transactions</CardTitle>
                  <CardDescription className="text-xs">Optimized minimum transactions with settlement tracking</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {unpaidSimplified.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p>All settled!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {unpaidSimplified.map((t, i) => (
                        <div key={`s-${i}`} className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{peopleMap[t.from]}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{peopleMap[t.to]}</span>
                            </div>
                            <span className="font-bold">{formatCurrency(t.amount)}</span>
                          </div>
                          {t.settledAmount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Settled: {formatCurrency(t.settledAmount)} • Outstanding: {formatCurrency(t.outstanding)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-3 pt-3 pb-2">
                  <CardTitle className="text-sm sm:text-base">Pairwise Transactions</CardTitle>
                  <CardDescription className="text-xs">Direct debts between people</CardDescription>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  {pairwiseSortedForDisplay.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p>No direct debts!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pairwiseSortedForDisplay.map((t, i) => (
                        <div key={`p-${i}`} className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{peopleMap[t.from]}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{peopleMap[t.to]}</span>
                            </div>
                            <span className="font-bold">{formatCurrency(t.amount)}</span>
                          </div>
                          {Array.isArray((t as any).contributingExpenseIds) && (t as any).contributingExpenseIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {(t as any).contributingExpenseIds.map((eid: string) => {
                                const exp = expenses.find(e => e.id === eid);
                                return (
                                  <Badge key={eid} variant="outline" className="text-xs">
                                    {exp?.description || eid}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Step 3 Filtered View */}
            <Card>
              <CardHeader className="px-3 pt-3 pb-2">
                <CardTitle className="text-sm sm:text-base">Step 3 Filtered View (Modal Simulation)</CardTitle>
                <CardDescription className="text-xs">
                  Shows transactions for {showBalancedPeople ? "all people" : "people with outstanding balances only"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Direct Debts</div>
                      <div className="text-2xl font-bold">{step3Filtered.directDebts.length}</div>
                    </div>
                    <div>
                      <div className="font-medium">Optimized</div>
                      <div className="text-2xl font-bold">{step3Filtered.simplifiedFiltered.length}</div>
                    </div>
                    <div>
                      <div className="font-medium">Efficiency</div>
                      <div className="text-2xl font-bold text-green-600">{step3Filtered.efficiency}%</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium mb-2">Direct Debts (Filtered)</div>
                    <div className="space-y-1">
                      {step3Filtered.directDebts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">None</div>
                      ) : (
                        step3Filtered.directDebts.map((t, i) => (
                          <div key={`fd-${i}`} className="flex justify-between text-sm p-2 rounded bg-muted/30">
                            <span>{peopleMap[t.from]} → {peopleMap[t.to]}</span>
                            <span className="font-medium">{formatCurrency(t.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium mb-2">Optimized (Filtered)</div>
                    <div className="space-y-1">
                      {step3Filtered.simplifiedFiltered.length === 0 ? (
                        <div className="text-sm text-muted-foreground">None</div>
                      ) : (
                        step3Filtered.simplifiedFiltered.map((t, i) => (
                          <div key={`fs-${i}`} className="flex justify-between text-sm p-2 rounded bg-muted/30">
                            <span>{peopleMap[t.from]} → {peopleMap[t.to]}</span>
                            <span className="font-medium">{formatCurrency(t.outstanding ?? t.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="perPerson" className="space-y-3 mt-3">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Detailed breakdown for each person showing their expenses, debts, credits, and settlements
            </div>
            <div className="space-y-3">
              {perPerson.map((pp) => (
                <Card key={pp.person.id}>
                  <CardHeader className="px-3 pt-3 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg">{pp.person.name}</CardTitle>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          Net: {formatCurrency(Math.abs(pp.personSummary?.netBalance || 0))}
                        </Badge>
                        {Math.abs(pp.personSummary?.netBalance || 0) <= 0.01 ? (
                          <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-foreground text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Balanced
                          </Badge>
                        ) : pp.personSummary?.netBalance > 0 ? (
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs">Receives</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">Pays</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 px-3 pb-3">
                    {/* Relevant Expenses */}
                    <div>
                      <div className="font-medium mb-2">Relevant Expenses ({pp.relevantExpenses.length})</div>
                      {pp.relevantExpenses.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No expenses</div>
                      ) : (
                        <div className="space-y-2">
                          {pp.relevantExpenses.map((e) => (
                            <div key={e.id} className="p-2 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{e.description}</span>
                                <span className="text-xs text-muted-foreground">
                                  {e.created_at ? new Date(e.created_at).toLocaleDateString() : ""}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Paid:</span>{" "}
                                  <span className="font-medium text-green-600">+{formatCurrency(e.amountPaid)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Share:</span>{" "}
                                  <span className="font-medium text-red-600">-{formatCurrency(e.shareAmount)}</span>
                                </div>
                                {e.celebrationAmount > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Celebration:</span>{" "}
                                    <span className="font-medium text-red-600">-{formatCurrency(e.celebrationAmount)}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Net:</span>{" "}
                                  <span className={`font-medium ${e.netForExpense > 0 ? "text-green-600" : e.netForExpense < 0 ? "text-red-600" : ""}`}>
                                    {e.netForExpense > 0 ? "+" : ""}{formatCurrency(e.netForExpense)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Debts and Credits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium mb-2">Simplified Debts ({pp.debtsSimplified.length})</div>
                        {pp.debtsSimplified.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No debts</div>
                        ) : (
                          <div className="space-y-1">
                            {pp.debtsSimplified.map((t, i) => (
                              <div key={`d-${i}`} className="flex justify-between text-sm p-2 rounded bg-red-50 dark:bg-red-950/30 text-foreground">
                                <span>→ {peopleMap[t.to]}</span>
                                <span className="font-medium">{formatCurrency(t.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium mb-2">Simplified Credits ({pp.creditsSimplified.length})</div>
                        {pp.creditsSimplified.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No credits</div>
                        ) : (
                          <div className="space-y-1">
                            {pp.creditsSimplified.map((t, i) => (
                              <div key={`c-${i}`} className="flex justify-between text-sm p-2 rounded bg-green-50 dark:bg-green-950/30 text-foreground">
                                <span>{peopleMap[t.from]} →</span>
                                <span className="font-medium">{formatCurrency(t.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recorded Payments */}
                    <div>
                      <div className="font-medium mb-2">Recorded Settlement Payments ({pp.recordedPayments.length})</div>
                      {pp.recordedPayments.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No recorded payments</div>
                      ) : (
                        <div className="space-y-1">
                          {pp.recordedPayments.map((sp) => (
                            <div key={sp.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                              <div>
                                <span>{peopleMap[sp.debtor_id]} → {peopleMap[sp.creditor_id]}</span>
                                {sp.notes && <span className="text-muted-foreground ml-2">({sp.notes})</span>}
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(sp.amount_settled)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {sp.settled_at ? new Date(sp.settled_at).toLocaleString() : ""}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4 mt-4">
            <div className="space-y-3">
              {expenses.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>No expenses recorded</p>
                  </CardContent>
                </Card>
              ) : (
                expenses.map((e) => {
                  const cat = categories.find((c) => c.name === e.category);
                  return (
                    <Card key={e.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{e.description}</CardTitle>
                          <Badge variant="outline">{formatCurrency(e.total_amount)}</Badge>
                        </div>
                        <CardDescription>
                          {e.created_at ? new Date(e.created_at).toLocaleDateString() : ""} • {e.category || "Uncategorized"} • {e.split_method}
                          {cat && ` • Icon: ${cat.icon_name}`}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Paid By</div>
                            <div className="space-y-1">
                              {(Array.isArray(e.paid_by) ? e.paid_by : []).map((p, i) => (
                                <div key={`pb-${i}`} className="flex justify-between text-sm">
                                  <span>{peopleMap[p.personId] || p.personId}</span>
                                  <span className="font-medium text-green-600">+{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Shared By</div>
                            <div className="space-y-1">
                              {(Array.isArray(e.shares) ? e.shares : []).map((s, i) => (
                                <div key={`sh-${i}`} className="flex justify-between text-sm">
                                  <span>{peopleMap[s.personId] || s.personId}</span>
                                  <span className="font-medium text-red-600">-{formatCurrency(s.amount)}</span>
                                </div>
                              ))}
                              {e.celebration_contribution && e.celebration_contribution.amount > 0 && (
                                <div className="flex justify-between text-sm pt-1 border-t">
                                  <span>{peopleMap[e.celebration_contribution.personId]} (celebration)</span>
                                  <span className="font-medium text-red-600">-{formatCurrency(e.celebration_contribution.amount)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Itemwise breakdown if applicable */}
                        {e.split_method === 'itemwise' && e.items && e.items.length > 0 && (
                          <div>
                            <div className="text-sm font-medium mb-2">Items ({e.items.length})</div>
                            <div className="space-y-1">
                              {e.items.map((item, i) => (
                                <div key={`item-${i}`} className="p-2 rounded bg-muted/50">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">{item.name}</span>
                                    <span>{formatCurrency(Number(item.price))}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.categoryName && `Category: ${item.categoryName} • `}
                                    Shared by: {item.sharedBy.map(id => peopleMap[id] || id).join(", ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Raw JSON Data</CardTitle>
                <CardDescription>
                  Complete debug object with all calculations and data structures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="text-xs whitespace-pre-wrap break-all p-4 bg-muted rounded-lg overflow-auto max-h-[600px]">
                    {JSON.stringify(fullDebug, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
