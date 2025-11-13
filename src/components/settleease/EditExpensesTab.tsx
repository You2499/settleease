"use client";
import React, { useState, useMemo, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crashTestManager } from '@/lib/settleease/crashTestContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { FilePenLine, Trash2, Settings2, AlertTriangle, Pencil, HandCoins } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import AddExpenseTab from './AddExpenseTab'; 
import { EXPENSES_TABLE, formatCurrency } from '@/lib/settleease';
import type { Expense, Person, Category as DynamicCategory } from '@/lib/settleease';
import { Separator } from '../ui/separator';
import ExpenseListItem from './ExpenseListItem';
import * as LucideIcons from 'lucide-react';

interface EditExpensesTabProps {
  people: Person[];
  expenses: Expense[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onActionComplete: () => void; 
  dynamicCategories: DynamicCategory[];
  isLoadingPeople?: boolean;
  isLoadingExpenses?: boolean;
  isLoadingCategories?: boolean;
  isDataFetchedAtLeastOnce?: boolean;
}

export default function EditExpensesTab({ 
  people, 
  expenses, 
  db, 
  supabaseInitializationError, 
  onActionComplete, 
  dynamicCategories,
  isLoadingPeople = false,
  isLoadingExpenses = false,
  isLoadingCategories = false,
  isDataFetchedAtLeastOnce = true,
}: EditExpensesTabProps) {
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('editExpenses', 'Edit Expenses Tab crashed: Expense modification failed with invalid data');
  });
  
  const isLoading = isLoadingPeople || isLoadingExpenses || isLoadingCategories || !isDataFetchedAtLeastOnce;

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const peopleMap = useMemo(() => people.reduce((acc, person) => {
    acc[person.id] = person.name;
    return acc;
  }, {} as Record<string, string>), [people]);

  const groupedExpenses = expenses.reduce((acc, expense) => {
    const date = new Date(expense.created_at || new Date()).toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const expenseDates = Object.keys(groupedExpenses);

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
      onActionComplete(); 
    } catch (error: any) {
      toast({ title: "Error", description: `Could not delete expense: ${error.message}`, variant: "destructive" });
    } finally {
      setExpenseToDelete(null);
    }
  };

  const handleActionComplete = () => {
    setEditingExpense(null); 
    onActionComplete(); 
  };

  // Show skeleton loaders while data is loading
  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
          <div className="space-y-4">
            {/* Date separator skeleton */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="h-px w-full" />
              </div>
              <div className="relative flex justify-center">
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            
            {/* Expense items skeleton */}
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20" />
                    <Skeleton className="h-9 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6">
          <p className="text-sm sm:text-base">Could not connect to the database. Editing expenses is currently unavailable.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
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
        onExpenseAdded={handleActionComplete} 
        expenseToEdit={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
        dynamicCategories={dynamicCategories}
        isLoadingPeople={isLoadingPeople}
        isLoadingCategories={isLoadingCategories}
        isDataFetchedAtLeastOnce={isDataFetchedAtLeastOnce}
      />
    );
  }

  return (
    <>
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold"><FilePenLine className="mr-2 h-5 w-5 text-primary" /> Edit or Delete Expenses</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select an expense below to modify its details or remove it from the records.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 flex-1 flex flex-col min-h-0">
          {expenses.length > 0 ? (
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {expenseDates.map((date, index) => (
                    <div key={date}>
                        <div className={`relative ${index === 0 ? 'mb-3' : 'my-3'}`}>
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="bg-border shadow-inner opacity-80" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-2 text-muted-foreground font-semibold rounded shadow-inner border border-border/60" style={{ position: 'relative', top: '1px' }}>
                                    {date}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-2.5 px-0.5 sm:px-1">
                            {groupedExpenses[date].map(expense => (
                                <ExpenseListItem
                                  key={expense.id}
                                  expense={expense}
                                  peopleMap={peopleMap}
                                  getCategoryIconFromName={(iconName: string) => (LucideIcons as any)[iconName] || Settings2}
                                  categories={dynamicCategories}
                                  actions={
                                    <>
                                      <Button variant="outline" size="sm" onClick={() => handleEditExpense(expense)} className="w-full sm:w-auto">
                                          <Pencil className="mr-1 h-4 w-4" /> Edit
                                      </Button>
                                      <Button variant="destructive" size="sm" onClick={() => handleConfirmDeleteExpense(expense)} className="w-full sm:w-auto">
                                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                                      </Button>
                                    </>
                                  }
                                />
                            ))}
                        </ul>
                    </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 flex-1">
              <FilePenLine className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
              <p className="font-medium text-base sm:text-lg mb-2">No Expenses to Edit</p>
              <p className="text-sm sm:text-base max-w-md">
                Add some expenses first to see them here for editing or deletion.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {expenseToDelete && (
        <AlertDialog open={expenseToDelete !== null} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden no-scrollbar">
            <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
              <div>
                <AlertDialogHeader className="pb-4">
                  <AlertDialogTitle className="flex items-center justify-center text-lg font-semibold">
                    Delete Expense
                  </AlertDialogTitle>
                </AlertDialogHeader>

                <div className="space-y-3">
                  {/* Warning Section */}
                  <div className="bg-white/95 dark:bg-gray-800/95 border border-[#EA4335]/30 dark:border-[#EA4335]/20 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-[#EA4335]/10 dark:bg-[#EA4335]/5">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-[#EA4335]" />
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          Delete Expense
                        </span>
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        This action will permanently delete the expense:
                      </p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2">
                        {expenseToDelete.description} ({formatCurrency(Number(expenseToDelete.total_amount))})
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-4">
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-destructive hover:bg-destructive/90 text-destructive-foreground border border-destructive rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDeleteExpense}
                  >
                    Yes, delete expense
                  </button>
                  <button
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center"
                    onClick={() => setExpenseToDelete(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
