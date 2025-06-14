
"use client";

import React, { useState, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, CheckCircle2, Undo2, FileText, ExternalLink, Landmark, Hourglass, ReceiptText } from 'lucide-react';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Person, Expense, SettlementPayment, CalculatedTransaction, UserRole } from '@/lib/settleease/types';
import RelevantExpensesModal from './RelevantExpensesModal'; // New component

interface PerPersonSettlementDetailsProps {
  selectedPerson: Person;
  peopleMap: Record<string, string>;
  allExpenses: Expense[];
  settlementPayments: SettlementPayment[];
  simplifiedTransactions: CalculatedTransaction[];
  pairwiseTransactions: CalculatedTransaction[];
  onMarkAsPaid: (transaction: CalculatedTransaction) => Promise<void>;
  onUnmarkSettlementPayment: (payment: SettlementPayment) => Promise<void>;
  onViewExpenseDetails: (expense: Expense) => void; // To open the main expense detail modal
  isLoadingParent: boolean;
  setIsLoadingParent: (loading: boolean) => void;
  userRole: UserRole;
}

export default function PerPersonSettlementDetails({
  selectedPerson,
  peopleMap,
  allExpenses,
  settlementPayments,
  simplifiedTransactions,
  pairwiseTransactions,
  onMarkAsPaid,
  onUnmarkSettlementPayment,
  onViewExpenseDetails,
  isLoadingParent,
  setIsLoadingParent,
  userRole,
}: PerPersonSettlementDetailsProps) {
  const [relevantExpenses, setRelevantExpenses] = useState<Expense[]>([]);
  const [isRelevantExpensesModalOpen, setIsRelevantExpensesModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');


  const personDebtsSimplified = useMemo(() => 
    simplifiedTransactions.filter(t => t.from === selectedPerson.id),
  [simplifiedTransactions, selectedPerson.id]);

  const personCreditsSimplified = useMemo(() =>
    simplifiedTransactions.filter(t => t.to === selectedPerson.id),
  [simplifiedTransactions, selectedPerson.id]);
  
  const personDebtsPairwise = useMemo(() =>
    pairwiseTransactions.filter(t => t.from === selectedPerson.id),
  [pairwiseTransactions, selectedPerson.id]);

  const personCreditsPairwise = useMemo(() =>
    pairwiseTransactions.filter(t => t.to === selectedPerson.id),
  [pairwiseTransactions, selectedPerson.id]);

  const personRecordedPayments = useMemo(() =>
    settlementPayments.filter(p => p.debtor_id === selectedPerson.id || p.creditor_id === selectedPerson.id)
    .sort((a,b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime()),
  [settlementPayments, selectedPerson.id]);

  const overallBalance = useMemo(() => {
    let balance = 0;
    personDebtsSimplified.forEach(debt => balance -= debt.amount);
    personCreditsSimplified.forEach(credit => balance += credit.amount);
    return balance;
  }, [personDebtsSimplified, personCreditsSimplified]);


  const handleViewRelevantExpenses = (transaction: CalculatedTransaction, type: 'debt' | 'credit') => {
    const relevant: Expense[] = [];
    const debtorId = type === 'debt' ? transaction.from : transaction.to;
    const creditorId = type === 'debt' ? transaction.to : transaction.from;

    if (transaction.contributingExpenseIds && transaction.contributingExpenseIds.length > 0) {
      // If pairwise transaction with specific contributing IDs
      transaction.contributingExpenseIds.forEach(expId => {
        const expense = allExpenses.find(e => e.id === expId);
        if (expense) relevant.push(expense);
      });
    } else {
      // Fallback for simplified or if no specific IDs: find all expenses involving these two
      allExpenses.forEach(exp => {
        const involvesDebtorAsSharer = exp.shares?.some(s => s.personId === debtorId && s.amount > 0);
        const involvesCreditorAsPayer = exp.paid_by?.some(p => p.personId === creditorId && p.amount > 0);
        
        const involvesDebtorAsPayer = exp.paid_by?.some(p => p.personId === debtorId && p.amount > 0);
        const involvesCreditorAsSharer = exp.shares?.some(s => s.personId === creditorId && s.amount > 0);

        if ((involvesDebtorAsSharer && involvesCreditorAsPayer) || (involvesDebtorAsPayer && involvesCreditorAsSharer)) {
           if (!relevant.find(r => r.id === exp.id)) { // Avoid duplicates
             relevant.push(exp);
           }
        }
      });
    }
    setRelevantExpenses(relevant);
    setModalTitle(`Expenses related to ${type === 'debt' ? peopleMap[debtorId] : peopleMap[creditorId]}'s payment to ${type === 'debt' ? peopleMap[creditorId] : peopleMap[debtorId]}`);
    setIsRelevantExpensesModalOpen(true);
  };
  
  const handleInternalMarkAsPaid = async (transaction: CalculatedTransaction) => {
    setIsLoadingParent(true);
    await onMarkAsPaid(transaction);
    setIsLoadingParent(false);
  };

  const handleInternalUnmarkPayment = async (payment: SettlementPayment) => {
    setIsLoadingParent(true);
    await onUnmarkSettlementPayment(payment);
    setIsLoadingParent(false);
  };


  const renderTransactionList = (
    transactions: CalculatedTransaction[], 
    type: 'debt' | 'credit', 
    titlePrefix: string,
    emptyMessage: string
  ) => (
    <AccordionItem value={type}>
      <AccordionTrigger className="text-base hover:no-underline">
        {titlePrefix} ({transactions.length})
      </AccordionTrigger>
      <AccordionContent>
        {transactions.length > 0 ? (
          <ScrollArea className="h-auto max-h-60">
            <ul className="space-y-2 pr-2 py-1">
              {transactions.map((txn, i) => (
                <li key={`${txn.from}-${txn.to}-${i}-${txn.amount}-${type}`}>
                  <Card className="bg-card/50 p-2.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex-grow text-xs sm:text-sm">
                        {type === 'debt' ? (
                          <>
                            Owes <span className="font-medium text-foreground">{peopleMap[txn.to] || 'Unknown'}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">{peopleMap[txn.from] || 'Unknown'}</span> owes you
                          </>
                        )}
                        <span className="block sm:inline sm:ml-1.5 text-primary font-semibold">{formatCurrency(txn.amount)}</span>
                      </div>
                      <div className="flex space-x-1.5 w-full sm:w-auto mt-1 sm:mt-0">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewRelevantExpenses(txn, type)}
                            className="text-xs px-2 py-1 h-auto flex-1 sm:flex-none"
                            disabled={isLoadingParent}
                        >
                           <ExternalLink className="mr-1 h-3 w-3"/> Expenses
                        </Button>
                        {type === 'debt' && userRole === 'admin' && (
                          <Button
                            size="sm"
                            onClick={() => handleInternalMarkAsPaid(txn)}
                            disabled={isLoadingParent}
                            className="text-xs px-2 py-1 h-auto bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Paid
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
          <p className="text-xs text-muted-foreground p-2">{emptyMessage}</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <Card className="p-4 border-t pt-4">
      <CardDescription className="text-sm mb-3 text-center">
        Summary for <strong className="text-primary">{selectedPerson.name}</strong>:
        {overallBalance === 0 && " All settled up!"}
        {overallBalance > 0.01 && ` Is owed a net total of ${formatCurrency(overallBalance)}.`}
        {overallBalance < -0.01 && ` Owes a net total of ${formatCurrency(Math.abs(overallBalance))}.`}
      </CardDescription>

      <Accordion type="multiple" defaultValue={['debts-simplified', 'credits-simplified', 'recorded-payments']} className="w-full">
        {renderTransactionList(personDebtsSimplified, 'debt', 'Debts (Simplified)', 'No outstanding simplified debts.')}
        {renderTransactionList(personCreditsSimplified, 'credit', 'Credits (Simplified)', 'No outstanding simplified credits.')}
        
        <AccordionItem value="debts-pairwise">
            <AccordionTrigger className="text-base hover:no-underline">Pairwise Debts (You Owe) ({personDebtsPairwise.length})</AccordionTrigger>
            <AccordionContent>
                {personDebtsPairwise.length > 0 ? (
                    <ScrollArea className="h-auto max-h-60"><ul className="space-y-2 pr-2 py-1">
                        {personDebtsPairwise.map((txn, i) => (
                            <li key={`pairwise-debt-${i}`}><Card className="bg-card/50 p-2.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">Owes <strong className="text-foreground">{peopleMap[txn.to]}</strong>: {formatCurrency(txn.amount)}</span>
                                    <Button variant="outline" size="sm" className="text-xs h-auto px-2 py-1" onClick={() => handleViewRelevantExpenses(txn, 'debt')} disabled={isLoadingParent}><ExternalLink className="mr-1 h-3 w-3"/> Expenses</Button>
                                </div>
                            </Card></li>
                        ))}
                    </ul></ScrollArea>
                ) : <p className="text-xs text-muted-foreground p-2">No pairwise debts where you owe others.</p>}
            </AccordionContent>
        </AccordionItem>

        <AccordionItem value="credits-pairwise">
            <AccordionTrigger className="text-base hover:no-underline">Pairwise Credits (Owed to You) ({personCreditsPairwise.length})</AccordionTrigger>
            <AccordionContent>
                {personCreditsPairwise.length > 0 ? (
                     <ScrollArea className="h-auto max-h-60"><ul className="space-y-2 pr-2 py-1">
                        {personCreditsPairwise.map((txn, i) => (
                            <li key={`pairwise-credit-${i}`}><Card className="bg-card/50 p-2.5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs"><strong className="text-foreground">{peopleMap[txn.from]}</strong> owes you: {formatCurrency(txn.amount)}</span>
                                    <Button variant="outline" size="sm" className="text-xs h-auto px-2 py-1" onClick={() => handleViewRelevantExpenses(txn, 'credit')} disabled={isLoadingParent}><ExternalLink className="mr-1 h-3 w-3"/> Expenses</Button>
                                </div>
                            </Card></li>
                        ))}
                    </ul></ScrollArea>
                ) : <p className="text-xs text-muted-foreground p-2">No pairwise credits owed to you by others.</p>}
            </AccordionContent>
        </AccordionItem>


        <AccordionItem value="recorded-payments">
          <AccordionTrigger className="text-base hover:no-underline">
            <span className="flex items-center">
              <Landmark className="mr-2 h-4 w-4 text-muted-foreground"/> Recorded Payments ({personRecordedPayments.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {personRecordedPayments.length > 0 ? (
              <ScrollArea className="h-auto max-h-60">
                <ul className="space-y-2 pr-2 py-1">
                  {personRecordedPayments.map(payment => (
                    <li key={payment.id}>
                      <Card className="bg-card/50 p-2.5 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex-grow text-xs sm:text-sm">
                            {payment.debtor_id === selectedPerson.id ? (
                              <>
                                You paid <span className="font-medium text-foreground">{peopleMap[payment.creditor_id] || 'Unknown'}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium text-foreground">{peopleMap[payment.debtor_id] || 'Unknown'}</span> paid you
                              </>
                            )}
                            <span className="block sm:inline sm:ml-1.5 text-green-600 font-semibold">{formatCurrency(payment.amount_settled)}</span>
                            <span className="block text-muted-foreground text-[10px] sm:text-xs">
                                On: {new Date(payment.settled_at).toLocaleDateString()}
                            </span>
                          </div>
                          {userRole === 'admin' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleInternalUnmarkPayment(payment)}
                              disabled={isLoadingParent}
                              className="text-xs px-2 py-1 h-auto w-full sm:w-auto"
                            >
                              <Undo2 className="mr-1 h-3 w-3" /> Unmark
                            </Button>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground p-2">No settlement payments recorded involving {selectedPerson.name}.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <RelevantExpensesModal
        isOpen={isRelevantExpensesModalOpen}
        onOpenChange={setIsRelevantExpensesModalOpen}
        expensesToList={relevantExpenses}
        onExpenseClick={(expense) => {
            setIsRelevantExpensesModalOpen(false); // Close small modal
            onViewExpenseDetails(expense); // Open main detail modal
        }}
        modalTitle={modalTitle}
        peopleMap={peopleMap}
      />
    </Card>
  );
}
