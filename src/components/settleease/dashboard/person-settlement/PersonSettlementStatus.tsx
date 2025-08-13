"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Handshake,
  Info,
  Calculator,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/settleease/utils";
import type {
  Person,
  CalculatedTransaction,
  UserRole,
} from "@/lib/settleease/types";
import type { PersonSummary } from "./types";

interface PersonSettlementStatusProps {
  selectedPerson: Person;
  personSummary: PersonSummary;
  personDebtsSimplified: CalculatedTransaction[];
  personCreditsSimplified: CalculatedTransaction[];
  peopleMap: Record<string, string>;
  userRole: UserRole;
  isLoadingParent: boolean;
  onMarkAsPaid: (transaction: CalculatedTransaction) => Promise<void>;
  onViewRelevantExpenses: (
    transaction: CalculatedTransaction,
    type: "debt" | "credit"
  ) => void;
}

export default function PersonSettlementStatus({
  selectedPerson,
  personSummary,
  personDebtsSimplified,
  personCreditsSimplified,
  peopleMap,
  userRole,
  isLoadingParent,
  onMarkAsPaid,
  onViewRelevantExpenses,
}: PersonSettlementStatusProps) {
  const [isHowItWorksModalOpen, setIsHowItWorksModalOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-lg font-bold">
              <Handshake className="mr-2 h-5 w-5 text-purple-600" />
              Step 3: Current Settlement Status
            </CardTitle>
            <CardDescription className="text-sm">
              {personSummary.isBalanced
                ? "This person is balanced - their debts and credits cancel out"
                : "Outstanding debts and credits requiring settlement"}
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsHowItWorksModalOpen(true)}
            className="flex-shrink-0 ml-4"
          >
            <Info className="mr-1 h-4 w-4" /> How it Works
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Settlement Status - Consistent for all people */}
        <div className="space-y-4">
          {personSummary.isBalanced ? (
            /* Balanced Person Status */
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-300 dark:border-green-700 shadow-sm">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    {selectedPerson.name} is All Balanced!
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Their total payments ({formatCurrency(personSummary.totalPaid)}) minus their total obligations ({formatCurrency(personSummary.totalOwed)}) 
                    {(personSummary.totalSettledAsDebtor > 0 || personSummary.totalSettledAsCreditor > 0) && 
                      ` plus settlement adjustments (${formatCurrency(personSummary.totalSettledAsDebtor - personSummary.totalSettledAsCreditor)})`
                    } equals {formatCurrency(personSummary.netBalance)}.
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    No money needs to change hands involving {selectedPerson.name}.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Unbalanced Person Status */
            <div>
              <h4 className="font-semibold mb-3 flex items-center">
                <Calculator className="mr-2 h-4 w-4 text-blue-600" />
                Optimized Settlements
              </h4>

              {personDebtsSimplified.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Needs to Pay:
                  </p>
                  <div className="space-y-2">
                    {personDebtsSimplified.map((debt, i) => (
                      <Card
                        key={i}
                        className="bg-red-50 dark:bg-red-950/20 p-3 border-red-200 dark:border-red-800"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <ArrowRight className="h-4 w-4 text-red-600 flex-shrink-0" />
                            <span className="text-sm min-w-0">
                              Pay{" "}
                              <strong className="truncate">
                                {peopleMap[debt.to]}
                              </strong>
                              :{" "}
                              <span className="font-semibold">
                                {formatCurrency(debt.amount)}
                              </span>
                            </span>
                          </div>
                          <div className="flex space-x-2 flex-shrink-0 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onViewRelevantExpenses(debt, "debt")
                              }
                              className="text-xs flex-1 sm:flex-none"
                            >
                              <ExternalLink className="mr-1 h-4 w-4" />
                              Expenses
                            </Button>
                            {userRole === "admin" && (
                              <Button
                                size="sm"
                                onClick={() => onMarkAsPaid(debt)}
                                disabled={isLoadingParent}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {personCreditsSimplified.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Will Receive:
                  </p>
                  <div className="space-y-2">
                    {personCreditsSimplified.map((credit, i) => (
                      <Card
                        key={i}
                        className="bg-green-50 dark:bg-green-950/20 p-3 border-green-200 dark:border-green-800"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <ArrowRight className="h-4 w-4 text-green-600 rotate-180 flex-shrink-0" />
                            <span className="text-sm min-w-0">
                              <strong className="truncate">
                                {peopleMap[credit.from]}
                              </strong>{" "}
                              will pay:{" "}
                              <span className="font-semibold">
                                {formatCurrency(credit.amount)}
                              </span>
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onViewRelevantExpenses(credit, "credit")
                            }
                            className="text-xs w-full sm:w-auto flex-shrink-0"
                          >
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Expenses
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {personDebtsSimplified.length === 0 && personCreditsSimplified.length === 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-xl border-2 border-gray-300 dark:border-gray-700 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No Active Settlements Required
                      </h4>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        While {selectedPerson.name} has a net balance of {formatCurrency(Math.abs(personSummary.netBalance))}, 
                        the settlement algorithm has optimized the payments so that no direct action is required from them.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* How it Works Modal */}
      <Dialog open={isHowItWorksModalOpen} onOpenChange={setIsHowItWorksModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar max-w-4xl w-[95vw] sm:w-full">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              <Calculator className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              How Settlement Works for {selectedPerson.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 overflow-x-hidden min-w-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Understanding {selectedPerson.name}'s Settlement Status
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    {personSummary.isBalanced ? (
                      <>
                        <p>
                          <strong>{selectedPerson.name} is balanced</strong> - their total payments equal their total obligations.
                        </p>
                        <p>
                          This means no money needs to change hands involving {selectedPerson.name}. Their debts and credits cancel each other out perfectly.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>{selectedPerson.name} has a net balance of {formatCurrency(Math.abs(personSummary.netBalance))}</strong> 
                          {personSummary.netBalance > 0 ? " (should receive)" : " (should pay)"}.
                        </p>
                        <p>
                          The settlement system optimizes payments to minimize the total number of transactions needed across all participants.
                        </p>
                        {(personDebtsSimplified.length === 0 && personCreditsSimplified.length === 0) && (
                          <p>
                            Even though {selectedPerson.name} has a net balance, the optimization algorithm determined that no direct payments involving them are needed to settle all debts efficiently.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Settlement Details */}
            {!personSummary.isBalanced && (
              <div className="space-y-4">
                {personDebtsSimplified.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Payments {selectedPerson.name} Needs to Make
                    </h4>
                    <div className="space-y-2">
                      {personDebtsSimplified.map((debt, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded border">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">
                              Pay <strong>{peopleMap[debt.to]}</strong>
                            </span>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(debt.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {personCreditsSimplified.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
                      <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                      Payments {selectedPerson.name} Will Receive
                    </h4>
                    <div className="space-y-2">
                      {personCreditsSimplified.map((credit, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-3 rounded border">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">
                              From <strong>{peopleMap[credit.from]}</strong>
                            </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(credit.amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <Calculator className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    How This Was Calculated
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 space-y-1">
                    <div className="flex justify-between">
                      <span>Total paid by {selectedPerson.name}:</span>
                      <span className="font-medium text-green-600">+{formatCurrency(personSummary.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total owed by {selectedPerson.name}:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(personSummary.totalOwed)}</span>
                    </div>
                    {(personSummary.totalSettledAsDebtor > 0 || personSummary.totalSettledAsCreditor > 0) && (
                      <div className="flex justify-between">
                        <span>Previous settlements:</span>
                        <span className="font-medium text-blue-600">
                          {personSummary.totalSettledAsDebtor - personSummary.totalSettledAsCreditor >= 0 ? "+" : ""}
                          {formatCurrency(personSummary.totalSettledAsDebtor - personSummary.totalSettledAsCreditor)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
                      <span className="font-semibold">Net balance:</span>
                      <span className={`font-bold ${
                        personSummary.netBalance > 0.01 
                          ? "text-green-600" 
                          : personSummary.netBalance < -0.01 
                          ? "text-red-600" 
                          : "text-gray-600"
                      }`}>
                        {personSummary.netBalance > 0.01 ? "+" : personSummary.netBalance < -0.01 ? "-" : ""}
                        {formatCurrency(Math.abs(personSummary.netBalance))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}