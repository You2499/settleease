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
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as "overview" | "person")}
        className="w-full h-full flex flex-col"
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
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
          {" "}
          {/* Adjusted top padding */}
          <TabsContent value="overview" className="mt-0 flex-1 flex flex-col min-h-0">
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
              <ScrollArea className="flex-1 min-h-0 border rounded-md p-1 mt-2">
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
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground mt-2">
                <div>
                  <FileText className="h-12 w-12 mx-auto mb-3 text-primary/30" />
                  <p className="font-medium text-sm sm:text-base">All Settled Up!</p>
                  <p className="text-xs">All debts are settled, or no expenses to settle yet!</p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="person" className="mt-0 flex-1 flex flex-col min-h-0 space-y-3">
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
                          Settlement Network
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Network visualization showing debt connections and
                          optimization
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
                        {pairwiseTransactions.length > 0 ||
                        simplifiedTransactions.length > 0 ? (
                          <div className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="flex-1 min-h-0">
                              <div className="space-y-8 pr-2">
                                {/* Network Visualization */}
                                <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900/50 dark:to-gray-900/50 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                  {/* Individual Debts Network */}
                                  <div className="mb-12">
                                    <div className="text-center mb-8">
                                      <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-full border-2 border-red-300 dark:border-red-700">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span className="text-sm font-bold text-red-800 dark:text-red-200">
                                          COMPLEX DEBT NETWORK (
                                          {pairwiseTransactions.length}{" "}
                                          connections)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Network Container */}
                                    <div className="relative bg-red-50/50 dark:bg-red-950/10 p-8 rounded-lg border border-red-200 dark:border-red-800 min-h-[300px]">
                                      {/* People Nodes positioned in a circle */}
                                      <div className="relative w-full h-[280px]">
                                        {Object.keys(individualBalances)
                                          .filter(
                                            (personId) =>
                                              Math.abs(
                                                individualBalances[personId]
                                              ) > 0.01
                                          )
                                          .map((personId, index, array) => {
                                            const angle =
                                              (index / array.length) *
                                                2 *
                                                Math.PI -
                                              Math.PI / 2;
                                            const radius = 100;
                                            const x =
                                              Math.cos(angle) * radius + 140;
                                            const y =
                                              Math.sin(angle) * radius + 140;
                                            const balance =
                                              individualBalances[personId];
                                            const isCreditor = balance > 0.01;

                                            return (
                                              <div
                                                key={`node-${personId}`}
                                                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                                style={{
                                                  left: `${x}px`,
                                                  top: `${y}px`,
                                                }}
                                              >
                                                <div
                                                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center text-sm font-bold shadow-lg border-2 ${
                                                    isCreditor
                                                      ? "bg-green-200 border-green-400 text-green-800 dark:bg-green-800 dark:border-green-600 dark:text-green-200"
                                                      : "bg-red-200 border-red-400 text-red-800 dark:bg-red-800 dark:border-red-600 dark:text-red-200"
                                                  }`}
                                                >
                                                  <div className="text-xs">
                                                    {peopleMap[
                                                      personId
                                                    ]?.charAt(0) || "?"}
                                                  </div>
                                                  <div className="text-xs font-bold">
                                                    {isCreditor ? "+" : ""}
                                                    {formatCurrency(
                                                      Math.abs(balance)
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="text-xs text-center mt-1 font-medium">
                                                  {peopleMap[personId]?.split(
                                                    " "
                                                  )[0] || "Unknown"}
                                                </div>
                                              </div>
                                            );
                                          })}

                                        {/* Debt Connection Lines */}
                                        <svg
                                          className="absolute inset-0 w-full h-full pointer-events-none"
                                          style={{ zIndex: 1 }}
                                        >
                                          {pairwiseTransactions.map(
                                            (txn, index) => {
                                              const fromIndex = Object.keys(
                                                individualBalances
                                              )
                                                .filter(
                                                  (personId) =>
                                                    Math.abs(
                                                      individualBalances[
                                                        personId
                                                      ]
                                                    ) > 0.01
                                                )
                                                .indexOf(txn.from);
                                              const toIndex = Object.keys(
                                                individualBalances
                                              )
                                                .filter(
                                                  (personId) =>
                                                    Math.abs(
                                                      individualBalances[
                                                        personId
                                                      ]
                                                    ) > 0.01
                                                )
                                                .indexOf(txn.to);

                                              if (
                                                fromIndex === -1 ||
                                                toIndex === -1
                                              )
                                                return null;

                                              const array = Object.keys(
                                                individualBalances
                                              ).filter(
                                                (personId) =>
                                                  Math.abs(
                                                    individualBalances[personId]
                                                  ) > 0.01
                                              );
                                              const fromAngle =
                                                (fromIndex / array.length) *
                                                  2 *
                                                  Math.PI -
                                                Math.PI / 2;
                                              const toAngle =
                                                (toIndex / array.length) *
                                                  2 *
                                                  Math.PI -
                                                Math.PI / 2;
                                              const radius = 100;
                                              const x1 =
                                                Math.cos(fromAngle) * radius +
                                                140;
                                              const y1 =
                                                Math.sin(fromAngle) * radius +
                                                140;
                                              const x2 =
                                                Math.cos(toAngle) * radius +
                                                140;
                                              const y2 =
                                                Math.sin(toAngle) * radius +
                                                140;

                                              return (
                                                <g key={`line-${index}`}>
                                                  <line
                                                    x1={x1}
                                                    y1={y1}
                                                    x2={x2}
                                                    y2={y2}
                                                    stroke="#ef4444"
                                                    strokeWidth="2"
                                                    strokeDasharray="5,5"
                                                    className="animate-pulse"
                                                  />
                                                  {/* Amount label */}
                                                  <text
                                                    x={(x1 + x2) / 2}
                                                    y={(y1 + y2) / 2}
                                                    fill="#dc2626"
                                                    fontSize="10"
                                                    textAnchor="middle"
                                                    className="font-bold"
                                                    style={{
                                                      textShadow:
                                                        "0 0 3px white",
                                                    }}
                                                  >
                                                    {formatCurrency(txn.amount)}
                                                  </text>
                                                </g>
                                              );
                                            }
                                          )}
                                        </svg>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Transformation */}
                                  <div className="flex justify-center my-8">
                                    <div className="flex flex-col items-center">
                                      <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center border-4 border-purple-300 dark:border-purple-700 shadow-xl">
                                        <Shuffle className="h-10 w-10 text-purple-600 animate-spin" />
                                      </div>
                                      <div className="text-center mt-3">
                                        <div className="text-sm font-bold text-purple-600">
                                          OPTIMIZATION
                                        </div>
                                        <div className="text-xs text-purple-500">
                                          Simplifying network...
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Optimized Settlement Network */}
                                  <div className="mt-12">
                                    <div className="text-center mb-8">
                                      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full border-2 border-green-300 dark:border-green-700">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="text-sm font-bold text-green-800 dark:text-green-200">
                                          OPTIMIZED NETWORK (
                                          {simplifiedTransactions.length}{" "}
                                          connections)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Network Container */}
                                    <div className="relative bg-green-50/50 dark:bg-green-950/10 p-8 rounded-lg border border-green-200 dark:border-green-800 min-h-[300px]">
                                      {simplifiedTransactions.length > 0 ? (
                                        <div className="relative w-full h-[280px]">
                                          {/* People Nodes positioned in a circle */}
                                          {Object.keys(individualBalances)
                                            .filter(
                                              (personId) =>
                                                Math.abs(
                                                  individualBalances[personId]
                                                ) > 0.01
                                            )
                                            .map((personId, index, array) => {
                                              const angle =
                                                (index / array.length) *
                                                  2 *
                                                  Math.PI -
                                                Math.PI / 2;
                                              const radius = 100;
                                              const x =
                                                Math.cos(angle) * radius + 140;
                                              const y =
                                                Math.sin(angle) * radius + 140;
                                              const balance =
                                                individualBalances[personId];
                                              const isCreditor = balance > 0.01;

                                              return (
                                                <div
                                                  key={`opt-node-${personId}`}
                                                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                                  style={{
                                                    left: `${x}px`,
                                                    top: `${y}px`,
                                                  }}
                                                >
                                                  <div
                                                    className={`w-18 h-18 rounded-full flex flex-col items-center justify-center text-sm font-bold shadow-xl border-3 ${
                                                      isCreditor
                                                        ? "bg-green-200 border-green-500 text-green-800 dark:bg-green-800 dark:border-green-500 dark:text-green-200"
                                                        : "bg-red-200 border-red-500 text-red-800 dark:bg-red-800 dark:border-red-500 dark:text-red-200"
                                                    }`}
                                                  >
                                                    <div className="text-sm">
                                                      {peopleMap[
                                                        personId
                                                      ]?.charAt(0) || "?"}
                                                    </div>
                                                    <div className="text-xs font-bold">
                                                      {isCreditor ? "+" : ""}
                                                      {formatCurrency(
                                                        Math.abs(balance)
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="text-xs text-center mt-1 font-bold">
                                                    {peopleMap[personId]?.split(
                                                      " "
                                                    )[0] || "Unknown"}
                                                  </div>
                                                </div>
                                              );
                                            })}

                                          {/* Optimized Connection Lines */}
                                          <svg
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                            style={{ zIndex: 1 }}
                                          >
                                            {simplifiedTransactions.map(
                                              (txn, index) => {
                                                const fromIndex = Object.keys(
                                                  individualBalances
                                                )
                                                  .filter(
                                                    (personId) =>
                                                      Math.abs(
                                                        individualBalances[
                                                          personId
                                                        ]
                                                      ) > 0.01
                                                  )
                                                  .indexOf(txn.from);
                                                const toIndex = Object.keys(
                                                  individualBalances
                                                )
                                                  .filter(
                                                    (personId) =>
                                                      Math.abs(
                                                        individualBalances[
                                                          personId
                                                        ]
                                                      ) > 0.01
                                                  )
                                                  .indexOf(txn.to);

                                                if (
                                                  fromIndex === -1 ||
                                                  toIndex === -1
                                                )
                                                  return null;

                                                const array = Object.keys(
                                                  individualBalances
                                                ).filter(
                                                  (personId) =>
                                                    Math.abs(
                                                      individualBalances[
                                                        personId
                                                      ]
                                                    ) > 0.01
                                                );
                                                const fromAngle =
                                                  (fromIndex / array.length) *
                                                    2 *
                                                    Math.PI -
                                                  Math.PI / 2;
                                                const toAngle =
                                                  (toIndex / array.length) *
                                                    2 *
                                                    Math.PI -
                                                  Math.PI / 2;
                                                const radius = 100;
                                                const x1 =
                                                  Math.cos(fromAngle) * radius +
                                                  140;
                                                const y1 =
                                                  Math.sin(fromAngle) * radius +
                                                  140;
                                                const x2 =
                                                  Math.cos(toAngle) * radius +
                                                  140;
                                                const y2 =
                                                  Math.sin(toAngle) * radius +
                                                  140;

                                                return (
                                                  <g key={`opt-line-${index}`}>
                                                    <line
                                                      x1={x1}
                                                      y1={y1}
                                                      x2={x2}
                                                      y2={y2}
                                                      stroke="#22c55e"
                                                      strokeWidth="4"
                                                      className="drop-shadow-sm"
                                                    />
                                                    {/* Arrow marker */}
                                                    <defs>
                                                      <marker
                                                        id={`arrowhead-${index}`}
                                                        markerWidth="10"
                                                        markerHeight="7"
                                                        refX="9"
                                                        refY="3.5"
                                                        orient="auto"
                                                      >
                                                        <polygon
                                                          points="0 0, 10 3.5, 0 7"
                                                          fill="#22c55e"
                                                        />
                                                      </marker>
                                                    </defs>
                                                    <line
                                                      x1={x1}
                                                      y1={y1}
                                                      x2={x2}
                                                      y2={y2}
                                                      stroke="#22c55e"
                                                      strokeWidth="4"
                                                      markerEnd={`url(#arrowhead-${index})`}
                                                    />
                                                    {/* Amount label */}
                                                    <text
                                                      x={(x1 + x2) / 2}
                                                      y={(y1 + y2) / 2 - 5}
                                                      fill="#16a34a"
                                                      fontSize="12"
                                                      textAnchor="middle"
                                                      className="font-bold"
                                                      style={{
                                                        textShadow:
                                                          "0 0 3px white",
                                                      }}
                                                    >
                                                      {formatCurrency(
                                                        txn.amount
                                                      )}
                                                    </text>
                                                  </g>
                                                );
                                              }
                                            )}
                                          </svg>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center h-[280px]">
                                          <div className="text-center">
                                            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                                            <div className="text-xl font-bold text-green-700 dark:text-green-300">
                                              Perfect Balance!
                                            </div>
                                            <div className="text-sm text-green-600 dark:text-green-400">
                                              No payments needed
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Network Analysis */}
                                {pairwiseTransactions.length >
                                  simplifiedTransactions.length && (
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                                        🕸️ Network Simplified by{" "}
                                        {Math.round(
                                          ((pairwiseTransactions.length -
                                            simplifiedTransactions.length) /
                                            pairwiseTransactions.length) *
                                            100
                                        )}
                                        %
                                      </div>
                                      <div className="text-sm text-blue-600 dark:text-blue-300">
                                        From{" "}
                                        <strong>
                                          {pairwiseTransactions.length} complex
                                          connections
                                        </strong>{" "}
                                        to{" "}
                                        <strong>
                                          {simplifiedTransactions.length} clean
                                          paths
                                        </strong>
                                      </div>
                                      <div className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                                        Same balances, cleaner network, fewer
                                        transactions
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Network Legend */}
                                <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                                  <div className="text-center">
                                    <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                      Network Legend
                                    </div>
                                    <div className="flex justify-center space-x-6 text-xs">
                                      <div className="flex items-center">
                                        <div className="w-4 h-4 bg-green-200 border-2 border-green-400 rounded-full mr-2"></div>
                                        <span>Should Receive Money</span>
                                      </div>
                                      <div className="flex items-center">
                                        <div className="w-4 h-4 bg-red-200 border-2 border-red-400 rounded-full mr-2"></div>
                                        <span>Should Pay Money</span>
                                      </div>
                                      <div className="flex items-center">
                                        <div className="w-6 h-0.5 bg-green-500 mr-2"></div>
                                        <span>Optimized Payment</span>
                                      </div>
                                      <div className="flex items-center">
                                        <div className="w-6 h-0.5 bg-red-400 border-dashed mr-2"></div>
                                        <span>Individual Debt</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Main Flowchart */}
                                <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900/50 dark:to-gray-900/50 p-8 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                                  {/* Individual Debts Section */}
                                  <div className="mb-8">
                                    <div className="text-center mb-6">
                                      <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-full border-2 border-red-300 dark:border-red-700">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span className="text-sm font-bold text-red-800 dark:text-red-200">
                                          INDIVIDUAL DEBTS (
                                          {pairwiseTransactions.length} payments
                                          needed)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Individual Debt Lines */}
                                    <div className="space-y-3">
                                      {pairwiseTransactions.map(
                                        (txn, index) => (
                                          <div
                                            key={`individual-${index}`}
                                            className="flex items-center justify-center"
                                          >
                                            <div className="flex items-center bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800 shadow-sm min-w-[300px]">
                                              {/* From Person */}
                                              <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-sm font-bold text-red-800 dark:text-red-200 shadow-sm">
                                                  {peopleMap[txn.from]?.charAt(
                                                    0
                                                  ) || "?"}
                                                </div>
                                                <div className="text-xs font-medium text-red-700 dark:text-red-300 mt-1">
                                                  {peopleMap[txn.from]?.split(
                                                    " "
                                                  )[0] || "Unknown"}
                                                </div>
                                              </div>

                                              {/* Arrow and Amount */}
                                              <div className="flex-1 flex flex-col items-center mx-4">
                                                <div className="flex items-center w-full">
                                                  <div className="flex-1 h-0.5 bg-red-400 dark:bg-red-600"></div>
                                                  <ArrowRight className="h-4 w-4 text-red-600 mx-2" />
                                                  <div className="flex-1 h-0.5 bg-red-400 dark:bg-red-600"></div>
                                                </div>
                                                <div className="bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-full mt-2">
                                                  <span className="text-sm font-bold text-red-700 dark:text-red-300">
                                                    {formatCurrency(txn.amount)}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* To Person */}
                                              <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center text-sm font-bold text-red-800 dark:text-red-200 shadow-sm">
                                                  {peopleMap[txn.to]?.charAt(
                                                    0
                                                  ) || "?"}
                                                </div>
                                                <div className="text-xs font-medium text-red-700 dark:text-red-300 mt-1">
                                                  {peopleMap[txn.to]?.split(
                                                    " "
                                                  )[0] || "Unknown"}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>

                                  {/* Transformation Arrow */}
                                  <div className="flex justify-center my-8">
                                    <div className="flex flex-col items-center">
                                      <div className="w-1 h-12 bg-purple-400 dark:bg-purple-600"></div>
                                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center border-4 border-purple-300 dark:border-purple-700 shadow-lg">
                                        <Shuffle className="h-8 w-8 text-purple-600 animate-pulse" />
                                      </div>
                                      <div className="w-1 h-12 bg-purple-400 dark:bg-purple-600"></div>
                                      <div className="w-0 h-0 border-l-6 border-r-6 border-t-8 border-transparent border-t-purple-400 dark:border-t-purple-600"></div>
                                      <div className="text-center mt-2">
                                        <div className="text-xs font-bold text-purple-600">
                                          ALGORITHM
                                        </div>
                                        <div className="text-xs text-purple-500">
                                          Optimizing...
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Optimized Settlement Section */}
                                  <div className="mt-8">
                                    <div className="text-center mb-6">
                                      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full border-2 border-green-300 dark:border-green-700">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="text-sm font-bold text-green-800 dark:text-green-200">
                                          OPTIMIZED SETTLEMENT (
                                          {simplifiedTransactions.length}{" "}
                                          payments needed)
                                        </span>
                                      </div>
                                    </div>

                                    {/* Optimized Settlement Lines */}
                                    {simplifiedTransactions.length > 0 ? (
                                      <div className="space-y-4">
                                        {simplifiedTransactions.map(
                                          (txn, index) => (
                                            <div
                                              key={`optimized-${index}`}
                                              className="flex items-center justify-center"
                                            >
                                              <div className="flex items-center bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-md min-w-[350px]">
                                                {/* From Person */}
                                                <div className="flex flex-col items-center">
                                                  <div className="w-16 h-16 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-lg font-bold text-green-800 dark:text-green-200 shadow-md border-2 border-green-300 dark:border-green-600">
                                                    {peopleMap[
                                                      txn.from
                                                    ]?.charAt(0) || "?"}
                                                  </div>
                                                  <div className="text-sm font-bold text-green-700 dark:text-green-300 mt-2">
                                                    {peopleMap[txn.from]?.split(
                                                      " "
                                                    )[0] || "Unknown"}
                                                  </div>
                                                </div>

                                                {/* Arrow and Amount */}
                                                <div className="flex-1 flex flex-col items-center mx-6">
                                                  <div className="flex items-center w-full">
                                                    <div className="flex-1 h-1 bg-green-500 dark:bg-green-600 rounded-full"></div>
                                                    <ArrowRight className="h-6 w-6 text-green-600 mx-3" />
                                                    <div className="flex-1 h-1 bg-green-500 dark:bg-green-600 rounded-full"></div>
                                                  </div>
                                                  <div className="bg-green-200 dark:bg-green-800 px-4 py-2 rounded-full mt-3 shadow-sm border border-green-300 dark:border-green-600">
                                                    <span className="text-lg font-bold text-green-800 dark:text-green-200">
                                                      {formatCurrency(
                                                        txn.amount
                                                      )}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* To Person */}
                                                <div className="flex flex-col items-center">
                                                  <div className="w-16 h-16 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-lg font-bold text-green-800 dark:text-green-200 shadow-md border-2 border-green-300 dark:border-green-600">
                                                    {peopleMap[txn.to]?.charAt(
                                                      0
                                                    ) || "?"}
                                                  </div>
                                                  <div className="text-sm font-bold text-green-700 dark:text-green-300 mt-2">
                                                    {peopleMap[txn.to]?.split(
                                                      " "
                                                    )[0] || "Unknown"}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-center">
                                        <div className="inline-flex items-center bg-green-50 dark:bg-green-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                                          <CheckCircle2 className="h-12 w-12 text-green-500 mr-3" />
                                          <div>
                                            <div className="text-lg font-bold text-green-700 dark:text-green-300">
                                              All Settled!
                                            </div>
                                            <div className="text-sm text-green-600 dark:text-green-400">
                                              No payments needed
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Efficiency Summary */}
                                {pairwiseTransactions.length >
                                  simplifiedTransactions.length && (
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                                        ✨{" "}
                                        {Math.round(
                                          ((pairwiseTransactions.length -
                                            simplifiedTransactions.length) /
                                            pairwiseTransactions.length) *
                                            100
                                        )}
                                        % More Efficient!
                                      </div>
                                      <div className="text-sm text-blue-600 dark:text-blue-300">
                                        Reduced from{" "}
                                        <strong>
                                          {pairwiseTransactions.length}{" "}
                                          individual payments
                                        </strong>{" "}
                                        to{" "}
                                        <strong>
                                          {simplifiedTransactions.length}{" "}
                                          optimized payments
                                        </strong>
                                      </div>
                                      <div className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                                        Same result, fewer transactions,
                                        completely fair to everyone
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Fairness Guarantee */}
                                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                  <div className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-2" />
                                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                        Fairness Guaranteed
                                      </span>
                                    </div>
                                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                      Every person pays/receives exactly what
                                      they owe/are owed. The algorithm only
                                      changes WHO pays WHOM, never the amounts.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                            <div>
                              <Shuffle className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                              <p className="font-medium">
                                No settlements to visualize
                              </p>
                              <p className="text-xs">
                                Add expenses to see the settlement flowchart
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
