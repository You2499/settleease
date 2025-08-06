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

  // Filter out paid transactions for mindmap visualization
  const unpaidPairwiseTransactions = useMemo(() => {
    return pairwiseTransactions.filter((txn) => {
      // Check if this transaction has been fully settled
      const settledAmount = settlementPayments
        .filter(payment => 
          payment.debtor_id === txn.from && 
          payment.creditor_id === txn.to
        )
        .reduce((sum, payment) => sum + Number(payment.amount_settled), 0);
      
      // Only include if there's still an outstanding amount
      return Number(txn.amount) > settledAmount;
    });
  }, [pairwiseTransactions, settlementPayments]);

  const unpaidSimplifiedTransactions = useMemo(() => {
    return simplifiedTransactions.filter((txn) => {
      // Check if this transaction has been fully settled
      const settledAmount = settlementPayments
        .filter(payment => 
          payment.debtor_id === txn.from && 
          payment.creditor_id === txn.to
        )
        .reduce((sum, payment) => sum + Number(payment.amount_settled), 0);
      
      // Only include if there's still an outstanding amount
      return Number(txn.amount) > settledAmount;
    });
  }, [simplifiedTransactions, settlementPayments]);

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as "overview" | "person")}
        className="w-full h-full flex flex-col"
      >
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
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
          <TabsContent
            value="overview"
            className="mt-0 flex-1 flex flex-col min-h-0"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 px-3 py-2 rounded-md gap-2">
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
                  <p className="font-medium text-sm sm:text-base">
                    All Settled Up!
                  </p>
                  <p className="text-xs">
                    All debts are settled, or no expenses to settle yet!
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent
            value="person"
            className="mt-0 flex-1 flex flex-col min-h-0 space-y-3"
          >
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 items-center bg-muted/50 px-3 py-2 rounded-md">
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

      {/* Settlement Info Modal - Simplified with just 2 mindmaps */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar max-w-4xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Settlement Networks
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
            <div className="space-y-6 pt-2">
              {unpaidPairwiseTransactions.length > 0 ||
              unpaidSimplifiedTransactions.length > 0 ? (
                <>
                  {/* Individual Debts Mindmap */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
                        Outstanding Individual Debts
                      </h3>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        {unpaidPairwiseTransactions.length} unpaid connections showing
                        remaining individual debts
                      </p>
                    </div>

                    <div className="relative w-full h-[450px] bg-white/50 dark:bg-gray-900/50 rounded-lg border border-red-200 dark:border-red-700 overflow-hidden">
                      {unpaidPairwiseTransactions.length > 0 ? (
                        <>
                          {/* People Nodes - Vertical Layout */}
                          {Object.keys(individualBalances)
                            .filter(
                              (personId) =>
                                Math.abs(individualBalances[personId]) > 0.01
                            )
                            .map((personId, index, array) => {
                              const spacing = Math.min(
                                80,
                                350 / Math.max(array.length - 1, 1)
                              );
                              const startY = 50;
                              const y = startY + index * spacing;
                              const x = 100; // Fixed x position for vertical layout
                              const balance = individualBalances[personId];
                              const isCreditor = balance > 0.01;

                              return (
                                <div
                                  key={`node-${personId}`}
                                  className="absolute"
                                  style={{
                                    left: `${x - 40}px`,
                                    top: `${y - 30}px`,
                                    zIndex: 10,
                                  }}
                                >
                                  <div
                                    className={`w-20 h-16 rounded-lg flex items-center justify-center shadow-lg border-2 ${
                                      isCreditor
                                        ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/70 dark:border-green-500 dark:text-green-200"
                                        : "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/70 dark:border-red-500 dark:text-red-200"
                                    }`}
                                  >
                                    <div className="text-center">
                                      <div className="text-lg font-bold">
                                        {peopleMap[personId]?.charAt(0) || "?"}
                                      </div>
                                      <div className="text-xs font-medium truncate max-w-[70px]">
                                        {peopleMap[personId]?.split(" ")[0] ||
                                          "Unknown"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                          {/* Connection Lines - Straight Vertical Layout */}
                          <svg
                            className="absolute inset-0 w-full h-full"
                            style={{ zIndex: 1 }}
                          >
                            <defs>
                              <marker
                                id="arrowhead-red-debt"
                                markerWidth="8"
                                markerHeight="6"
                                refX="7"
                                refY="3"
                                orient="auto"
                              >
                                <polygon
                                  points="0 0, 8 3, 0 6"
                                  fill="#ef4444"
                                />
                              </marker>
                            </defs>
                            {(() => {
                              const peopleArray = Object.keys(
                                individualBalances
                              ).filter(
                                (personId) =>
                                  Math.abs(individualBalances[personId]) > 0.01
                              );

                              // Group transactions by connection pairs to handle bidirectional cases
                              const connectionGroups: Record<
                                string,
                                typeof unpaidPairwiseTransactions
                              > = {};
                              unpaidPairwiseTransactions.forEach((txn) => {
                                const key = [txn.from, txn.to].sort().join("-");
                                if (!connectionGroups[key])
                                  connectionGroups[key] = [];
                                connectionGroups[key].push(txn);
                              });

                              return Object.entries(connectionGroups).flatMap(
                                ([connectionKey, transactions], groupIndex) => {
                                  return transactions.map((txn, txnIndex) => {
                                    const fromIndex = peopleArray.indexOf(
                                      txn.from
                                    );
                                    const toIndex = peopleArray.indexOf(txn.to);

                                    if (fromIndex === -1 || toIndex === -1)
                                      return null;

                                    const spacing = Math.min(
                                      80,
                                      350 / Math.max(peopleArray.length - 1, 1)
                                    );
                                    const startY = 50;
                                    const fromY = startY + fromIndex * spacing;
                                    const toY = startY + toIndex * spacing;
                                    const nodeX = 100;

                                    // Calculate connection points
                                    const fromX = nodeX + 40; // Right edge of from node
                                    const toX = nodeX - 40; // Left edge of to node

                                    // For multiple connections, create vertical offset lanes
                                    const laneOffset =
                                      transactions.length > 1
                                        ? 40 + txnIndex * 35
                                        : 40;
                                    const rightX = nodeX + 40 + laneOffset;

                                    // Label position - positioned to the right of the line
                                    const labelX = rightX + 25;
                                    const labelY = (fromY + toY) / 2;

                                    return (
                                      <g key={`line-${groupIndex}-${txnIndex}`}>
                                        {/* Three-segment straight line path */}
                                        <polyline
                                          points={`${fromX},${fromY} ${rightX},${fromY} ${rightX},${toY} ${toX},${toY}`}
                                          stroke="#ef4444"
                                          strokeWidth="2"
                                          strokeDasharray="5,5"
                                          fill="none"
                                          markerEnd="url(#arrowhead-red-debt)"
                                          opacity="0.8"
                                        />
                                        <rect
                                          x={labelX - 22}
                                          y={labelY - 10}
                                          width="44"
                                          height="20"
                                          fill="white"
                                          fillOpacity="0.95"
                                          rx="4"
                                          stroke="#ef4444"
                                          strokeWidth="1"
                                        />
                                        <text
                                          x={labelX}
                                          y={labelY + 3}
                                          fill="#dc2626"
                                          fontSize="11"
                                          textAnchor="middle"
                                          className="font-bold"
                                        >
                                          {formatCurrency(txn.amount)}
                                        </text>
                                      </g>
                                    );
                                  });
                                }
                              );
                            })()}
                          </svg>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <CheckCircle2 className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                            <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                              No Individual Debts
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optimized Settlement Mindmap */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">
                        Optimized Settlement Network
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        {unpaidSimplifiedTransactions.length} outstanding efficient connections
                        for minimal transactions
                      </p>
                    </div>

                    <div className="relative w-full h-[450px] bg-white/50 dark:bg-gray-900/50 rounded-lg border border-green-200 dark:border-green-700 overflow-hidden">
                      {unpaidSimplifiedTransactions.length > 0 ? (
                        <>
                          {/* People Nodes - Vertical Layout */}
                          {Object.keys(individualBalances)
                            .filter(
                              (personId) =>
                                Math.abs(individualBalances[personId]) > 0.01
                            )
                            .map((personId, index, array) => {
                              const spacing = Math.min(
                                80,
                                350 / Math.max(array.length - 1, 1)
                              );
                              const startY = 50;
                              const y = startY + index * spacing;
                              const x = 100; // Fixed x position for vertical layout
                              const balance = individualBalances[personId];
                              const isCreditor = balance > 0.01;

                              return (
                                <div
                                  key={`opt-node-${personId}`}
                                  className="absolute"
                                  style={{
                                    left: `${x - 40}px`,
                                    top: `${y - 30}px`,
                                    zIndex: 10,
                                  }}
                                >
                                  <div
                                    className={`w-20 h-16 rounded-lg flex items-center justify-center shadow-xl border-3 ${
                                      isCreditor
                                        ? "bg-green-100 border-green-500 text-green-800 dark:bg-green-900/70 dark:border-green-500 dark:text-green-200"
                                        : "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/70 dark:border-red-500 dark:text-red-200"
                                    }`}
                                  >
                                    <div className="text-center">
                                      <div className="text-lg font-bold">
                                        {peopleMap[personId]?.charAt(0) || "?"}
                                      </div>
                                      <div className="text-xs font-medium truncate max-w-[70px]">
                                        {peopleMap[personId]?.split(" ")[0] ||
                                          "Unknown"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                          {/* Optimized Connection Lines - Straight Vertical Layout */}
                          <svg
                            className="absolute inset-0 w-full h-full"
                            style={{ zIndex: 1 }}
                          >
                            <defs>
                              <marker
                                id="arrowhead-green-opt"
                                markerWidth="10"
                                markerHeight="8"
                                refX="9"
                                refY="4"
                                orient="auto"
                              >
                                <polygon
                                  points="0 0, 10 4, 0 8"
                                  fill="#22c55e"
                                />
                              </marker>
                            </defs>
                            {unpaidSimplifiedTransactions.map((txn, index) => {
                              const peopleArray = Object.keys(
                                individualBalances
                              ).filter(
                                (personId) =>
                                  Math.abs(individualBalances[personId]) > 0.01
                              );
                              const fromIndex = peopleArray.indexOf(txn.from);
                              const toIndex = peopleArray.indexOf(txn.to);

                              if (fromIndex === -1 || toIndex === -1)
                                return null;

                              const spacing = Math.min(
                                80,
                                350 / Math.max(peopleArray.length - 1, 1)
                              );
                              const startY = 50;
                              const fromY = startY + fromIndex * spacing;
                              const toY = startY + toIndex * spacing;
                              const nodeX = 100;

                              // Calculate connection points
                              const fromX = nodeX + 40; // Right edge of from node
                              const toX = nodeX - 40; // Left edge of to node

                              // For optimized connections, use single lane with more spacing
                              const rightX = nodeX + 40 + 60; // Single lane for cleaner look

                              // Label position - positioned to the right of the line
                              const labelX = rightX + 30;
                              const labelY = (fromY + toY) / 2;

                              return (
                                <g key={`opt-line-${index}`}>
                                  {/* Three-segment straight line path */}
                                  <polyline
                                    points={`${fromX},${fromY} ${rightX},${fromY} ${rightX},${toY} ${toX},${toY}`}
                                    stroke="#22c55e"
                                    strokeWidth="4"
                                    fill="none"
                                    markerEnd="url(#arrowhead-green-opt)"
                                    className="drop-shadow-sm"
                                  />
                                  <rect
                                    x={labelX - 25}
                                    y={labelY - 12}
                                    width="50"
                                    height="24"
                                    fill="white"
                                    fillOpacity="0.95"
                                    rx="4"
                                    stroke="#22c55e"
                                    strokeWidth="2"
                                  />
                                  <text
                                    x={labelX}
                                    y={labelY + 3}
                                    fill="#16a34a"
                                    fontSize="13"
                                    textAnchor="middle"
                                    className="font-bold"
                                  >
                                    {formatCurrency(txn.amount)}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              Perfect Balance!
                            </div>
                            <div className="text-lg text-green-600 dark:text-green-400">
                              No payments needed
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64 text-center text-muted-foreground">
                  <div>
                    <Shuffle className="h-12 w-12 mx-auto mb-3" />
                    <p className="font-medium">No settlement data available</p>
                    <p className="text-xs">
                      Add some expenses to see settlement networks.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
