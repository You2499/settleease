
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
import { FilePenLine, Trash2, Settings2, AlertTriangle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import AddExpenseTab from './AddExpenseTab'; // Re-use for editing
import { EXPENSES_TABLE, CATEGORIES, formatCurrency } from '@/lib/settleease';
import type { Expense, Person } from '@/lib/settleease';

interface EditExpensesTabProps {
  people: Person[];
  expenses: Expense[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onActionComplete: () => void; // Callback to refresh data in parent
}

export default function EditExpensesTab({ people, expenses, db, supabaseInitializationError, onActionComplete }: EditExpensesTabProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const peopleMap = useMemo(() => people.reduce((acc, person) => {
    acc[person.id] = person.name;
    return acc;
  }, {} as Record<string, string>), [people]);

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleConfirmDeleteExpense = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete || !db || supabaseInitializationError) {
      toast({ title: "Error", description: `Cannot delete expense: Supabase issue. ${supabaseInitializationError || ''}`, variant: "destructive" });
      setExpenseToDelete(null);
      return;
    }
    try {
      const { error } = await db.from(EXPENSES_TABLE).delete().eq('id', expenseToDelete.id);
      if (error) throw error;
      toast({ title: "Expense Deleted", description: `${expenseToDelete.description} has been deleted.` });
      onActionComplete(); // Refresh data in parent
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete expense: ${error.message}`, variant: "destructive" });
    } finally {
      setExpenseToDelete(null);
    }
  };

  const handleActionComplete = () => {
    setEditingExpense(null); // Go back to list view
    onActionComplete(); // Refresh data in parent
  };

  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not connect to the database. Editing expenses is currently unavailable.</p>
          <p className="text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }

  if (editingExpense) {
    return (
      <AddExpenseTab
        people={people}
        db={db}
        supabaseInitializationError={supabaseInitializationError}
        onExpenseAdded={handleActionComplete} // For consistency, though it's an update
        expenseToEdit={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <FilePenLine className="mr-2 h-5 w-5 text-primary" /> Edit or Delete Expenses
          </CardTitle>
          <CardDescription>Select an expense to modify or remove it.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-20rem)] pr-2"> {/* Adjust height as needed */}
              <ul className="space-y-3">
                {expenses.map(expense => {
                  const CategoryIcon = CATEGORIES.find(c => c.name === expense.category)?.icon || Settings2;
                   const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
                    ? "Multiple Payers"
                    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
                      ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
                      : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));


                  return (
                    <li key={expense.id}>
                      <Card className="bg-card/70 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2 pt-3 px-4">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base font-semibold leading-tight">{expense.description}</CardTitle>
                            <span className="text-base font-bold text-primary">{formatCurrency(Number(expense.total_amount))}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center"><CategoryIcon className="mr-1.5 h-3.5 w-3.5" /> {expense.category}</div>
                            <span>Paid by: <span className="font-medium text-foreground">{displayPayerText}</span></span>
                          </div>
                          <p>Date: {expense.created_at ? new Date(expense.created_at).toLocaleDateString() : 'N/A'}</p>
                        </CardContent>
                        <CardFooter className="px-4 py-2.5 border-t flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditExpense(expense)} className="text-xs">
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleConfirmDeleteExpense(expense)} className="text-xs">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground p-4 text-center">No expenses recorded yet to edit or delete.</p>
          )}
        </CardContent>
      </Card>

      {expenseToDelete && (
        <AlertDialog open={expenseToDelete !== null} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the expense: <strong>{expenseToDelete.description} ({formatCurrency(Number(expenseToDelete.total_amount))})</strong>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Yes, delete expense
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
