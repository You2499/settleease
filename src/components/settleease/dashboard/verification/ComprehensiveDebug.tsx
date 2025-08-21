"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bug,
  Copy,
  Download,
  Database,
  Users,
  FileText,
  ListOrdered,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
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
}: ComprehensiveDebugProps) {
  const [showBalancedPeople, setShowBalancedPeople] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Overview and modal computations, mirroring SettlementSummary
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
      if (
        expense.celebration_contribution &&
        expense.celebration_contribution.amount > 0
      ) {
        const cid = expense.celebration_contribution.personId;
        if (balances[cid]) {
          balances[cid].totalOwed += Number(
            expense.celebration_contribution.amount
          );
        }
      }
    });

    settlementPayments.forEach((payment) => {
      if (balances[payment.debtor_id]) {
        balances[payment.debtor_id].settledAsDebtor += Number(
          payment.amount_settled
        );
      }
      if (balances[payment.creditor_id]) {
        balances[payment.creditor_id].settledAsCreditor += Number(
          payment.amount_settled
        );
      }
    });

    const netBalances = calculateNetBalances(
      people,
      expenses,
      settlementPayments
    );
    Object.keys(balances).forEach((pid) => {
      balances[pid].netBalance = netBalances[pid] || 0;
    });

    return balances;
  }, [people, expenses, settlementPayments]);

  const allSimplified: CalculatedTransaction[] = useMemo(
    () => calculateSimplifiedTransactions(people, expenses, settlementPayments),
    [people, expenses, settlementPayments]
  );
  const allPairwise: CalculatedTransaction[] = useMemo(
    () => calculatePairwiseTransactions(people, expenses, settlementPayments),
    [people, expenses, settlementPayments]
  );

  // UI-like sorted pairwise (debtor then creditor names)
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
        .filter(
          (p) => p.debtor_id === txn.from && p.creditor_id === txn.to
        )
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

  // Build per-person debug objects
  const perPerson = useMemo(() => {
    return people.map((person) => {
      // Relevant expenses and per-expense math
      const relevantExpenses = expenses
        .filter((e) => {
          const wasPayer = Array.isArray(e.paid_by)
            ? e.paid_by.some((p) => p.personId === person.id)
            : false;
          const hadShare = Array.isArray(e.shares)
            ? e.shares.some((s) => s.personId === person.id)
            : false;
          const hadCelebration =
            e.celebration_contribution?.personId === person.id;
          return wasPayer || hadShare || hadCelebration;
        })
        .map((e) => {
          const amountPaid = Array.isArray(e.paid_by)
            ? Number(
                e.paid_by.find((p) => p.personId === person.id)?.amount || 0
              )
            : 0;
          const shareAmount = Array.isArray(e.shares)
            ? Number(
                e.shares.find((s) => s.personId === person.id)?.amount || 0
              )
            : 0;
          const celebrationAmount =
            e.celebration_contribution?.personId === person.id
              ? Number(e.celebration_contribution.amount || 0)
              : 0;
          const totalOwed = shareAmount + celebrationAmount;
          const netForExpense = amountPaid - totalOwed;
          const payers = Array.isArray(e.paid_by)
            ? e.paid_by.map((p) => peopleMap[p.personId]).filter(Boolean)
            : [];
          return {
            id: e.id,
            description: e.description,
            created_at: e.created_at,
            total_amount: e.total_amount,
            payers,
            amountPaid,
            shareAmount,
            celebrationAmount,
            netForExpense,
          };
        });

      const personSummary = {
        ...(personBalances[person.id] || {
          totalPaid: 0,
          totalOwed: 0,
          settledAsDebtor: 0,
          settledAsCreditor: 0,
          netBalance: 0,
        }),
        isBalanced:
          Math.abs((personBalances[person.id]?.netBalance || 0)) <= 0.01,
      };

      const debtsSimplified = allSimplified.filter(
        (t) => t.from === person.id
      );
      const creditsSimplified = allSimplified.filter((t) => t.to === person.id);
      const recordedPayments = settlementPayments.filter(
        (sp) => sp.debtor_id === person.id || sp.creditor_id === person.id
      );

      return {
        person,
        personSummary,
        relevantExpenses,
        debtsSimplified,
        creditsSimplified,
        recordedPayments,
      };
    });
  }, [people, expenses, personBalances, allSimplified, settlementPayments, peopleMap]);

  // Step 3 modal-like filtered lists and efficiency (based on showBalancedPeople)
  const step3Filtered = useMemo(() => {
    const visibleIds = new Set((showBalancedPeople ? people : filteredPeople).map((p) => p.id));
    const directDebts = pairwiseSortedForDisplay
      .filter((t) => t.amount > 0.01)
      .filter((t) => visibleIds.has(t.from) || visibleIds.has(t.to));
    const simplifiedFiltered = unpaidSimplified
      .filter((t) => visibleIds.has(t.from) && visibleIds.has(t.to));
    const efficiency = directDebts.length > 0
      ? Math.round((1 - simplifiedFiltered.length / directDebts.length) * 100)
      : 0;
    return { directDebts, simplifiedFiltered, efficiency };
  }, [showBalancedPeople, people, filteredPeople, pairwiseSortedForDisplay, unpaidSimplified]);

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
        simplifyOff:
          "Detailed pairwise debts reflecting direct expense involvements and payments.",
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
    };
  }, [people, expenses, settlementPayments, allPairwise, allSimplified, unpaidSimplified, personBalances, filteredPeople, perPerson, categories, userRole, showBalancedPeople, pairwiseSortedForDisplay, step3Filtered]);

  const expenseById = useMemo(() => {
    const map: Record<string, Expense> = {} as any;
    expenses.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [expenses]);

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
    a.download = `settleease-debug-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center text-lg font-bold">
              <Bug className="mr-2 h-5 w-5 text-purple-600" />
              Comprehensive Debug Screen
            </CardTitle>
            <CardDescription className="text-sm">
              Mirrors all values shown across Settlement Hub, How it Works, and Per Person
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="mr-1 h-4 w-4" /> Copy JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-4 w-4" /> Download JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowJson((s) => !s)}
            >
              <FileText className="mr-1 h-4 w-4" /> {showJson ? "Hide" : "Show"} Raw JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
        <div className="mb-3 flex items-center justify-between bg-muted/50 p-2 rounded-md">
          <div className="text-xs sm:text-sm">
            Overview descriptions
            <div className="text-muted-foreground">
              <div>• Simplify ON: {fullDebug.overviewDescriptions.simplifyOn}</div>
              <div>• Simplify OFF: {fullDebug.overviewDescriptions.simplifyOff}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalancedPeople((s) => !s)}
            >
              {showBalancedPeople ? (
                <>
                  <Eye className="mr-1 h-4 w-4" /> Showing balanced
                </>
              ) : (
                <>
                  <EyeOff className="mr-1 h-4 w-4" /> Hiding balanced
                </>
              )}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 border rounded-md p-2">
          <div className="space-y-4">
            {/* Overview: People balances */}
            <section className="p-2 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-green-700" />
                <h3 className="font-semibold">Overview: Net Balances</h3>
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Showing {showBalancedPeople ? people.length : filteredPeople.length} of {people.length} people
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(showBalancedPeople ? people : filteredPeople).map((p) => {
                  const b = personBalances[p.id];
                  const isCreditor = b?.netBalance > 0.01;
                  const isDebtor = b?.netBalance < -0.01;
                  const isBalanced = !isCreditor && !isDebtor;
                  return (
                    <div key={p.id} className="p-2 rounded border bg-background">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{p.name}</div>
                        {isBalanced ? (
                          <div className="text-[10px] px-2 py-0.5 rounded bg-gray-200 text-gray-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Balanced
                          </div>
                        ) : isCreditor ? (
                          <div className="text-[10px] px-2 py-0.5 rounded bg-green-200 text-green-800">Receives</div>
                        ) : (
                          <div className="text-[10px] px-2 py-0.5 rounded bg-red-200 text-red-800">Pays</div>
                        )}
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between"><span>Total paid</span><span>+{formatCurrency(b?.totalPaid || 0)}</span></div>
                        <div className="flex justify-between"><span>Total owed</span><span>-{formatCurrency(b?.totalOwed || 0)}</span></div>
                        <div className="flex justify-between"><span>Net settlements</span><span>{formatCurrency((b?.settledAsDebtor || 0) - (b?.settledAsCreditor || 0))}</span></div>
                        <div className="flex justify-between font-semibold"><span>Net balance</span><span>{formatCurrency(Math.abs(b?.netBalance || 0))}{isCreditor ? " (receives)" : isDebtor ? " (pays)" : ""}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Settlement Hub: Transactions */}
            <section className="p-2 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <ListOrdered className="h-4 w-4 text-purple-700" />
                <h3 className="font-semibold">Settlement Hub: Transactions</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded border p-2">
                  <div className="font-medium mb-1">Simplified (optimized)</div>
                  <ul className="space-y-1 text-sm">
                    {unpaidSimplified.map((t, i) => (
                      <li key={`s-${i}`} className="flex justify-between">
                        <span className="truncate">
                          {peopleMap[t.from]} → {peopleMap[t.to]}
                        </span>
                        <span className="text-right">
                          {formatCurrency(t.amount)}
                          {t.settledAmount > 0 && (
                            <span className="text-xs text-muted-foreground"> (settled {formatCurrency(t.settledAmount)}, outstanding {formatCurrency(t.outstanding)})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded border p-2">
                  <div className="font-medium mb-1">Pairwise (direct debts)</div>
                  <ul className="space-y-1 text-sm">
                    {pairwiseSortedForDisplay.map((t, i) => (
                      <li key={`p-${i}`} className="flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                          <span className="truncate">
                            {peopleMap[t.from]} → {peopleMap[t.to]}
                          </span>
                          <span className="ml-2 flex-shrink-0">{formatCurrency(t.amount)}</span>
                        </div>
                        {Array.isArray((t as any).contributingExpenseIds) && (t as any).contributingExpenseIds.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(t as any).contributingExpenseIds.map((eid: string) => {
                              const exp = expenseById[eid];
                              const label = exp ? exp.description : eid;
                              return (
                                <span
                                  key={`${i}-${eid}`}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                                  title={exp ? `${label} • Total ${formatCurrency(exp.total_amount)}` : eid}
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Step 3 (modal-like) filtered view and efficiency */}
              <div className="mt-3 rounded border p-2">
                <div className="font-medium mb-1">How it Works (Step 3) Filtered View</div>
                <div className="text-xs text-muted-foreground mb-2">
                  Direct debts shown: {step3Filtered.directDebts.length} • Optimized shown: {step3Filtered.simplifiedFiltered.length} • Efficiency: {step3Filtered.efficiency}%
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="rounded border p-2">
                    <div className="font-medium mb-1">Direct Debts (filtered)</div>
                    <ul className="space-y-1 text-xs">
                      {step3Filtered.directDebts.map((t, i) => (
                        <li key={`fd-${i}`} className="flex justify-between">
                          <span className="truncate">{peopleMap[t.from]} → {peopleMap[t.to]}</span>
                          <span>{formatCurrency(t.amount)}</span>
                        </li>
                      ))}
                      {step3Filtered.directDebts.length === 0 && (
                        <li className="text-muted-foreground">None</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded border p-2">
                    <div className="font-medium mb-1">Optimized (filtered)</div>
                    <ul className="space-y-1 text-xs">
                      {step3Filtered.simplifiedFiltered.map((t, i) => (
                        <li key={`fs-${i}`} className="flex justify-between">
                          <span className="truncate">{peopleMap[t.from]} → {peopleMap[t.to]}</span>
                          <span>{formatCurrency((t as any).outstanding ?? t.amount)}</span>
                        </li>
                      ))}
                      {step3Filtered.simplifiedFiltered.length === 0 && (
                        <li className="text-muted-foreground">None</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Per Person */}
            <section className="p-2 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-700" />
                <h3 className="font-semibold">Per Person Details</h3>
              </div>
              <div className="space-y-3">
                {perPerson.map((pp) => (
                  <div key={pp.person.id} className="rounded border p-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{pp.person.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Net: {formatCurrency(pp.personSummary.netBalance)} | Paid: {formatCurrency(pp.personSummary.totalPaid)} | Owed: {formatCurrency(pp.personSummary.totalOwed)}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="rounded border p-2">
                        <div className="font-medium mb-1">Relevant Expenses</div>
                        <ul className="space-y-1 text-xs">
                          {pp.relevantExpenses.map((e) => (
                            <li key={e.id} className="flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className="truncate">{e.description}</span>
                                <span className="text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleDateString() : ""}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <div>Paid: +{formatCurrency(e.amountPaid)}</div>
                                <div>Share: -{formatCurrency(e.shareAmount)}</div>
                                <div>Celebration: -{formatCurrency(e.celebrationAmount)}</div>
                                <div className="font-semibold">Net: {e.netForExpense > 0 ? "+" : e.netForExpense < 0 ? "-" : ""}{formatCurrency(Math.abs(e.netForExpense))}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded border p-2">
                        <div className="font-medium mb-1">Simplified Debts/Credits</div>
                        <div className="text-xs mb-1">Debts</div>
                        <ul className="space-y-1 text-xs mb-2">
                          {pp.debtsSimplified.map((t, i) => (
                            <li key={`d-${pp.person.id}-${i}`} className="flex justify-between">
                              <span className="truncate">→ {peopleMap[t.to]}</span>
                              <span>{formatCurrency(t.amount)}</span>
                            </li>
                          ))}
                          {pp.debtsSimplified.length === 0 && (
                            <li className="text-muted-foreground">None</li>
                          )}
                        </ul>
                        <div className="text-xs mb-1">Credits</div>
                        <ul className="space-y-1 text-xs">
                          {pp.creditsSimplified.map((t, i) => (
                            <li key={`c-${pp.person.id}-${i}`} className="flex justify-between">
                              <span className="truncate">{peopleMap[t.from]} →</span>
                              <span>{formatCurrency(t.amount)}</span>
                            </li>
                          ))}
                          {pp.creditsSimplified.length === 0 && (
                            <li className="text-muted-foreground">None</li>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-2 rounded border p-2">
                      <div className="font-medium mb-1">Recorded Payments</div>
                      <ul className="space-y-1 text-xs">
                        {pp.recordedPayments.map((sp) => (
                          <li key={sp.id} className="flex justify-between">
                            <span className="truncate">{peopleMap[sp.debtor_id]} → {peopleMap[sp.creditor_id]}</span>
                            <span>
                              {formatCurrency(sp.amount_settled)} {sp.settled_at ? `• ${new Date(sp.settled_at).toLocaleString()}` : ""}
                            </span>
                          </li>
                        ))}
                        {pp.recordedPayments.length === 0 && (
                          <li className="text-muted-foreground">None</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Raw JSON toggle */}
            {showJson && (
              <section className="p-2 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-gray-700" />
                  <h3 className="font-semibold">Raw JSON</h3>
                </div>
                <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(fullDebug, null, 2)}</pre>
              </section>
            )}

            {/* Expense Details Mirror (for Expense Detail Modal parity) */}
            <section className="p-2 rounded-md border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-700" />
                <h3 className="font-semibold">All Expenses (Detail)</h3>
              </div>
              <ul className="space-y-2 text-xs">
                {expenses.map((e) => {
                  const cat = categories.find((c) => c.name === e.category);
                  const involvedPersonIds = Array.from(
                    new Set([
                      ...((e.paid_by || []).map((p) => p.personId)),
                      ...((e.shares || []).map((s) => s.personId)),
                      ...(e.celebration_contribution?.personId
                        ? [e.celebration_contribution.personId]
                        : []),
                    ])
                  );
                  return (
                    <li key={e.id} className="rounded border p-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{e.description}</div>
                        <div className="text-muted-foreground">{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</div>
                      </div>
                      <div className="mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>Total: {formatCurrency(e.total_amount)}</div>
                        <div>Category: {e.category || "-"}</div>
                        <div>Icon: {cat?.icon_name || "-"}</div>
                        <div>Split: {e.split_method}</div>
                      </div>
                      <div className="mt-2">
                        <div className="font-medium mb-1">Paid by</div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {(Array.isArray(e.paid_by) ? e.paid_by : []).map((p, i) => (
                            <li key={`pb-${i}`} className="flex justify-between">
                              <span className="truncate">{peopleMap[p.personId] || p.personId}</span>
                              <span>+{formatCurrency(p.amount)}</span>
                            </li>
                          ))}
                          {(!e.paid_by || e.paid_by.length === 0) && (
                            <li className="text-muted-foreground">None</li>
                          )}
                        </ul>
                      </div>
                      <div className="mt-2">
                        <div className="font-medium mb-1">Shares</div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {(Array.isArray(e.shares) ? e.shares : []).map((s, i) => (
                            <li key={`sh-${i}`} className="flex justify-between">
                              <span className="truncate">{peopleMap[s.personId] || s.personId}</span>
                              <span>-{formatCurrency(s.amount)}</span>
                            </li>
                          ))}
                          {(!e.shares || e.shares.length === 0) && (
                            <li className="text-muted-foreground">None</li>
                          )}
                        </ul>
                      </div>
                      <div className="mt-2">
                        <div className="font-medium mb-1">Itemwise</div>
                        <ul className="space-y-1">
                          {(Array.isArray(e.items) ? e.items : []).map((it, i) => (
                            <li key={`it-${i}`} className="rounded border p-1">
                              <div className="flex justify-between">
                                <span className="truncate">{it.name}</span>
                                <span>{formatCurrency(it.price)}</span>
                              </div>
                              <div className="text-muted-foreground">Category: {it.categoryName || "-"}</div>
                              <div className="text-muted-foreground">Shared by: {(it.sharedBy || []).map((pid) => peopleMap[pid] || pid).join(", ") || "-"}</div>
                            </li>
                          ))}
                          {(!e.items || e.items.length === 0) && (
                            <li className="text-muted-foreground">None</li>
                          )}
                        </ul>
                      </div>
                      <div className="mt-2">
                        <div className="font-medium mb-1">Celebration</div>
                        {e.celebration_contribution ? (
                          <div className="flex justify-between">
                            <span>{peopleMap[e.celebration_contribution.personId] || e.celebration_contribution.personId}</span>
                            <span>-{formatCurrency(e.celebration_contribution.amount)}</span>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">None</div>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="font-medium mb-1">Net Effect Per Person</div>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {involvedPersonIds.map((pid) => {
                            const amountPaid = Array.isArray(e.paid_by)
                              ? Number(
                                  e.paid_by.find((p) => p.personId === pid)?.amount || 0
                                )
                              : 0;
                            const shareAmount = Array.isArray(e.shares)
                              ? Number(
                                  e.shares.find((s) => s.personId === pid)?.amount || 0
                                )
                              : 0;
                            const celebrationAmount =
                              e.celebration_contribution?.personId === pid
                                ? Number(e.celebration_contribution.amount || 0)
                                : 0;
                            const net = amountPaid - (shareAmount + celebrationAmount);
                            return (
                              <li key={`nen-${e.id}-${pid}`} className="flex justify-between">
                                <span className="truncate">{peopleMap[pid] || pid}</span>
                                <span className={net > 0 ? "text-green-700" : net < 0 ? "text-red-700" : ""}>
                                  {net > 0 ? "+" : net < 0 ? "-" : ""}
                                  {formatCurrency(Math.abs(net))}
                                </span>
                              </li>
                            );
                          })}
                          {involvedPersonIds.length === 0 && (
                            <li className="text-muted-foreground">None</li>
                          )}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}


