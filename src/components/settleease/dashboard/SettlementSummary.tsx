"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  Users,
  Handshake,
  CheckCircle2,
  FileText,
  Info,
  TrendingUp,
  BarChart3,
  Minus,
  Plus,
  ArrowDownUp,
  Shuffle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Person,
  Expense,
  SettlementPayment,
  CalculatedTransaction,
  UserRole,
} from "@/lib/settleease/types";
import PerPersonSettlementDetails from "./PerPersonSettlementDetails";

interface SettlementSummaryProps {
  simplifiedTransactions: CalculatedTransaction[];
  pairwiseTransactions: CalculatedTransaction[];
  allExpenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  settlementPayments: SettlementPayment[];
  onMarkAsPaid: (transaction: CalculatedTransaction) => Promise<void>;
  onUnmarkSettlementPayment: (payment: SettlementPayment) => Promise<void>;
  onViewExpenseDetails: (expense: Expense) => void;
  userRole: UserRole;
}

export default function SettlementSummary({
  simplifiedTransactions,
  pairwiseTransactions,
  allExpenses,
  people,
  peopleMap,
  settlementPayments,
  onMarkAsPaid,
  onUnmarkSettlementPayment,
  onViewExpenseDetails,
  userRole,
}: SettlementSummaryProps) {
  const [viewMode, setViewMode] = useState<"overview" | "person">("overview");
  const [simplifySettlement, setSimplifySettlement] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [visualizationTab, setVisualizationTab] = useState<
    "simplified" | "individual" | "transformation"
  >("simplified");

  const transactionsToDisplay = simplifySettlement
    ? simplifiedTransactions
    : pairwiseTransactions;

  const overviewDescription = simplifySettlement
    ? "Minimum transactions required to settle all debts."
    : "Detailed pairwise debts reflecting direct expense involvements and payments.";

  const handleInternalMarkAsPaid = async (
    transaction: CalculatedTransaction
  ) => {
    setIsLoading(true);
    await onMarkAsPaid(transaction);
    setIsLoading(false);
  };

  const selectedPersonObject = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find((p) => p.id === selectedPersonId) || null;
  }, [selectedPersonId, people]);

  // Calculate individual balances for visualization
  const individualBalances = useMemo(() => {
    if (people.length === 0) return {};

    const balances: Record<string, number> = {};
    people.forEach((p) => (balances[p.id] = 0));

    // Calculate balances from expenses
    allExpenses.forEach((expense) => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach((payment) => {
          balances[payment.personId] =
            (balances[payment.personId] || 0) + Number(payment.amount);
        });
      }
      if (Array.isArray(expense.shares)) {
        expense.shares.forEach((share) => {
          balances[share.personId] =
            (balances[share.personId] || 0) - Number(share.amount);
        });
      }
    });

    // Adjust for settlement payments
    settlementPayments.forEach((payment) => {
      if (balances[payment.debtor_id] !== undefined) {
        balances[payment.debtor_id] += Number(payment.amount_settled);
      }
      if (balances[payment.creditor_id] !== undefined) {
        balances[payment.creditor_id] -= Number(payment.amount_settled);
      }
    });

    return balances;
  }, [people, allExpenses, settlementPayments]);

  return (
    <Card className="w-full shadow-lg rounded-lg">
      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as "overview" | "person")}
        className="w-full"
      >
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          {" "}
          {/* Reduced bottom padding */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Handshake className="mr-2 h-5 w-5 text-primary" /> Settlement
                Hub
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInfoModalOpen(true)}
              >
                <Info className="mr-1 h-4 w-4" /> More Info
              </Button>
            </div>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto text-xs sm:text-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="person">Per Person</TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
          {" "}
          {/* Adjusted top padding */}
          <TabsContent value="overview" className="mt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 px-3 py-2 rounded-md gap-2">
              {" "}
              {/* Reduced padding */}
              <CardDescription className="text-xs sm:text-sm flex-grow pr-2">
                {overviewDescription}
              </CardDescription>
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <Switch
                  id="simplify-settlement-toggle"
                  checked={simplifySettlement}
                  onCheckedChange={setSimplifySettlement}
                  aria-label="Toggle settlement simplification"
                  disabled={isLoading}
                />
                <Label
                  htmlFor="simplify-settlement-toggle"
                  className="text-xs sm:text-sm font-medium"
                >
                  Simplify
                </Label>
              </div>
            </div>
            {transactionsToDisplay.length > 0 ? (
              <ScrollArea className="h-[200px] border rounded-md p-1 mt-2">
                <ul className="space-y-2 p-2">
                  {transactionsToDisplay.map((txn, i) => (
                    <li key={`${txn.from}-${txn.to}-${i}-${txn.amount}`}>
                      <Card className="bg-card/70 px-2 py-2 shadow-sm rounded-md">
                        <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-1.5">
                          <div className="col-span-1 sm:col-span-3">
                            <div className="grid grid-cols-3 items-center w-full">
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-left px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-start">
                                {peopleMap[txn.from]}
                              </span>
                              <span className="flex items-center justify-center w-5 mx-1 col-span-1 justify-self-center">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-right px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-center">
                                {peopleMap[txn.to]}
                              </span>
                            </div>
                          </div>
                          <span className="text-right font-bold text-green-700 text-base sm:text-lg mt-1 sm:mt-0 col-span-1 sm:col-span-1 flex justify-end">
                            {formatCurrency(txn.amount)}
                          </span>
                          <div className="flex-shrink-0 flex justify-center mt-1 sm:mt-0 col-span-1 sm:col-span-1">
                            {userRole === "admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInternalMarkAsPaid(txn)}
                                disabled={isLoading}
                                className="text-xs px-2 py-1 h-auto w-full sm:w-auto"
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />{" "}
                                Mark as Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-md text-center min-h-[100px] flex items-center justify-center mt-2">
                {" "}
                {/* Reduced margin */}
                <FileText className="mr-2 h-5 w-5" />
                All debts are settled, or no expenses to settle yet!
              </div>
            )}
          </TabsContent>
          <TabsContent value="person" className="mt-0 space-y-3">
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 items-center bg-muted/50 px-3 py-2 rounded-md">
              {" "}
              {/* Reduced padding */}
              <Label
                htmlFor="person-select"
                className="text-xs sm:text-sm font-medium text-left sm:text-right"
              >
                View settlement details for:
              </Label>
              <Select
                value={selectedPersonId || ""}
                onValueChange={setSelectedPersonId}
                disabled={people.length === 0}
              >
                <SelectTrigger
                  id="person-select"
                  className="h-9 text-xs sm:text-sm"
                >
                  <SelectValue placeholder="Select Person..." />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPersonObject ? (
              <PerPersonSettlementDetails
                key={selectedPersonId}
                selectedPerson={selectedPersonObject}
                peopleMap={peopleMap}
                allExpenses={allExpenses}
                settlementPayments={settlementPayments}
                simplifiedTransactions={simplifiedTransactions}
                pairwiseTransactions={pairwiseTransactions}
                onMarkAsPaid={onMarkAsPaid}
                onUnmarkSettlementPayment={onUnmarkSettlementPayment}
                onViewExpenseDetails={onViewExpenseDetails}
                isLoadingParent={isLoading}
                setIsLoadingParent={setIsLoading}
                userRole={userRole}
              />
            ) : (
              <div className="text-sm text-muted-foreground p-3 text-center min-h-[100px] flex items-center justify-center">
                <Users className="mr-2 h-5 w-5" />
                Please select a person to see their specific settlement status.
              </div>
            )}
          </TabsContent>
        </CardContent>
      </Tabs>

      {/* Settlement Info Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Settlement Visualization
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
            <div className="space-y-4 pt-2">
              {/* Visualization Tabs */}
              <Tabs
                value={visualizationTab}
                onValueChange={(value) =>
                  setVisualizationTab(
                    value as "simplified" | "individual" | "transformation"
                  )
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="simplified">Simplified</TabsTrigger>
                  <TabsTrigger value="individual">Balances</TabsTrigger>
                  <TabsTrigger value="transformation">How It Works</TabsTrigger>
                </TabsList>

                <div className="mt-4 h-[500px]">
                  {" "}
                  {/* Fixed height container */}
                  <TabsContent value="simplified" className="h-full m-0">
                    <Card className="h-full flex flex-col">
                      <CardHeader className="pt-3 sm:pt-4 pb-2 flex-shrink-0">
                        <CardTitle className="flex items-center text-lg font-bold">
                          <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                          Optimized Settlement Path
                        </CardTitle>
                        <CardDescription className="text-xs">
                          This shows the minimum number of transactions needed
                          to settle all debts efficiently.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
                        {simplifiedTransactions.length > 0 ? (
                          <div className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="flex-1 min-h-0">
                              <div className="space-y-3 pr-2">
                                {simplifiedTransactions.map((txn, index) => (
                                  <div
                                    key={`${txn.from}-${txn.to}-${index}`}
                                    className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                        {index + 1}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-medium text-sm">
                                          {peopleMap[txn.from]}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">
                                          {peopleMap[txn.to]}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-green-700 text-lg">
                                        {formatCurrency(txn.amount)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex-shrink-0">
                              <div className="text-xs text-muted-foreground text-center">
                                ✨ Total transactions needed:{" "}
                                <span className="font-bold text-primary">
                                  {simplifiedTransactions.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                            <div>
                              <Handshake className="h-12 w-12 mx-auto mb-3 text-green-500" />
                              <p className="font-medium">
                                All debts are settled!
                              </p>
                              <p className="text-xs">No transactions needed.</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="individual" className="h-full m-0">
                    <Card className="h-full flex flex-col">
                      <CardHeader className="pt-3 sm:pt-4 pb-2 flex-shrink-0">
                        <CardTitle className="flex items-center text-lg font-bold">
                          <Users className="mr-2 h-4 w-4 text-blue-600" />
                          Individual Balance Breakdown
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Shows each person's net balance after all expenses and
                          payments.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
                        {Object.keys(individualBalances).length > 0 ? (
                          <div className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="flex-1 min-h-0">
                              <div className="space-y-3 pr-2">
                                {Object.entries(individualBalances)
                                  .sort(
                                    ([, balanceA], [, balanceB]) =>
                                      balanceB - balanceA
                                  )
                                  .map(([personId, balance]) => {
                                    const isCreditor = balance > 0.01;
                                    const isDebtor = balance < -0.01;
                                    const isSettled = Math.abs(balance) <= 0.01;

                                    return (
                                      <div
                                        key={personId}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${
                                          isCreditor
                                            ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800"
                                            : isDebtor
                                            ? "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-800"
                                            : "bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800"
                                        }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                              isCreditor
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : isDebtor
                                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                                            }`}
                                          >
                                            {isCreditor ? (
                                              <Plus className="h-4 w-4" />
                                            ) : isDebtor ? (
                                              <Minus className="h-4 w-4" />
                                            ) : (
                                              <CheckCircle2 className="h-4 w-4" />
                                            )}
                                          </div>
                                          <div>
                                            <div className="font-medium text-sm">
                                              {peopleMap[personId]}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {isCreditor
                                                ? "Should receive"
                                                : isDebtor
                                                ? "Should pay"
                                                : "Settled"}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div
                                            className={`font-bold text-lg ${
                                              isCreditor
                                                ? "text-green-700"
                                                : isDebtor
                                                ? "text-red-700"
                                                : "text-gray-600"
                                            }`}
                                          >
                                            {isSettled
                                              ? formatCurrency(0)
                                              : formatCurrency(
                                                  Math.abs(balance)
                                                )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </ScrollArea>

                            {/* Summary Stats - Fixed at bottom */}
                            <div className="mt-4 grid grid-cols-3 gap-3 flex-shrink-0">
                              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">
                                  Creditors
                                </div>
                                <div className="font-bold text-green-700">
                                  {
                                    Object.values(individualBalances).filter(
                                      (b) => b > 0.01
                                    ).length
                                  }
                                </div>
                              </div>
                              <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">
                                  Debtors
                                </div>
                                <div className="font-bold text-red-700">
                                  {
                                    Object.values(individualBalances).filter(
                                      (b) => b < -0.01
                                    ).length
                                  }
                                </div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">
                                  Settled
                                </div>
                                <div className="font-bold text-gray-700">
                                  {
                                    Object.values(individualBalances).filter(
                                      (b) => Math.abs(b) <= 0.01
                                    ).length
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                            <div>
                              <Users className="h-12 w-12 mx-auto mb-3" />
                              <p className="font-medium">
                                No balance data available
                              </p>
                              <p className="text-xs">
                                Add some expenses to see individual balances.
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="transformation" className="h-full m-0">
                    <Card className="h-full flex flex-col">
                      <CardHeader className="pt-3 sm:pt-4 pb-2 flex-shrink-0">
                        <CardTitle className="flex items-center text-lg font-bold">
                          <Shuffle className="mr-2 h-4 w-4 text-purple-600" />
                          Settlement Flowchart
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Step-by-step flowchart showing debt optimization
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
                        {pairwiseTransactions.length > 0 ||
                        simplifiedTransactions.length > 0 ? (
                          <div className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="flex-1 min-h-0">
                              <div className="space-y-6 pr-2">
                                {/* Flowchart Container */}
                                <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900/50 dark:to-gray-900/50 p-6 rounded-lg border">
                                  {/* Step 1: Individual Balances */}
                                  <div className="flex flex-col items-center space-y-4">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                                      <div className="text-sm font-bold text-blue-800 dark:text-blue-200 text-center">
                                        1. Individual Balances
                                      </div>
                                    </div>

                                    {/* Balance Nodes */}
                                    <div className="flex flex-wrap justify-center gap-3">
                                      {Object.entries(individualBalances)
                                        .filter(
                                          ([, balance]) =>
                                            Math.abs(balance) > 0.01
                                        )
                                        .slice(0, 6)
                                        .map(([personId, balance]) => {
                                          const isCreditor = balance > 0.01;
                                          return (
                                            <div
                                              key={personId}
                                              className="flex flex-col items-center space-y-1"
                                            >
                                              <div
                                                className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center shadow-sm ${
                                                  isCreditor
                                                    ? "bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600"
                                                    : "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600"
                                                }`}
                                              >
                                                <div className="text-xs font-bold">
                                                  {peopleMap[personId]?.split(
                                                    " "
                                                  )[0] || "Unknown"}
                                                </div>
                                                <div
                                                  className={`text-xs font-bold ${
                                                    isCreditor
                                                      ? "text-green-700 dark:text-green-300"
                                                      : "text-red-700 dark:text-red-300"
                                                  }`}
                                                >
                                                  {isCreditor ? "+" : ""}
                                                  {formatCurrency(balance)}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>

                                    {/* Flowchart Arrow */}
                                    <div className="flex flex-col items-center">
                                      <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-600"></div>
                                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-gray-400 dark:border-t-gray-600"></div>
                                    </div>
                                  </div>

                                  {/* Step 2: Pairwise Transactions */}
                                  <div className="flex flex-col items-center space-y-4">
                                    <div className="bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-lg border-2 border-orange-300 dark:border-orange-700 shadow-sm">
                                      <div className="text-sm font-bold text-orange-800 dark:text-orange-200 text-center">
                                        2. Individual Debts (
                                        {pairwiseTransactions.length})
                                      </div>
                                    </div>

                                    {/* Pairwise Transaction Nodes */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-lg">
                                      {pairwiseTransactions
                                        .slice(0, 6)
                                        .map((txn, index) => (
                                          <div
                                            key={`pairwise-${index}`}
                                            className="flex items-center space-x-1 bg-orange-50 dark:bg-orange-950/20 p-2 rounded border border-orange-200 dark:border-orange-800 shadow-sm"
                                          >
                                            <div className="w-6 h-6 bg-orange-200 dark:bg-orange-800 rounded-full flex items-center justify-center text-xs font-bold">
                                              {peopleMap[txn.from]?.charAt(0) ||
                                                "?"}
                                            </div>
                                            <ArrowRight className="h-3 w-3 text-orange-600 flex-shrink-0" />
                                            <div className="w-6 h-6 bg-orange-200 dark:bg-orange-800 rounded-full flex items-center justify-center text-xs font-bold">
                                              {peopleMap[txn.to]?.charAt(0) ||
                                                "?"}
                                            </div>
                                            <div className="text-xs font-medium text-orange-700 dark:text-orange-300 truncate">
                                              {formatCurrency(txn.amount)}
                                            </div>
                                          </div>
                                        ))}
                                      {pairwiseTransactions.length > 6 && (
                                        <div className="text-xs text-orange-600 dark:text-orange-400 self-center text-center col-span-full">
                                          +{pairwiseTransactions.length - 6}{" "}
                                          more debts
                                        </div>
                                      )}
                                    </div>

                                    {/* Flowchart Arrow */}
                                    <div className="flex flex-col items-center">
                                      <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-600"></div>
                                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-gray-400 dark:border-t-gray-600"></div>
                                    </div>
                                  </div>

                                  {/* Step 3: Algorithm Processing */}
                                  <div className="flex flex-col items-center space-y-4">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-lg border-2 border-purple-300 dark:border-purple-700 shadow-sm">
                                      <div className="text-sm font-bold text-purple-800 dark:text-purple-200 text-center">
                                        3. Algorithm Processing
                                      </div>
                                    </div>

                                    {/* Processing Animation */}
                                    <div className="flex items-center space-x-3 bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                                      <div className="w-10 h-10 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center">
                                        <Shuffle className="h-5 w-5 text-purple-600 animate-spin" />
                                      </div>
                                      <div className="text-xs text-purple-700 dark:text-purple-300">
                                        <div className="font-bold">
                                          Optimizing...
                                        </div>
                                        <div>Finding minimum paths</div>
                                      </div>
                                    </div>

                                    {/* Flowchart Arrow */}
                                    <div className="flex flex-col items-center">
                                      <div className="w-0.5 h-6 bg-gray-400 dark:bg-gray-600"></div>
                                      <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-gray-400 dark:border-t-gray-600"></div>
                                    </div>
                                  </div>

                                  {/* Step 4: Simplified Result */}
                                  <div className="flex flex-col items-center space-y-4">
                                    <div className="bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg border-2 border-green-300 dark:border-green-700 shadow-sm">
                                      <div className="text-sm font-bold text-green-800 dark:text-green-200 text-center">
                                        4. Optimized Settlement (
                                        {simplifiedTransactions.length})
                                      </div>
                                    </div>

                                    {/* Simplified Transaction Nodes */}
                                    {simplifiedTransactions.length > 0 ? (
                                      <div className="flex flex-wrap justify-center gap-4">
                                        {simplifiedTransactions.map(
                                          (txn, index) => (
                                            <div
                                              key={`simplified-${index}`}
                                              className="flex items-center space-x-3 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-md"
                                            >
                                              <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-lg flex flex-col items-center justify-center text-xs font-bold shadow-sm">
                                                <div>
                                                  {peopleMap[txn.from]?.split(
                                                    " "
                                                  )[0] || "?"}
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-center">
                                                <ArrowRight className="h-5 w-5 text-green-600 mb-1" />
                                                <div className="text-xs font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded shadow-sm">
                                                  {formatCurrency(txn.amount)}
                                                </div>
                                              </div>
                                              <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-lg flex flex-col items-center justify-center text-xs font-bold shadow-sm">
                                                <div>
                                                  {peopleMap[txn.to]?.split(
                                                    " "
                                                  )[0] || "?"}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800 shadow-sm">
                                        <div className="text-center">
                                          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                                          <div className="text-sm font-bold text-green-700 dark:text-green-300">
                                            All Settled!
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Results Summary */}
                                {pairwiseTransactions.length >
                                  simplifiedTransactions.length && (
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                        ✨{" "}
                                        {Math.round(
                                          ((pairwiseTransactions.length -
                                            simplifiedTransactions.length) /
                                            pairwiseTransactions.length) *
                                            100
                                        )}
                                        % Reduction
                                      </div>
                                      <div className="text-xs text-blue-600 dark:text-blue-300">
                                        From {pairwiseTransactions.length} →{" "}
                                        {simplifiedTransactions.length}{" "}
                                        transactions
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                            <div>
                              <Shuffle className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                              <p className="font-medium">
                                No settlements to show
                              </p>
                              <p className="text-xs">
                                Add expenses to see the flowchart
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
