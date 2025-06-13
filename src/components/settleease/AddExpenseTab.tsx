
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { FileText, Trash2, PlusCircle, Users, CreditCard, AlertTriangle, X, Settings2, Pencil, Save, Ban, MinusCircle } from 'lucide-react';

import { toast } from "@/hooks/use-toast";

import { CATEGORIES, EXPENSES_TABLE, formatCurrency } from '@/lib/settleease';
import type { Expense, Person, PayerInputRow, ExpenseItemDetail } from '@/lib/settleease';

interface AddExpenseTabProps {
  people: Person[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onExpenseAdded: () => void;
  expenseToEdit?: Expense | null;
  onCancelEdit?: () => void;
}

export default function AddExpenseTab({
  people,
  db,
  supabaseInitializationError,
  onExpenseAdded,
  expenseToEdit,
  onCancelEdit,
}: AddExpenseTabProps) {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  
  const [payers, setPayers] = useState<PayerInputRow[]>([{ id: Date.now().toString(), personId: '', amount: '' }]);
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);

  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal' | 'itemwise'>('equal');
  
  const [selectedPeopleEqual, setSelectedPeopleEqual] = useState<string[]>([]);
  const [unequalShares, setUnequalShares] = useState<Record<string, string>>({});
  
  const [items, setItems] = useState<ExpenseItemDetail[]>([{ id: Date.now().toString(), name: '', price: '', sharedBy: [] }]);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);


  // This useEffect was causing parsing errors and is commented out.
  // It was intended to reset/update form state when the `people` prop changes (e.g., after managing people).
  // useEffect(() => {
  //   // Helper to safely get the first person's ID or an empty string
  //   const getFirstPersonIdOrDefault = () => {
  //     return people.length > 0 ? people[0].id : '';
  //   };
  
  //   if (people.length > 0) {
  //     const existingPeopleIds = new Set(people.map((p_mapExisting) => { return p_mapExisting.id; }));
  
  //     // Update payers
  //     setPayers((prevPayers_setPayersEffect) => {
  //       let updatedPayers_setPayersEffect = prevPayers_setPayersEffect.map((payer_setPayersEffect) => {
  //         return existingPeopleIds.has(payer_setPayersEffect.personId) ? payer_setPayersEffect : { ...payer_setPayersEffect, personId: '' };
  //       });
  
  //       // If all payers are now invalid (personId cleared), reset to the first available person or default
  //       if (updatedPayers_setPayersEffect.every((p_setPayersEffect) => { return p_setPayersEffect.personId === ''; })) {
  //         const defaultPayerIdForEffect = getFirstPersonIdOrDefault();
  //         updatedPayers_setPayersEffect = [{ id: Date.now().toString(), personId: defaultPayerIdForEffect, amount: totalAmount || '' }];
  //       }
  
  //       // If not multiple payers and we have a total amount, ensure the single payer's amount reflects it
  //       if (!isMultiplePayers && updatedPayers_setPayersEffect.length === 1 && totalAmount) {
  //         updatedPayers_setPayersEffect[0].amount = totalAmount;
  //       } else if (!isMultiplePayers && updatedPayers_setPayersEffect.length === 0 && totalAmount) {
  //         // Handle case where payers array might become empty but should have one entry
  //         const defaultPayerIdForEffect = getFirstPersonIdOrDefault();
  //         updatedPayers_setPayersEffect = [{ id: Date.now().toString(), personId: defaultPayerIdForEffect, amount: totalAmount || '' }];
  //       }
  //       return updatedPayers_setPayersEffect;
  //     });
  
  //     // Update selected people for equal split
  //     setSelectedPeopleEqual((prevSelected_setSelectedPeopleEqualEffect) => {
  //       return prevSelected_setSelectedPeopleEqualEffect.filter((id_setSelectedPeopleEqualEffect) => { 
  //           return existingPeopleIds.has(id_setSelectedPeopleEqualEffect); 
  //       });
  //     });
  
  //     // Update unequal shares
  //     setUnequalShares((prevShares_setUnequalSharesEffect) => {
  //       const newShares_setUnequalSharesEffect: Record<string, string> = {};
  //       for (const personId_setUnequalSharesEffect in prevShares_setUnequalSharesEffect) {
  //         if (existingPeopleIds.has(personId_setUnequalSharesEffect)) {
  //           newShares_setUnequalSharesEffect[personId_setUnequalSharesEffect] = prevShares_setUnequalSharesEffect[personId_setUnequalSharesEffect];
  //         }
  //       }
  //       return newShares_setUnequalSharesEffect;
  //     });
  
  //     // Update itemwise shares
  //     setItems((prevItems_setItemsEffect) => {
  //       return prevItems_setItemsEffect.map((item_setItemsEffect) => {
  //         return {
  //           ...item_setItemsEffect,
  //           sharedBy: item_setItemsEffect.sharedBy.filter((id_setItemsEffect) => { 
  //               return existingPeopleIds.has(id_setItemsEffect); 
  //           }),
  //         };
  //       });
  //     });
  //   } else { // people.length === 0, reset relevant fields
  //       setPayers([{ id: Date.now().toString(), personId: '', amount: totalAmount || ''}]);
  //       setSelectedPeopleEqual([]);
  //       setUnequalShares({});
  //       setItems((prevItems_reset) => {
  //           return prevItems_reset.map((item_reset) => {
  //               return {...item_reset, sharedBy: [] };
  //           });
  //       });
  //   }
  // }, [people, isMultiplePayers, totalAmount]); // Dependencies reviewed.
  

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setTotalAmount(expenseToEdit.total_amount.toString());
      setCategory(expenseToEdit.category);
      
      if (Array.isArray(expenseToEdit.paid_by) && expenseToEdit.paid_by.length > 0) {
        setIsMultiplePayers(expenseToEdit.paid_by.length > 1);
        setPayers(expenseToEdit.paid_by.map(p => ({ id: p.personId + Date.now().toString() + Math.random().toString(), personId: p.personId, amount: p.amount.toString() })));
      } else {
        setIsMultiplePayers(false);
        setPayers([{ id: Date.now().toString(), personId: people[0]?.id || '', amount: expenseToEdit.total_amount.toString() }]);
      }

      setSplitMethod(expenseToEdit.split_method);

      if (expenseToEdit.split_method === 'equal' && Array.isArray(expenseToEdit.shares)) {
        setSelectedPeopleEqual(expenseToEdit.shares.map(s => s.personId));
      } else {
        setSelectedPeopleEqual(people.map(p => p.id));
      }

      if (expenseToEdit.split_method === 'unequal' && Array.isArray(expenseToEdit.shares)) {
        const initialUnequalShares: Record<string, string> = {};
        expenseToEdit.shares.forEach(s => { initialUnequalShares[s.personId] = s.amount.toString(); });
        setUnequalShares(initialUnequalShares);
      } else {
        setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
      }

      if (expenseToEdit.split_method === 'itemwise' && Array.isArray(expenseToEdit.items)) {
        setItems(expenseToEdit.items.map(item => ({
          id: item.id || Date.now().toString() + Math.random(),
          name: item.name,
          price: item.price.toString(),
          sharedBy: item.sharedBy || []
        })));
      } else {
         setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: [] }]);
      }

    } else {
      // Reset form for new expense
      setDescription('');
      setTotalAmount('');
      setCategory(CATEGORIES[0].name);
      setIsMultiplePayers(false);
      setPayers([{ id: Date.now().toString(), personId: people[0]?.id || '', amount: '' }]);
      setSplitMethod('equal');
      setSelectedPeopleEqual(people.map(p => p.id)); // Default to all people selected for equal split on new expense
      setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
      setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: [] }]);
    }
  }, [expenseToEdit, people]); // Removed totalAmount from deps as it might cause loops with payer updates.


  const defaultPayerId = useMemo(() => {
    if (people.length > 0) {
      // Attempt to find a common default name like "You" or use the first person.
      const currentUserAsPerson = people.find(p => p.name.toLowerCase() === 'you' || p.name.toLowerCase() === 'me');
      return currentUserAsPerson ? currentUserAsPerson.id : people[0].id;
    }
    return '';
  }, [people]);

  useEffect(() => {
    // Initialize or adjust single payer
    if (!isMultiplePayers) {
      const currentPayer = payers[0];
      let newPayerAmount = totalAmount;
      let newPayerPersonId = currentPayer?.personId || defaultPayerId;

      // If editing and totalAmount changes, update single payer's amount
      if (expenseToEdit && currentPayer?.amount !== totalAmount) {
        // This condition might be too broad if totalAmount changes for other reasons
      }
      
      // If no payer is set, or the current one is empty, set default
      if (!currentPayer?.personId && defaultPayerId) {
         // newPayerPersonId is already set
      }

      // Only update if necessary to avoid loops
      if (!currentPayer || currentPayer.personId !== newPayerPersonId || currentPayer.amount !== newPayerAmount) {
        setPayers([{ id: currentPayer?.id || Date.now().toString(), personId: newPayerPersonId, amount: newPayerAmount }]);
      }
    } else { // Multiple payers logic
        if (payers.length === 0 && defaultPayerId) {
             setPayers([{ id: Date.now().toString(), personId: defaultPayerId, amount: '' }]);
        } else if (payers.length === 1 && !payers[0].personId && defaultPayerId) {
            setPayers(prev => [{ ...prev[0], personId: defaultPayerId }]);
        }
    }
  }, [totalAmount, isMultiplePayers, defaultPayerId, payers, expenseToEdit, people.length]);


  useEffect(() => {
    if (splitMethod === 'equal') {
      // For new expenses or if no one is selected, default to all.
      if (!expenseToEdit || selectedPeopleEqual.length === 0) {
        const allPeopleIds = people.map(p => p.id);
        // Avoid unnecessary re-renders if already set to all people
        if (selectedPeopleEqual.length !== allPeopleIds.length || !selectedPeopleEqual.every(id => allPeopleIds.includes(id))) {
            setSelectedPeopleEqual(allPeopleIds);
        }
      }
    } else if (splitMethod === 'unequal') {
       // If no shares defined, initialize for all people
       const anySharesPopulated = Object.values(unequalShares).some(val => val && parseFloat(val) > 0);
        if (!anySharesPopulated && people.length > 0) {
            const initialEmptyShares = people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>);
            // Avoid re-render if already empty for all
            if (JSON.stringify(unequalShares) !== JSON.stringify(initialEmptyShares)) {
                 setUnequalShares(initialEmptyShares);
            }
        }
    }
  }, [splitMethod, people, expenseToEdit, selectedPeopleEqual, unequalShares]); // selectedPeopleEqual was removed from deps to avoid loop

  const handlePayerChange = (index: number, field: keyof PayerInputRow, value: string) => {
    const newPayers = [...payers];
    newPayers[index] = { ...newPayers[index], [field]: value };
    setPayers(newPayers);
  };

  const addPayer = () => {
    setPayers([...payers, { id: Date.now().toString(), personId: defaultPayerId || '', amount: '' }]);
  };

  const removePayer = (index: number) => {
    const newPayers = payers.filter((_, i) => i !== index);
    if (newPayers.length === 0) { // If all payers removed, add one back if in multiple payer mode
        if (isMultiplePayers) {
            setPayers([{ id: Date.now().toString(), personId: defaultPayerId || '', amount: '' }]);
        } else { // Should not happen if UI prevents removing the last single payer
            setPayers([{ id: Date.now().toString(), personId: defaultPayerId || '', amount: totalAmount }]);
        }
    } else {
      setPayers(newPayers);
    }
  };
  
  const handleToggleMultiplePayers = () => {
    const goingToMultiple = !isMultiplePayers;
    setIsMultiplePayers(goingToMultiple);
    if (goingToMultiple) {
      // If was single payer with amount, keep that amount for the first multi-payer, or clear if no amount
      const firstPayerAmount = (payers.length === 1 && payers[0].amount && payers[0].amount !== '0' && payers[0].amount !== '0.00') ? payers[0].amount : '';
      setPayers([{ id: Date.now().toString(), personId: payers[0]?.personId || defaultPayerId || '', amount: firstPayerAmount }]);
    } else {
      // Switching to single payer: use first current payer or default, set amount to totalAmount
      setPayers([{ id: Date.now().toString(), personId: payers[0]?.personId || defaultPayerId || '', amount: totalAmount }]);
    }
  };


  const handleEqualSplitChange = (personId: string) => {
    setSelectedPeopleEqual(prev =>
      prev.includes(personId) ? prev.filter(id => id !== personId) : [...prev, personId]
    );
  };

  const handleUnequalShareChange = (personId: string, value: string) => {
    setUnequalShares(prev => ({ ...prev, [personId]: value }));
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id) }]); // Default to all people sharing new item
  };

  const handleItemChange = <K extends keyof ExpenseItemDetail>(index: number, field: K, value: ExpenseItemDetail[K]) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleItemSharedByChange = (itemIndex: number, personId: string) => {
    const newItems = [...items];
    const currentSharedBy = newItems[itemIndex].sharedBy;
    newItems[itemIndex].sharedBy = currentSharedBy.includes(personId)
      ? currentSharedBy.filter(id => id !== personId)
      : [...currentSharedBy, personId];
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const validateForm = useCallback(() => {
    setFormError(null);
    if (!description.trim()) return "Description cannot be empty.";
    const amountNum = parseFloat(totalAmount);
    if (isNaN(amountNum) || amountNum <= 0) return "Total amount must be a positive number.";
    if (!category) return "Category must be selected.";

    if (payers.some(p => !p.personId)) return "Each payer must be selected.";
    const totalPaidByPayers = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(totalPaidByPayers - amountNum) > 0.001) { // Using a small epsilon for float comparison
      return `Total paid by payers (${formatCurrency(totalPaidByPayers)}) does not match the total expense amount (${formatCurrency(amountNum)}).`;
    }
    if (isMultiplePayers && payers.some(p => (parseFloat(p.amount) || 0) <= 0)) {
        if (payers.length > 1 || (payers.length ===1 && parseFloat(payers[0].amount || "0") <=0 )) { // Allow single payer in multi-mode to be 0 if they are the only one, effectively making it like no one paid yet.
             return "Each payer's amount must be positive if listed.";
        }
    }
    if (!isMultiplePayers && payers.length === 1 && (parseFloat(payers[0].amount) || 0) <= 0 && amountNum > 0) {
        return "Payer amount must be positive.";
    }


    if (splitMethod === 'equal' && selectedPeopleEqual.length === 0) return "At least one person must be selected for equal split.";
    if (splitMethod === 'unequal') {
      const sumUnequal = Object.values(unequalShares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      if (Math.abs(sumUnequal - amountNum) > 0.001) return `Sum of unequal shares (${formatCurrency(sumUnequal)}) must equal total amount (${formatCurrency(amountNum)}).`;
      if (Object.values(unequalShares).some(val => parseFloat(val || "0") < 0)) return "Unequal shares cannot be negative.";
    }
    if (splitMethod === 'itemwise') {
      if (items.length === 0) return "At least one item must be added for itemwise split.";
      if (items.some(item => !item.name.trim() || isNaN(parseFloat(item.price as string)) || parseFloat(item.price as string) <= 0 || item.sharedBy.length === 0)) {
        return "Each item must have a name, positive price, and be shared by at least one person.";
      }
      const sumItems = items.reduce((sum, item) => sum + (parseFloat(item.price as string) || 0), 0);
      if (Math.abs(sumItems - amountNum) > 0.001) return `Sum of item prices (${formatCurrency(sumItems)}) must equal total amount (${formatCurrency(amountNum)}).`;
    }
    return null;
  }, [description, totalAmount, category, payers, splitMethod, selectedPeopleEqual, unequalShares, items, isMultiplePayers]);

  const handleSubmitExpense = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      toast({ title: "Validation Error", description: error, variant: "destructive" });
      return;
    }
    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Supabase client not available. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const finalPayers = payers
        .filter(p => p.personId && parseFloat(p.amount) > 0) // Ensure valid payers
        .map(p => ({ personId: p.personId, amount: parseFloat(p.amount) }));

    if (finalPayers.length === 0 && parseFloat(totalAmount) > 0) {
        setFormError("At least one valid payer with a positive amount is required if total amount is positive.");
        toast({ title: "Validation Error", description: "At least one valid payer with a positive amount is required.", variant: "destructive" });
        setIsLoading(false);
        return;
    }


    const expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'> = {
      description,
      total_amount: parseFloat(totalAmount),
      category,
      paid_by: finalPayers,
      split_method: splitMethod,
      shares: [],
      items: [], // Will be populated for itemwise
    };

    if (splitMethod === 'equal') {
      const shareAmount = selectedPeopleEqual.length > 0 ? parseFloat(totalAmount) / selectedPeopleEqual.length : 0;
      expenseData.shares = selectedPeopleEqual.map(personId => ({ personId, amount: shareAmount }));
    } else if (splitMethod === 'unequal') {
      expenseData.shares = Object.entries(unequalShares)
        .filter(([_, amountStr]) => parseFloat(amountStr || "0") > 0) // Only include positive shares
        .map(([personId, amountStr]) => ({ personId, amount: parseFloat(amountStr) }));
    } else if (splitMethod === 'itemwise') {
      expenseData.items = items.map(item => ({
        id: item.id, 
        name: item.name,
        price: parseFloat(item.price as string),
        sharedBy: item.sharedBy
      }));
      // Calculate shares from items
      const itemwiseSharesMap: Record<string, number> = {};
      items.forEach(item => {
        const itemPrice = parseFloat(item.price as string);
        if (item.sharedBy.length > 0) {
            const pricePerPerson = itemPrice / item.sharedBy.length;
            item.sharedBy.forEach(personId => {
            itemwiseSharesMap[personId] = (itemwiseSharesMap[personId] || 0) + pricePerPerson;
            });
        }
      });
      expenseData.shares = Object.entries(itemwiseSharesMap).map(([personId, amount]) => ({ personId, amount }));
    }

    try {
      if (expenseToEdit && expenseToEdit.id) {
        const updatePayload = { ...expenseData };
        const { error: updateError } = await db
          .from(EXPENSES_TABLE)
          .update(updatePayload) 
          .eq('id', expenseToEdit.id)
          .select();
        if (updateError) throw updateError;
        toast({ title: "Expense Updated", description: `${description} has been updated successfully.` });
      } else {
        const { error: insertError } = await db
          .from(EXPENSES_TABLE)
          .insert([{ ...expenseData, created_at: new Date().toISOString() }]) 
          .select();
        if (insertError) throw insertError;
        toast({ title: "Expense Added", description: `${description} has been added successfully.` });
      }
      onExpenseAdded(); 
      if (!expenseToEdit) {
        setDescription(''); setTotalAmount(''); setCategory(CATEGORIES[0].name);
        setPayers([{ id: Date.now().toString(), personId: people[0]?.id || defaultPayerId || '', amount: '' }]);
        setIsMultiplePayers(false);
        setSplitMethod('equal'); 
        setSelectedPeopleEqual(people.map(p => p.id));
        setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
        setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p=>p.id) }]);
      }
    } catch (error: any) {
      let errorMessage = "An unknown error occurred while saving the expense.";
      // Attempt to get a more specific message
      if (error) {
        if (typeof error.message === 'string' && error.message.trim() !== '') {
          errorMessage = error.message;
        } else if (typeof error.code === 'string' && error.code.trim() !== '') { 
          errorMessage = `Error code: ${error.code}`;
        } else if (typeof error.details === 'string' && error.details.trim() !== '') { 
          errorMessage = error.details;
        } else if (typeof error === 'string' && error.trim() !== '') {
          errorMessage = error;
        }
      }
      
      console.error("Error saving expense. Best guess message:", errorMessage);
      console.error("Raw error object received in catch block:", error);
      
      if (error && typeof error === 'object') {
        // Log all enumerable keys and their values
        for (const key in error) {
          if (Object.prototype.hasOwnProperty.call(error, key)) {
            console.error(`Error object property - ${key}:`, error[key]);
          }
        }
        // Attempt to stringify, including non-enumerable properties if possible
        try {
          const errorJson = JSON.stringify(error, Object.getOwnPropertyNames(error));
          console.error("Full error (JSON with own properties):", errorJson);
          if (errorJson === '{}' && error.toString() !== '[object Object]' && error.toString() !== '{}') {
             console.error("Error object .toString():", error.toString());
          }
        } catch (stringifyError) {
          console.error("Could not stringify the full error object due to:", stringifyError);
          // Fallback if stringify fails (e.g. circular refs)
          if (error.stack) {
            console.error("Error stack:", error.stack);
          }
        }
      } else {
        console.log("Caught error is not a typical object or is null/undefined. Type:", typeof error);
      }

      toast({ title: "Save Error", description: `Could not save expense: ${errorMessage}`, variant: "destructive" });
      setFormError(`Could not save expense: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
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
          <p>Could not connect to the database. Adding or editing expenses is currently unavailable.</p>
          <p className="text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }

  if (people.length === 0 && !expenseToEdit) { // Allow editing even if no people (e.g. to delete)
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold text-primary flex items-center justify-center">
            <Users className="mr-2 h-6 w-6" /> Add People First
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-md text-muted-foreground">You need to add people to your group before you can add expenses.</p>
          <p className="text-sm">Please go to the "Manage People" tab to add participants.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6"> 
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <CreditCard className="mr-2 h-5 w-5 text-primary" /> {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
          </CardTitle>
          <CardDescription>
            {expenseToEdit ? 'Update the details of the expense.' : 'Enter the details of the expense, who paid, and how it should be split.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <strong>Error:</strong>
              </div>
              <p className="ml-6">{formError}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Dinner at Joe's" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input id="totalAmount" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="e.g., 100.00" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => {
                       const IconComponent = cat.icon;
                       return (
                        <SelectItem key={cat.name} value={cat.name}>
                          <div className="flex items-center">
                            <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" />
                            {cat.name}
                          </div>
                        </SelectItem>
                       );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Paid By</Label>
              <div className="flex items-center space-x-2">
                <Label htmlFor="multiplePayersSwitch" className="text-sm text-muted-foreground">Multiple Payers?</Label>
                <Checkbox id="multiplePayersSwitch" checked={isMultiplePayers} onCheckedChange={handleToggleMultiplePayers} />
              </div>
            </div>
            {isMultiplePayers ? (
              <div className="space-y-2.5">
                {payers.map((payer, index) => (
                  <Card key={payer.id} className="p-3 bg-card/50 shadow-sm">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <Select value={payer.personId} onValueChange={val => handlePayerChange(index, 'personId', val)} disabled={people.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                        <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" value={payer.amount} onChange={e => handlePayerChange(index, 'amount', e.target.value)} placeholder="Amount" className="w-28" />
                      <Button variant="ghost" size="icon" onClick={() => removePayer(index)} className="text-destructive hover:bg-destructive/10 h-8 w-8" 
                        disabled={payers.length <= 1 && (!expenseToEdit || (expenseToEdit && payers.length === 1 && payers[0].personId === expenseToEdit.paid_by[0]?.personId))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={addPayer} className="text-xs" disabled={people.length === 0}><PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Another Payer</Button>
              </div>
            ) : (
              <Select value={payers[0]?.personId || ''} onValueChange={val => handlePayerChange(0, 'personId', val)} disabled={people.length === 0}>
                <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* Split Method Section */}
          <div className="space-y-3">
            <Label className="text-lg font-medium">Split Method</Label>
            <RadioGroup value={splitMethod} onValueChange={(val) => setSplitMethod(val as any)} className="flex space-x-4">
              <div className="flex items-center space-x-1.5"><RadioGroupItem value="equal" id="splitEqual" /><Label htmlFor="splitEqual" className="font-normal text-sm">Equally</Label></div>
              <div className="flex items-center space-x-1.5"><RadioGroupItem value="unequal" id="splitUnequal" /><Label htmlFor="splitUnequal" className="font-normal text-sm">Unequally</Label></div>
              <div className="flex items-center space-x-1.5"><RadioGroupItem value="itemwise" id="splitItemwise" /><Label htmlFor="splitItemwise" className="font-normal text-sm">Item-wise</Label></div>
            </RadioGroup>

            {/* Equal Split */}
            {splitMethod === 'equal' && (
              <Card className="p-4 bg-card/50 shadow-sm mt-2">
                <Label className="mb-2 block text-sm font-medium">Select who shared:</Label>
                {people.length > 0 ? (
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1.5 pr-2">
                    {people.map(person => (
                      <div key={person.id} className="flex items-center space-x-2 p-1.5 hover:bg-secondary/30 rounded-sm">
                        <Checkbox
                          id={`equal-${person.id}`}
                          checked={selectedPeopleEqual.includes(person.id)}
                          onCheckedChange={() => handleEqualSplitChange(person.id)}
                        />
                        <Label htmlFor={`equal-${person.id}`} className="font-normal text-sm flex-grow cursor-pointer">{person.name}</Label>
                      </div>
                    ))}
                    </div>
                  </ScrollArea>
                ) : <p className="text-xs text-muted-foreground">No people available to select.</p>}
              </Card>
            )}

            {/* Unequal Split */}
            {splitMethod === 'unequal' && (
              <Card className="p-4 bg-card/50 shadow-sm mt-2 space-y-2.5">
                {people.length > 0 ? people.map(person => (
                  <div key={person.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <Label htmlFor={`unequal-${person.id}`} className="text-sm">{person.name}</Label>
                    <Input
                      id={`unequal-${person.id}`}
                      type="number"
                      value={unequalShares[person.id] || ''}
                      onChange={e => handleUnequalShareChange(person.id, e.target.value)}
                      placeholder="Amount"
                      className="w-28"
                    />
                  </div>
                )) : <p className="text-xs text-muted-foreground">No people available for unequal split.</p>}
              </Card>
            )}
            
            {/* Item-wise Split */}
            {splitMethod === 'itemwise' && (
                <Card className="p-4 bg-card/50 shadow-sm mt-2 space-y-3">
                    {items.map((item, itemIndex) => (
                    <Card key={item.id} className="p-3 bg-background shadow-inner">
                        <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-grow space-y-1.5">
                            <Input value={item.name} onChange={e => handleItemChange(itemIndex, 'name', e.target.value)} placeholder={`Item ${itemIndex + 1} Name`} className="h-8 text-sm"/>
                            <Input type="number" value={item.price as string} onChange={e => handleItemChange(itemIndex, 'price', e.target.value)} placeholder="Price" className="h-8 text-sm w-24"/>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(itemIndex)} className="text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0" disabled={items.length <=1}>
                            <MinusCircle className="h-4 w-4" />
                        </Button>
                        </div>
                        <Label className="text-xs block mb-1 text-muted-foreground">Shared by:</Label>
                        {people.length > 0 ? (
                          <ScrollArea className="max-h-28">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pr-1">
                              {people.map(person => (
                              <div key={person.id} className="flex items-center space-x-1.5">
                                  <Checkbox
                                  id={`item-${itemIndex}-person-${person.id}`}
                                  checked={item.sharedBy.includes(person.id)}
                                  onCheckedChange={() => handleItemSharedByChange(itemIndex, person.id)}
                                  className="h-3.5 w-3.5"
                                  />
                                  <Label htmlFor={`item-${itemIndex}-person-${person.id}`} className="text-xs font-normal cursor-pointer">{person.name}</Label>
                              </div>
                              ))}
                          </div>
                          </ScrollArea>
                        ) : <p className="text-xs text-muted-foreground">No people available to share items.</p>}
                    </Card>
                    ))}
                    <Button variant="outline" size="sm" onClick={handleAddItem} className="text-xs mt-2"><PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Item</Button>
                </Card>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-end space-x-2">
          {expenseToEdit && onCancelEdit && (
             <Button variant="outline" onClick={onCancelEdit} disabled={isLoading}>Cancel</Button>
          )}
          <Button onClick={handleSubmitExpense} disabled={isLoading || (people.length === 0 && !expenseToEdit) }>
            {isLoading ? (expenseToEdit ? "Updating..." : "Adding...") : (expenseToEdit ? "Update Expense" : "Add Expense")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
