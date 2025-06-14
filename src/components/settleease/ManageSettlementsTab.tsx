
"use client";

import React, { useState, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Handshake, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { SETTLEMENT_PAYMENTS_TABLE, formatCurrency } from '@/lib/settleease';
import type { Expense, Person, SettlementPayment } from '@/lib/settleease';

interface ManageSettlementsTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  settlementPayments: SettlementPayment[];
  db: SupabaseClient | undefined;
  currentUserId: string;
  onActionComplete: () => void;
}

interface CalculatedSettlement {
  from: string; // debtorId
  to: string;   // creditorId
  amount: number;
}

export default function ManageSettlementsTab({
  expenses,
  people,
  peopleMap,
  settlementPayments,
  db,
  currentUserId,
  onActionComplete,
}: ManageSettlementsTabProps) {
  const [settlementToConfirm, setSettlementToConfirm] = useState<CalculatedSettlement | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculatedSimplifiedSettlements = useMemo(() => {
    if (people.length === 0) return [];

    const balances: Record<string, number> = {};
    people.forEach(p => balances[p.id] = 0);

    expenses.forEach(expense => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach(payment => {
          balances[payment.personId] = (balances[payment.personId] || 0) + Number(payment.amount);
        });
      }
      if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            balances[share.personId] = (balances[share.personId] || 0) - Number(share.amount);
          });
      }
    });
    
    settlementPayments.forEach(payment => {
        if (balances[payment.debtor_id] !== undefined) {
            balances[payment.debtor_id] += Number(payment.amount_settled);
        }
        if (balances[payment.creditor_id] !== undefined) {
            balances[payment.creditor_id] -= Number(payment.amount_settled);
        }
    });

    const debtors = Object.entries(balances).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => a.amount - b.amount);
    const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => b.amount - a.amount);
    const transactions: CalculatedSettlement[] = [];
    let debtorIdx = 0, creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx], creditor = creditors[creditorIdx];
      const amountToSettle = Math.min(-debtor.amount, creditor.amount);
      if (amountToSettle > 0.01) {
        transactions.push({ from: debtor.id, to: creditor.id, amount: amountToSettle });
        debtor.amount += amountToSettle;
        creditor.amount -= amountToSettle;
      }
      if (Math.abs(debtor.amount) < 0.01) debtorIdx++;
      if (Math.abs(creditor.amount) < 0.01) creditorIdx++;
    }
    return transactions;
  }, [expenses, people, settlementPayments]);

  const handleMarkAsPaid = async () => {
    if (!settlementToConfirm || !db || !currentUserId) {
      toast({ title: "Error", description: "Cannot mark as paid. Missing information or database connection.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await db.from(SETTLEMENT_PAYMENTS_TABLE).insert([
        {
          debtor_id: settlementToConfirm.from,
          creditor_id: settlementToConfirm.to,
          amount_settled: settlementToConfirm.amount,
          marked_by_user_id: currentUserId,
          settled_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      toast({ title: "Settlement Recorded", description: `Payment from ${peopleMap[settlementToConfirm.from]} to ${peopleMap[settlementToConfirm.to]} marked as complete.` });
      setSettlementToConfirm(null);
      onActionComplete();
    } catch (error: any) {
      console.error("Error marking settlement as paid:", error);
      toast({ title: "Error", description: `Could not record settlement: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!db) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not connect to the database. Managing settlements is currently unavailable.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Handshake className="mr-2 h-5 w-5 text-primary" /> Manage Settlements
          </CardTitle>
          <CardDescription>View outstanding simplified debts and mark them as paid. This will update the overall settlement summary on the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {calculatedSimplifiedSettlements.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-22rem)]">
              <ul className="space-y-3 pr-4">
                {calculatedSimplifiedSettlements.map((settlement, index) => (
                  <li key={`${settlement.from}-${settlement.to}-${index}`}>
                    <Card className="bg-card/70 p-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex-grow text-sm">
                          <span className="font-medium text-foreground">{peopleMap[settlement.from] || 'Unknown'}</span>
                          <ArrowRight className="h-4 w-4 text-accent mx-1.5 inline-block" />
                          <span className="font-medium text-foreground">{peopleMap[settlement.to] || 'Unknown'}</span>
                          <span className="block sm:inline sm:ml-2 text-primary font-semibold">{formatCurrency(settlement.amount)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSettlementToConfirm(settlement)}
                          disabled={isLoading}
                          className="text-xs w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark as Paid
                        </Button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground p-4 text-center">All debts are settled based on current expenses and recorded payments, or no expenses to settle yet!</p>
          )}
        </CardContent>
      </Card>

      {settlementToConfirm && (
        <AlertDialog open={settlementToConfirm !== null} onOpenChange={(open) => !open && setSettlementToConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark the payment of <strong className="text-primary">{formatCurrency(settlementToConfirm.amount)}</strong> from <strong>{peopleMap[settlementToConfirm.from]}</strong> to <strong>{peopleMap[settlementToConfirm.to]}</strong> as complete?
                This action cannot be easily undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSettlementToConfirm(null)} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkAsPaid} disabled={isLoading} className="bg-primary hover:bg-primary/90">
                {isLoading ? "Recording..." : "Yes, Mark as Paid"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
