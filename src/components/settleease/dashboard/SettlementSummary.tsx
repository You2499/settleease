"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Users, Handshake, CheckCircle2, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Person, Expense, SettlementPayment, CalculatedTransaction, UserRole } from '@/lib/settleease/types';
import PerPersonSettlementDetails from './PerPersonSettlementDetails'; 

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
  const [viewMode, setViewMode] = useState<'overview' | 'person'>('overview');
  const [simplifySettlement, setSimplifySettlement] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const transactionsToDisplay = simplifySettlement ? simplifiedTransactions : pairwiseTransactions;

  const overviewDescription = simplifySettlement
    ? "Minimum transactions required to settle all debts."
    : "Detailed pairwise debts reflecting direct expense involvements and payments.";

  const handleInternalMarkAsPaid = async (transaction: CalculatedTransaction) => {
    setIsLoading(true);
    await onMarkAsPaid(transaction);
    setIsLoading(false);
  };
  
  const selectedPersonObject = useMemo(() => {
    if (!selectedPersonId) return null;
    return people.find(p => p.id === selectedPersonId) || null;
  }, [selectedPersonId, people]);

  return (
    <Card className="shadow-lg rounded-lg">
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'overview' | 'person')} className="w-full">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2"> {/* Reduced bottom padding */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  <Handshake className="mr-2 h-5 w-5 text-primary" /> Settlement Hub
              </CardTitle>
              <TabsList className="grid w-full grid-cols-2 sm:w-auto text-xs sm:text-sm">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="person">Per Person</TabsTrigger>
              </TabsList>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2"> {/* Adjusted top padding */}
          <TabsContent value="overview" className="mt-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 px-3 py-2 rounded-md gap-2"> {/* Reduced padding */}
                  <CardDescription className="text-xs sm:text-sm flex-grow pr-2">{overviewDescription}</CardDescription>
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <Switch
                          id="simplify-settlement-toggle"
                          checked={simplifySettlement}
                          onCheckedChange={setSimplifySettlement}
                          aria-label="Toggle settlement simplification"
                          disabled={isLoading}
                      />
                      <Label htmlFor="simplify-settlement-toggle" className="text-xs sm:text-sm font-medium">
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
                            <div className="flex items-center w-full">
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-left px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px]">{peopleMap[txn.from]}</span>
                              <span className="flex items-center justify-start w-5 mx-1">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-left px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px]">{peopleMap[txn.to]}</span>
                            </div>
                          </div>
                          <span className="text-right font-bold text-green-700 text-base sm:text-lg mt-1 sm:mt-0 col-span-1 sm:col-span-1 flex justify-end">
                            {formatCurrency(txn.amount)}
                          </span>
                          <div className="flex-shrink-0 flex justify-center mt-1 sm:mt-0 col-span-1 sm:col-span-1">
                            {userRole === 'admin' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInternalMarkAsPaid(txn)}
                                disabled={isLoading}
                                className="text-xs px-2 py-1 h-auto w-full sm:w-auto"
                              >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark as Paid
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
              <div className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-md text-center min-h-[100px] flex items-center justify-center mt-2"> {/* Reduced margin */}
                  <FileText className="mr-2 h-5 w-5"/>
                  All debts are settled, or no expenses to settle yet!
              </div>
            )}
          </TabsContent>

          <TabsContent value="person" className="mt-0 space-y-3">
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-4 items-center bg-muted/50 px-3 py-2 rounded-md"> {/* Reduced padding */}
                  <Label htmlFor="person-select" className="text-xs sm:text-sm font-medium text-left sm:text-right">View settlement details for:</Label>
                  <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId} disabled={people.length === 0}>
                      <SelectTrigger id="person-select" className="h-9 text-xs sm:text-sm">
                          <SelectValue placeholder="Select Person..." />
                      </SelectTrigger>
                      <SelectContent>
                          {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                      <Users className="mr-2 h-5 w-5"/>
                      Please select a person to see their specific settlement status.
                  </div>
              )}
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
