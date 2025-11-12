"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Handshake, ArrowRight, CheckCircle2, AlertTriangle, Undo2, History, FileText, Info, Construction, Zap, Code, Wrench, AlertCircle, HandCoins, Pencil, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { SETTLEMENT_PAYMENTS_TABLE, formatCurrency } from '@/lib/settleease';
import type { Expense, Person, SettlementPayment } from '@/lib/settleease';
import { Separator } from '@/components/ui/separator';
import { FixedCalendar } from "@/components/ui/fixed-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CustomSettlementForm from './CustomSettlementForm';

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
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('manageSettlements', 'Manage Settlements Tab crashed: Settlement processing failed with corrupted payment data');
  });

  const [settlementToConfirm, setSettlementToConfirm] = useState<CalculatedSettlement | null>(null);
  const [paymentToUnmark, setPaymentToUnmark] = useState<SettlementPayment | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<SettlementPayment | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
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
      toast({ title: "Error Recording Settlement", description: error.message || "Could not record settlement.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnmarkAsPaid = async () => {
    if (!paymentToUnmark || !db) {
      toast({ title: "Error", description: "Cannot unmark payment. Missing information or database connection.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await db.from(SETTLEMENT_PAYMENTS_TABLE).delete().eq('id', paymentToUnmark.id);
      if (error) throw error;
      toast({ title: "Payment Unmarked", description: `Payment record from ${peopleMap[paymentToUnmark.debtor_id]} to ${peopleMap[paymentToUnmark.creditor_id]} has been removed.` });
      setPaymentToUnmark(null);
      onActionComplete();
    } catch (error: any) {
      console.error("Error unmarking payment:", error);
      toast({ title: "Error Unmarking Payment", description: error.message || "Could not unmark payment.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPayment = (payment: SettlementPayment) => {
    setPaymentToEdit(payment);
    setEditAmount(payment.amount_settled.toString());
    setEditNotes(payment.notes || '');
    setEditDate(payment.settled_at ? new Date(payment.settled_at) : new Date());
  };

  const handleUpdatePayment = async () => {
    if (!paymentToEdit || !db) {
      toast({ title: "Error", description: "Cannot update payment. Missing information or database connection.", variant: "destructive" });
      return;
    }
    
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount", variant: "destructive" });
      return;
    }

    if (!editDate) {
      toast({ title: "Invalid Date", description: "Please select a payment date", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await db
        .from(SETTLEMENT_PAYMENTS_TABLE)
        .update({
          amount_settled: amount,
          notes: editNotes.trim() || null,
          settled_at: editDate.toISOString(),
        })
        .eq('id', paymentToEdit.id);

      if (error) throw error;
      
      toast({ 
        title: "Payment Updated", 
        description: `Payment from ${peopleMap[paymentToEdit.debtor_id]} to ${peopleMap[paymentToEdit.creditor_id]} has been updated.` 
      });
      setPaymentToEdit(null);
      setEditAmount('');
      setEditNotes('');
      setEditDate(undefined);
      onActionComplete();
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast({ title: "Error Updating Payment", description: error.message || "Could not update payment.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  if (!db) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6">
          <p className="text-sm sm:text-base">Could not connect to the database. Managing settlements is currently unavailable.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                <Handshake className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Manage Settlements
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">View outstanding debts based on current expenses, mark them as paid, or manage previously recorded payments.</CardDescription>
            </div>
            <div className="flex-shrink-0">
              <CustomSettlementForm
                people={people}
                peopleMap={peopleMap}
                db={db}
                currentUserId={currentUserId}
                onActionComplete={onActionComplete}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6">
              
              {/* Custom Settlement Info */}
              <div className="border rounded-lg shadow-sm bg-primary/5 p-3 sm:p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-primary mb-1">Custom Payment Recording</p>
                    <p className="text-muted-foreground text-xs">
                      Use the "Add Custom Payment" button above to manually record direct payments between people. 
                      These payments will be included in all settlement calculations and affect outstanding balances.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg shadow-sm bg-card/50 p-3 sm:p-5">
                <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
                    <FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Outstanding Simplified Debts
                </h3>
                {calculatedSimplifiedSettlements.length > 0 ? (
                  <div className="space-y-2">
                    {calculatedSimplifiedSettlements.map((settlement, index) => (
                      <div
                        key={`${settlement.from}-${settlement.to}-${index}`}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm gap-3 sm:gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-red-800 dark:text-red-200">
                              {(peopleMap[settlement.from] || 'Unknown').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-green-800 dark:text-green-200">
                              {(peopleMap[settlement.to] || 'Unknown').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm min-w-0 flex-1">
                            <span className="font-medium break-words">{peopleMap[settlement.from] || 'Unknown'}</span>
                            <span className="text-gray-600 dark:text-gray-400"> pays </span>
                            <span className="font-medium break-words">{peopleMap[settlement.to] || 'Unknown'}</span>
                          </div>
                          <div className="font-bold text-green-600 dark:text-green-400 flex-shrink-0 text-lg">
                            {formatCurrency(settlement.amount)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSettlementToConfirm(settlement)}
                          disabled={isLoading}
                          className="text-xs w-full sm:w-auto py-1.5 px-3 h-auto flex-shrink-0"
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark as Paid
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                    <Handshake className="h-10 w-10 sm:h-12 sm:w-12 mb-3 text-primary/30" />
                    <p className="font-medium text-sm sm:text-base">All Settled Up!</p>
                    <p className="text-xs mb-4">No outstanding debts based on current data.</p>
                    <p className="text-xs text-primary/70">
                      Need to record a direct payment? Use the "Add Custom Payment" button above.
                    </p>
                  </div>
                )}
              </div>

              <div className="border rounded-lg shadow-sm bg-card/50 p-3 sm:p-5">
                <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
                    <History className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Recorded Settlement Payments
                </h3>
                {settlementPayments.length > 0 ? (
                  <ul className="space-y-2.5 sm:space-y-3">
                    {settlementPayments.sort((a,b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime()).map(payment => (
                      <li key={payment.id}>
                        <div className="bg-card/80 p-3 sm:p-3.5 rounded-md border shadow-inner">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex-grow text-xs sm:text-sm mb-1.5 sm:mb-0">
                              <div>
                                <span className="font-medium text-foreground">{peopleMap[payment.debtor_id] || 'Unknown'}</span>
                                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 mx-1 sm:mx-1.5 inline-block" />
                                <span className="font-medium text-foreground">{peopleMap[payment.creditor_id] || 'Unknown'}</span>
                                <span className="block sm:inline sm:ml-2 text-green-700 font-semibold text-sm sm:text-base">{formatCurrency(payment.amount_settled)}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                <span>Paid on: {new Date(payment.settled_at).toLocaleDateString()}</span>
                                {payment.notes && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="italic">{payment.notes}</span>
                                    <span className="mx-2">•</span>
                                    <span className="text-primary/70 font-medium">Custom Payment</span>
                                  </>
                                )}
                                {!payment.notes && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span className="text-green-600/70 font-medium">Auto Settlement</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPayment(payment)}
                                disabled={isLoading}
                                className="text-xs flex-1 sm:flex-none py-1.5 px-3 h-auto"
                              >
                                <Pencil className="mr-1 h-3 w-3" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setPaymentToUnmark(payment)}
                                disabled={isLoading}
                                className="text-xs flex-1 sm:flex-none py-1.5 px-3 h-auto"
                              >
                                <Undo2 className="mr-1 h-4 w-4" /> Unmark
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                   <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                    <History className="h-10 w-10 sm:h-12 sm:w-12 mb-3 text-primary/30" />
                    <p className="font-medium text-sm sm:text-base">No Payments Recorded</p>
                    <p className="text-xs">Manually mark debts as paid to see them here.</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {settlementToConfirm && (
        <AlertDialog open={settlementToConfirm !== null} onOpenChange={(open) => !open && setSettlementToConfirm(null)}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
              <div>
                <AlertDialogHeader className="pb-4">
                  <AlertDialogTitle className="flex items-center justify-center text-lg font-semibold">
                    Confirm Settlement
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="space-y-3">
                  {/* Confirmation Section */}
                  <div className="bg-white/95 dark:bg-gray-800/95 border border-[#34A853]/30 dark:border-[#34A853]/20 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-[#34A853]/10 dark:bg-[#34A853]/5">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-[#34A853]" />
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          Confirm Settlement
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Are you sure you want to mark this payment as complete?
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm">
                        <p className="font-medium text-gray-800 dark:text-gray-100">
                          {formatCurrency(settlementToConfirm.amount)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          From <strong>{peopleMap[settlementToConfirm.from]}</strong> to <strong>{peopleMap[settlementToConfirm.to]}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-4">
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-primary hover:bg-primary/90 text-primary-foreground border border-primary rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleMarkAsPaid}
                    disabled={isLoading}
                  >
                    {isLoading ? "Recording..." : "Yes, Mark as Paid"}
                  </button>
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setSettlementToConfirm(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {paymentToUnmark && (
        <AlertDialog open={paymentToUnmark !== null} onOpenChange={(open) => !open && setPaymentToUnmark(null)}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
              <div>
                <AlertDialogHeader className="pb-4">
                  <AlertDialogTitle className="flex items-center justify-center text-lg font-semibold">
                    Unmark Payment
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="space-y-3">
                  {/* Warning Section */}
                  <div className="bg-white/95 dark:bg-gray-800/95 border border-[#ff7825]/30 dark:border-[#ff7825]/20 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-[#FBBC05]/10 dark:bg-[#FBBC05]/5">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-[#EA4335]" />
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          Unmark Payment
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Are you sure you want to unmark (delete) this recorded payment?
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-3 text-sm mb-2">
                        <p className="font-medium text-gray-800 dark:text-gray-100">
                          {formatCurrency(paymentToUnmark.amount_settled)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          From <strong>{peopleMap[paymentToUnmark.debtor_id]}</strong> to <strong>{peopleMap[paymentToUnmark.creditor_id]}</strong>
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        This action will make this debt appear as outstanding again.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-4">
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleUnmarkAsPaid}
                    disabled={isLoading}
                  >
                    {isLoading ? "Unmarking..." : "Yes, Unmark Payment"}
                  </button>
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setPaymentToUnmark(null)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit Payment Dialog */}
      {paymentToEdit && (
        <Dialog open={paymentToEdit !== null} onOpenChange={(open) => !open && setPaymentToEdit(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Settlement Payment</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm mb-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Editing payment from <strong>{peopleMap[paymentToEdit.debtor_id]}</strong> to <strong>{peopleMap[paymentToEdit.creditor_id]}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount (₹)</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        "border-border bg-background hover:bg-accent hover:text-accent-foreground",
                        "focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                        !editDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border border-border shadow-md rounded-lg bg-popover">
                    <FixedCalendar
                      selected={editDate}
                      onSelect={(date) => {
                        setEditDate(date);
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPaymentToEdit(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePayment}
                disabled={isLoading || !editAmount || parseFloat(editAmount) <= 0 || !editDate}
              >
                {isLoading ? "Updating..." : "Update Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
