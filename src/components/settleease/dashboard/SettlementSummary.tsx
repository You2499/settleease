
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
import type { Person, Expense, SettlementPayment, CalculatedTransaction } from '@/lib/settleease/types';
import PerPersonSettlementDetails from './PerPersonSettlementDetails'; // New component

interface SettlementSummaryProps {
  simplifiedTransactions: CalculatedTransaction[];
  pairwiseTransactions: CalculatedTransaction[];
  allExpenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  settlementPayments: SettlementPayment[];
  onMarkAsPaid: (transaction: CalculatedTransaction) => Promise<void>;
  onUnmarkSettlementPayment: (payment: SettlementPayment) => Promise<void>;
  onViewExpenseDetails: (expense: Expense) => void; // To open the main expense detail modal
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
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center text-xl">
                <Handshake className="mr-2 h-5 w-5 text-primary" /> Settlement Hub
            </CardTitle>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'overview' | 'person')} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="person">Per Person</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <CardDescription className="text-sm flex-grow pr-2">{overviewDescription}</CardDescription>
                <div className="flex items-center space-x-2 shrink-0">
                    <Switch
                        id="simplify-settlement-toggle"
                        checked={simplifySettlement}
                        onCheckedChange={setSimplifySettlement}
                        aria-label="Toggle settlement simplification"
                        disabled={isLoading}
                    />
                    <Label htmlFor="simplify-settlement-toggle" className="text-sm font-medium">
                        Simplify
                    </Label>
                </div>
            </div>
          {transactionsToDisplay.length > 0 ? (
            <ScrollArea className="h-[200px] border rounded-md p-1">
              <ul className="space-y-2 p-2">
                {transactionsToDisplay.map((txn, i) => (
                  <li key={`${txn.from}-${txn.to}-${i}-${txn.amount}`}>
                    <Card className="bg-card/70 p-2.5 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                          <div className="flex-grow text-sm">
                            <span className="font-medium text-foreground">{peopleMap[txn.from] || 'Unknown'}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-accent mx-1 inline-block" />
                            <span className="font-medium text-foreground">{peopleMap[txn.to] || 'Unknown'}</span>
                            <span className="block sm:inline sm:ml-1.5 text-primary font-semibold text-xs sm:text-sm">{formatCurrency(txn.amount)}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInternalMarkAsPaid(txn)}
                            disabled={isLoading}
                            className="text-xs px-2 py-1 h-auto w-full sm:w-auto"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark as Paid
                          </Button>
                        </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-md text-center min-h-[100px] flex items-center justify-center">
                <FileText className="mr-2 h-5 w-5"/>
                All debts are settled, or no expenses to settle yet!
            </div>
          )}
        </TabsContent>

        <TabsContent value="person" className="mt-0 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 items-center bg-muted/50 p-3 rounded-md">
                <Label htmlFor="person-select" className="text-sm font-medium">Select a person to view their settlement details:</Label>
                <Select value={selectedPersonId || ''} onValueChange={setSelectedPersonId} disabled={people.length === 0}>
                    <SelectTrigger id="person-select">
                        <SelectValue placeholder="Select Person..." />
                    </SelectTrigger>
                    <SelectContent>
                        {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {selectedPersonObject ? (
                <PerPersonSettlementDetails
                    key={selectedPersonId} // Ensures re-render when person changes
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
                />
            ) : (
                <div className="text-sm text-muted-foreground p-3 text-center min-h-[100px] flex items-center justify-center">
                    <Users className="mr-2 h-5 w-5"/>
                    Please select a person to see their specific settlement status.
                </div>
            )}
        </TabsContent>
      </CardContent>
    </Card>
  );
}
