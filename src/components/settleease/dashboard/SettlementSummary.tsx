"use client";

import React, { useState, useMemo, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Users,
  Handshake,
  CheckCircle2,
  FileText,
  Info,
  Calculator,
  EyeOff,
  Eye,
  Sparkles,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeJsonHash } from "@/lib/settleease/hashUtils";
import { calculateNetBalances } from "@/lib/settleease/settlementCalculations";
import AISummaryTooltip from "./AISummaryTooltip";
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
  onViewExpenseDetailsFromStep2?: (expense: Expense) => void;

  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
  categories: any[];
  userRole: UserRole;
  db?: SupabaseClient;
  currentUserId?: string;
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingSettlements?: boolean;
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
  onViewExpenseDetailsFromStep2,
  getCategoryIconFromName,
  categories,
  userRole,
  db,
  currentUserId,
}: SettlementSummaryProps) {
  const [viewMode, setViewMode] = useState<"overview" | "person">("overview");
  const [simplifySettlement, setSimplifySettlement] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [showBalancedPeople, setShowBalancedPeople] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [summaryJsonData, setSummaryJsonData] = useState<any>(null);
  const [summaryHash, setSummaryHash] = useState<string>("");
  const [isComputingHash, setIsComputingHash] = useState(false);
  const summaryButtonRef = useRef<HTMLButtonElement>(null);

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

    // Use the centralized net balance calculation for consistency
    const netBalances = calculateNetBalances(
      people,
      allExpenses,
      settlementPayments
    );
    Object.keys(balances).forEach((personId) => {
      balances[personId].netBalance = netBalances[personId] || 0;
    });

    return balances;
  }, [allExpenses, settlementPayments, people]);

  // Filter out balanced people if toggle is off
  const filteredPeople = useMemo(() => {
    if (showBalancedPeople) {
      return people;
    }
    return people.filter((person) => {
      const balance = personBalances[person.id];
      return balance && Math.abs(balance.netBalance) > 0.01;
    });
  }, [people, personBalances, showBalancedPeople]);

  const filteredPersonBalances = useMemo(() => {
    if (showBalancedPeople) {
      return personBalances;
    }
    const filtered: typeof personBalances = {};
    filteredPeople.forEach((person) => {
      filtered[person.id] = personBalances[person.id];
    });
    return filtered;
  }, [personBalances, filteredPeople, showBalancedPeople]);

  // Build full debug object for hashing (excluding timestamp and user-specific UI state to ensure consistent hashing across all users)
  const fullDebug = useMemo(() => {
    const netBalances = calculateNetBalances(people, allExpenses, settlementPayments);
    
    return {
      // NOTE: No timestamp or user-specific UI state here to ensure ALL users get the same hash for the same data
      // This enables cross-user caching of AI summaries
      counts: {
        people: people.length,
        expenses: allExpenses.length,
        settlementPayments: settlementPayments.length,
        pairwiseTransactions: pairwiseTransactions.length,
        simplifiedTransactions: simplifiedTransactions.length,
      },
      overviewDescriptions: {
        simplifyOn: "Minimum transactions required to settle all debts.",
        simplifyOff: "Detailed pairwise debts reflecting direct expense involvements and payments.",
      },
      personBalances,
      transactions: {
        pairwise: pairwiseTransactions,
        simplified: simplifiedTransactions,
      },
      categories,
      settlementPayments,
      expenses: allExpenses,
      people,
    };
  }, [people, allExpenses, settlementPayments, pairwiseTransactions, simplifiedTransactions, personBalances, categories]);

  const handleSummarise = async () => {
    if (!fullDebug || isComputingHash) return;
    
    try {
      setIsComputingHash(true);
      console.log("🔄 Computing hash for current data...");
      const hash = await computeJsonHash(fullDebug);
      console.log("🔑 Generated hash:", hash);
      
      setSummaryJsonData(fullDebug);
      setSummaryHash(hash);
      setIsSummaryDialogOpen(true);
    } catch (error: any) {
      console.error("❌ Error computing hash:", error);
    } finally {
      setIsComputingHash(false);
    }
  };

  const transactionsToDisplay = useMemo(() => {
    if (simplifySettlement) {
      // For simplified transactions, always show all transactions
      // The balanced people toggle only affects the modal view, not the main settlement view
      return simplifiedTransactions;
    }

    // For pairwise transactions, always show all transactions in the main view
    // The balanced people toggle only affects the modal view
    return pairwiseTransactions;
  }, [
    simplifySettlement,
    simplifiedTransactions,
    pairwiseTransactions,
  ]);

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
  }, [
    simplifiedTransactions,
    settlementPayments,
  ]);

  // Filtered versions for the modal that respect the showBalancedPeople toggle
  const modalUnpaidSimplifiedTransactions = useMemo(() => {
    let filteredTransactions = unpaidSimplifiedTransactions;

    // Filter out transactions involving balanced people unless showBalancedPeople is true
    if (!showBalancedPeople) {
      const visiblePeopleIds = new Set(filteredPeople.map((p) => p.id));
      filteredTransactions = unpaidSimplifiedTransactions.filter(
        (txn) => visiblePeopleIds.has(txn.from) && visiblePeopleIds.has(txn.to)
      );
    }

    return filteredTransactions;
  }, [
    unpaidSimplifiedTransactions,
    showBalancedPeople,
    filteredPeople,
  ]);

  return (
    <Card className="w-full h-full flex flex-col shadow-lg rounded-lg">
      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as "overview" | "person")}
        className="w-full h-full flex flex-col"
      >
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Handshake className="mr-2 h-5 w-5 text-primary" /> Settlement
                Hub
              </CardTitle>
              <Button
                ref={summaryButtonRef}
                size="sm"
                variant="outline"
                onClick={handleSummarise}
                disabled={isComputingHash}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isComputingHash ? "Computing..." : "Summarise"}
              </Button>
              {/* <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInfoModalOpen(true)}
              >
                <Info className="mr-1 h-4 w-4" /> How it Works
              </Button> */}
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
                        <div className="flex flex-col sm:grid sm:grid-cols-5 items-start sm:items-center gap-2 sm:gap-1.5">
                          <div className="col-span-1 sm:col-span-3 w-full">
                            <div className="flex items-center justify-between sm:grid sm:grid-cols-3 w-full">
                              <span className="truncate font-medium text-foreground text-base sm:text-sm px-1 min-w-0 flex-1 sm:col-span-1 sm:justify-self-start">
                                {peopleMap[txn.from] || "Unknown"}
                              </span>
                              <span className="flex items-center justify-center w-5 mx-1 flex-shrink-0 sm:col-span-1 sm:justify-self-center">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm px-1 min-w-0 flex-1 text-right sm:text-left sm:col-span-1 sm:justify-self-center">
                                {peopleMap[txn.to] || "Unknown"}
                              </span>
                            </div>
                          </div>
                          <span className="font-bold text-green-700 text-base sm:text-lg col-span-1 sm:col-span-1 self-end sm:self-center sm:text-right w-full sm:w-auto">
                            {formatCurrency(txn.amount)}
                          </span>
                          <div className="flex-shrink-0 flex justify-center col-span-1 sm:col-span-1 w-full sm:w-auto">
                            {userRole === "admin" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInternalMarkAsPaid(txn)}
                                disabled={isLoading}
                                className="text-xs px-2 py-1 h-auto w-full sm:w-auto"
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Mark as Paid
                              </Button>
                            ) : null}
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
            className="mt-0 flex-1 flex flex-col min-h-0 space-y-3 prevent-horizontal-scroll"
          >
            <div className="flex flex-col gap-3 bg-muted/50 px-3 py-2 rounded-md">
              <Label
                htmlFor="person-select"
                className="text-xs sm:text-sm font-medium"
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
                  className="h-9 text-xs sm:text-sm w-full"
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
                getCategoryIconFromName={getCategoryIconFromName}
                categories={categories}
                isLoadingParent={isLoading}
                setIsLoadingParent={setIsLoading}
                userRole={userRole}
                // onOpenHowItWorksModal={() => setIsInfoModalOpen(true)}
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
        <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar" hideCloseButton={false}>
          <div className="space-y-4 w-full min-w-0">
            {/* How Settlement Works Section */}
            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#4285F4]/30 dark:border-[#4285F4]/20 rounded-lg overflow-hidden w-full">
              <div className="px-3 sm:px-4 py-3 bg-[#4285F4]/10 dark:bg-[#4285F4]/5">
                <div className="flex items-center space-x-2 min-w-0">
                  <Calculator className="h-4 w-4 text-[#4285F4] flex-shrink-0" />
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                    How Settlement Works - Simple & Transparent
                  </span>
                </div>
              </div>
              <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90 w-full min-w-0">

                {/* Toggle for balanced people */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border mb-4 gap-3 sm:gap-0 w-full min-w-0">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    {showBalancedPeople ? (
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                    )}
                    <Label
                      htmlFor="show-balanced"
                      className="text-sm font-medium cursor-pointer truncate"
                    >
                      Show balanced people
                    </Label>
                    {!showBalancedPeople &&
                      people.length - filteredPeople.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                          {people.length - filteredPeople.length} hidden
                        </span>
                      )}
                  </div>
                  <Switch
                    id="show-balanced"
                    checked={showBalancedPeople}
                    onCheckedChange={setShowBalancedPeople}
                    className="flex-shrink-0"
                  />
                </div>

                <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-x-hidden">
                  <div className="w-full min-w-0">
                    <Step1BalanceOverview
                      personBalances={filteredPersonBalances}
                      people={filteredPeople}
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <Step2DirectDebtAnalysis
                      allExpenses={allExpenses}
                      personBalances={filteredPersonBalances}
                      people={filteredPeople}
                      peopleMap={peopleMap}
                      onExpenseClick={onViewExpenseDetailsFromStep2}
                    />
                  </div>

                  <div className="w-full min-w-0">
                    <Step3SimplificationProcess
                      pairwiseTransactions={pairwiseTransactions}
                      unpaidSimplifiedTransactions={modalUnpaidSimplifiedTransactions}
                      personBalances={filteredPersonBalances}
                      people={filteredPeople}
                      peopleMap={peopleMap}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Summary Dialog */}
      {summaryJsonData && (
        <AISummaryTooltip
          open={isSummaryDialogOpen}
          onOpenChange={setIsSummaryDialogOpen}
          jsonData={summaryJsonData}
          hash={summaryHash}
          db={db}
          currentUserId={currentUserId || ""}
          triggerRef={summaryButtonRef}
        />
      )}
    </Card>
  );
}
