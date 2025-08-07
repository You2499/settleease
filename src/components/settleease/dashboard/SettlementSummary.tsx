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
  Calculator,
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
import Step1BalanceOverview from "./settlement-steps/Step1BalanceOverview";
import Step2DirectDebtAnalysis from "./settlement-steps/Step2DirectDebtAnalysis";
import Step3SimplificationProcess from "./settlement-steps/Step3SimplificationProcess";
import Step4SettlementOptions from "./settlement-steps/Step4SettlementOptions";
import TrustSection from "./settlement-steps/TrustSection";

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

  // Calculate person balances using the same logic as DashboardView
  const personBalances = useMemo(() => {
    const balances: Record<
      string,
      {
        totalPaid: number;
        totalOwed: number;
        settledAsDebtor: number;
        settledAsCreditor: number;
        netBalance: number;
      }
    > = {};

    // Initialize balances for all people
    people.forEach((person) => {
      balances[person.id] = {
        totalPaid: 0,
        totalOwed: 0,
        settledAsDebtor: 0,
        settledAsCreditor: 0,
        netBalance: 0,
      };
    });

    // Calculate from expenses
    allExpenses.forEach((expense) => {
      // What they paid
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach((payment) => {
          if (balances[payment.personId]) {
            balances[payment.personId].totalPaid += Number(payment.amount);
          }
        });
      }

      // What they owe (shares + celebration contributions)
      if (Array.isArray(expense.shares)) {
        expense.shares.forEach((share) => {
          if (balances[share.personId]) {
            balances[share.personId].totalOwed += Number(share.amount);
          }
        });
      }

      // Celebration contributions
      if (
        expense.celebration_contribution &&
        expense.celebration_contribution.amount > 0
      ) {
        const contributorId = expense.celebration_contribution.personId;
        if (balances[contributorId]) {
          balances[contributorId].totalOwed += Number(
            expense.celebration_contribution.amount
          );
        }
      }
    });

    // Add settlement payments
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

    // Calculate net balances
    Object.keys(balances).forEach((personId) => {
      const person = balances[personId];
      person.netBalance =
        person.totalPaid -
        person.totalOwed +
        person.settledAsDebtor -
        person.settledAsCreditor;
    });

    return balances;
  }, [allExpenses, settlementPayments, people]);

  const unpaidSimplifiedTransactions = useMemo(() => {
    return simplifiedTransactions.filter((txn) => {
      // Check if this transaction has been fully settled
      const settledAmount = settlementPayments
        .filter(
          (payment) =>
            payment.debtor_id === txn.from && payment.creditor_id === txn.to
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
                <Info className="mr-1 h-4 w-4" /> How it Works
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
                                {peopleMap[txn.from] || "Unknown"}
                              </span>
                              <span className="flex items-center justify-center w-5 mx-1 col-span-1 justify-self-center">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-right px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-center">
                                {peopleMap[txn.to] || "Unknown"}
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

      {/* Mobile-Responsive Settlement Explanation Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-h-[95vh] w-[95vw] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <DialogTitle className="text-lg sm:text-xl md:text-2xl text-primary flex items-center">
              <Calculator className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              How Settlement Works - Simple & Transparent
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 sm:px-6">
            <div className="space-y-4 sm:space-y-6 py-4">
              <Step1BalanceOverview 
                personBalances={personBalances}
                people={people}
              />

              <Step2DirectDebtAnalysis
                allExpenses={allExpenses}
                settlementPayments={settlementPayments}
                personBalances={personBalances}
                people={people}
                peopleMap={peopleMap}
              />

              <Step3SimplificationProcess
                pairwiseTransactions={pairwiseTransactions}
                unpaidSimplifiedTransactions={unpaidSimplifiedTransactions}
                personBalances={personBalances}
                people={people}
                peopleMap={peopleMap}
              />

              <Step4SettlementOptions
                pairwiseTransactions={pairwiseTransactions}
                unpaidSimplifiedTransactions={unpaidSimplifiedTransactions}
                peopleMap={peopleMap}
              />

              <TrustSection />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}