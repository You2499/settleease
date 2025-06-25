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
import { FilePenLine, Trash2, Settings2, AlertTriangle, Pencil } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import AddExpenseTab from './AddExpenseTab'; 
import { EXPENSES_TABLE, formatCurrency, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease';
import type { Expense, Person, Category as DynamicCategory } from '@/lib/settleease';
import { Separator } from '../ui/separator';

interface EditExpensesTabProps {
  people: Person[];
  expenses: Expense[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onActionComplete: () => void; 
  dynamicCategories: DynamicCategory[];
}

export default function EditExpensesTab({ people, expenses, db, supabaseInitializationError, onActionComplete, dynamicCategories }: EditExpensesTabProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const peopleMap = useMemo(() => people.reduce((acc, person) => {
    acc[person.id] = person.name;
    return acc;
  }, {} as Record<string, string>), [people]);

  const getCategoryIcon = (categoryName: string) => {
    const category = dynamicCategories.find(c => c.name === categoryName);
    if (category) {
        const iconDetail = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === category.icon_name);
        if (iconDetail) return iconDetail.IconComponent;
    }
    const defaultIcon = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === 'Settings2');
    return defaultIcon ? defaultIcon.IconComponent : Settings2;
  };

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

  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl text-destructive flex items-center">
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
      />
    );
  }

  return (
    <>
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
            <FilePenLine className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Edit or Delete Expenses
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Select an expense below to modify its details or remove it from the records.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-4 sm:p-6 pt-2 sm:pt-4">
          {expenses.length > 0 ? (
            <ScrollArea className="flex-1 min-h-0 h-full -mx-1 sm:-mx-2">
              <div className="space-y-4 px-1 sm:px-2">
                {expenseDates.map((date, index) => (
                    <div key={date}>
                        <div className={`relative ${index === 0 ? 'mb-3' : 'my-3'}`}>
                            <div className="absolute inset-0 flex items-center">
                                <Separator />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-2 text-muted-foreground font-semibold">
                                    {date}
                                </span>
                            </div>
                        </div>
                        <ul className="space-y-2.5 sm:space-y-3">
                            {groupedExpenses[date].map(expense => {
                                const CategoryIcon = getCategoryIcon(expense.category);
                                const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
                                    ? "Multiple Payers"
                                    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
                                    ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
                                    : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));

                                return (
                                    <li key={expense.id}>
                                        <div className="bg-card/80 p-3 sm:p-4 rounded-lg border shadow-sm">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-1.5 sm:mb-2">
                                                <h4 className="text-sm sm:text-md font-semibold leading-tight flex-grow mr-3 truncate" title={expense.description}>{expense.description}</h4>
                                                <span className="text-md sm:text-lg font-bold text-primary whitespace-nowrap self-end sm:self-center">{formatCurrency(Number(expense.total_amount))}</span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground mb-2 sm:mb-3 gap-1 sm:gap-3">
                                                <div className="flex items-center">
                                                    <CategoryIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-muted-foreground" /> 
                                                    <span className="truncate" title={expense.category}>{expense.category}</span>
                                                </div>
                                                <span className="sm:ml-auto whitespace-nowrap">Paid by: <span className="font-medium text-foreground/90">{displayPayerText}</span></span>
                                            </div>
                                            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:justify-end sm:space-x-2.5">
                                                <Button variant="outline" size="sm" onClick={() => handleEditExpense(expense)} className="text-xs px-3 py-1.5 h-auto w-full sm:w-auto">
                                                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                                                </Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleConfirmDeleteExpense(expense)} className="text-xs px-3 py-1.5 h-auto w-full sm:w-auto">
                                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                <FilePenLine className="h-12 w-12 sm:h-16 sm:w-16 mb-4 text-primary/30" />
                <p className="text-md sm:text-lg font-medium">No Expenses Yet</p>
                <p className="text-xs sm:text-sm">There are no expenses recorded to edit or delete. Add some first!</p>
            </div>
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
    </>
  );
}
