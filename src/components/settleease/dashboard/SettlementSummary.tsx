"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Users, Handshake, CheckCircle2, FileText, Info, Construction, Zap, Code, Wrench, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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
    <Card className="w-full shadow-lg rounded-lg">
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'overview' | 'person')} className="w-full">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2"> {/* Reduced bottom padding */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                    <Handshake className="mr-2 h-5 w-5 text-primary" /> Settlement Hub
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInfoModalOpen(true)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  <Info className="mr-1 h-3.5 w-3.5" /> More Info
                </Button>
              </div>
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
                            <div className="grid grid-cols-3 items-center w-full">
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-left px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-start">{peopleMap[txn.from]}</span>
                              <span className="flex items-center justify-center w-5 mx-1 col-span-1 justify-self-center">
                                <ArrowRight className="text-accent w-4 h-4" />
                              </span>
                              <span className="truncate font-medium text-foreground text-base sm:text-sm text-right px-1 min-w-[80px] sm:min-w-[110px] max-w-[140px] col-span-1 justify-self-center">{peopleMap[txn.to]}</span>
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

      {/* Settlement Info Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-xl sm:text-2xl text-primary flex items-center">
              <Construction className="mr-2 h-5 w-5 text-orange-500" />
              Settlement Hub - Advanced Analytics
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-0">
            <div className="space-y-4 sm:space-y-6 pt-2">
              
              {/* Under Construction Banner */}
              <Card className="border-2 border-dashed border-orange-400 bg-orange-50 dark:bg-orange-950/20">
                <CardHeader className="pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center text-lg font-bold text-orange-700 dark:text-orange-400">
                    <Wrench className="mr-2 h-4 w-4 animate-pulse" />
                    🚧 Feature Under Development
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-2 pt-0">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-300">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">Status: Active Development</span>
                  </div>
                  <p className="text-orange-700 dark:text-orange-200">
                    This advanced settlement analytics panel is currently being built by our engineering team. 
                    Expected features include debt visualization, payment history analysis, and smart settlement recommendations.
                  </p>
                </CardContent>
              </Card>

              {/* Debug Info Cards */}
              <Card className="bg-slate-900 text-green-400 font-mono">
                <CardHeader className="pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center text-lg font-bold">
                    <Code className="mr-2 h-4 w-4" />
                    Debug Console
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 pt-0">
                  <div className="space-y-1">
                    <div className="text-cyan-400">[INFO] Settlement engine initialized</div>
                    <div className="text-yellow-400">[WARN] Advanced analytics module loading...</div>
                    <div className="text-green-400">[SUCCESS] Transaction processor online</div>
                    <div className="text-blue-400">[DEBUG] Calculating optimal settlement paths...</div>
                    <div className="text-purple-400">[SYSTEM] Memory usage: 42.7MB | CPU: 12%</div>
                    <div className="text-red-400">[ERROR] Feature not yet implemented</div>
                    <div className="text-gray-400">└── Expected completion: Q2 2024</div>
                  </div>
                </CardContent>
              </Card>

              {/* Placeholder Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="opacity-60">
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-lg font-bold text-muted-foreground">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Debt Visualization
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs sm:text-sm pt-0">
                    <div className="h-24 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-md flex items-center justify-center">
                      <span className="text-muted-foreground">Interactive debt graph coming soon...</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="opacity-60">
                  <CardHeader className="pt-3 sm:pt-4 pb-2">
                    <CardTitle className="flex items-center text-lg font-bold text-muted-foreground">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Smart Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs sm:text-sm pt-0">
                    <div className="h-24 bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 rounded-md flex items-center justify-center">
                      <span className="text-muted-foreground">AI-powered settlement suggestions...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mock Data Display */}
              <Card>
                <CardHeader className="pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center text-lg font-bold">
                    <FileText className="mr-2 h-4 w-4" />
                    Current Settlement Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm space-y-2 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Total Transactions:</span>
                      <span className="font-bold ml-2">{simplifiedTransactions.length + pairwiseTransactions.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Active People:</span>
                      <span className="font-bold ml-2">{people.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Settlement Payments:</span>
                      <span className="font-bold ml-2">{settlementPayments.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Expenses:</span>
                      <span className="font-bold ml-2">{allExpenses.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coming Soon Features */}
              <Card className="border-2 border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader className="pt-3 sm:pt-4 pb-2">
                  <CardTitle className="flex items-center text-lg font-bold text-blue-700 dark:text-blue-400">
                    <Zap className="mr-2 h-4 w-4" />
                    Coming Soon™
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm pt-0">
                  <ul className="space-y-1 text-blue-600 dark:text-blue-300">
                    <li>• 📊 Advanced debt analytics and trends</li>
                    <li>• 🎯 Optimal settlement path calculator</li>
                    <li>• 📱 WhatsApp integration for payment reminders</li>
                    <li>• 🔔 Smart notification system</li>
                    <li>• 📈 Historical settlement performance</li>
                    <li>• 🤖 AI-powered debt prediction</li>
                  </ul>
                </CardContent>
              </Card>

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
