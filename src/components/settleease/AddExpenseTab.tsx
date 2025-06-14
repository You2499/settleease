
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { CreditCard, AlertTriangle, Users, Settings2 } from 'lucide-react';

import { toast } from "@/hooks/use-toast";

import PayerInputSection from './addexpense/PayerInputSection';
import SplitMethodSelector from './addexpense/SplitMethodSelector';
import EqualSplitSection from './addexpense/EqualSplitSection';
import UnequalSplitSection from './addexpense/UnequalSplitSection';
import ItemwiseSplitSection from './addexpense/ItemwiseSplitSection';

import { EXPENSES_TABLE, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, Person, PayerInputRow, ExpenseItemDetail, Category as DynamicCategory } from '@/lib/settleease/types';

interface AddExpenseTabProps {
  people: Person[];
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  onExpenseAdded: () => void;
  dynamicCategories: DynamicCategory[];
  expenseToEdit?: Expense | null;
  onCancelEdit?: () => void;
}

export default function AddExpenseTab({
  people,
  db,
  supabaseInitializationError,
  onExpenseAdded,
  dynamicCategories,
  expenseToEdit,
  onCancelEdit,
}: AddExpenseTabProps) {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('');
  
  const [payers, setPayers] = useState<PayerInputRow[]>([{ id: Date.now().toString(), personId: '', amount: '' }]);
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);

  const [splitMethod, setSplitMethod] = useState<Expense['split_method']>('equal');
  
  const [selectedPeopleEqual, setSelectedPeopleEqual] = useState<string[]>([]);
  const [unequalShares, setUnequalShares] = useState<Record<string, string>>({});
  
  const [items, setItems] = useState<ExpenseItemDetail[]>([{ id: Date.now().toString(), name: '', price: '', sharedBy: [] }]);

  const [isLoading, setIsLoading] = useState(false);
  
  const initialPeopleSetForFormInstance = useRef<Set<string>>(new Set());

  const defaultPayerId = useMemo(() => {
    if (people.length > 0) {
      const currentUserAsPerson = people.find(p => p.name.toLowerCase() === 'you' || p.name.toLowerCase() === 'me');
      return currentUserAsPerson ? currentUserAsPerson.id : people[0].id;
    }
    return '';
  }, [people]);

  useEffect(() => {
    if (!expenseToEdit) {
      initialPeopleSetForFormInstance.current = new Set();
    }
  }, [expenseToEdit]);

  useEffect(() => {
    if (expenseToEdit) {
      initialPeopleSetForFormInstance.current = new Set(); 
      setDescription(expenseToEdit.description);
      setTotalAmount(expenseToEdit.total_amount.toString());
      setCategory(expenseToEdit.category);
      
      if (Array.isArray(expenseToEdit.paid_by) && expenseToEdit.paid_by.length > 0) {
          setIsMultiplePayers(expenseToEdit.paid_by.length > 1);
          setPayers(expenseToEdit.paid_by.map(p => ({ 
            id: p.personId + Date.now().toString() + Math.random().toString(),
            personId: p.personId, 
            amount: p.amount.toString() 
          })));
      } else if (Array.isArray(expenseToEdit.paid_by) && expenseToEdit.paid_by.length === 0) {
        setIsMultiplePayers(false);
        setPayers([{ 
          id: Date.now().toString(), 
          personId: defaultPayerId || (people.length > 0 ? people[0].id : ''), 
          amount: expenseToEdit.total_amount.toString()
        }]);
      } else { 
        setIsMultiplePayers(false);
        setPayers([{ 
          id: Date.now().toString(), 
          personId: defaultPayerId || (people.length > 0 ? people[0].id : ''), 
          amount: expenseToEdit.total_amount.toString() 
        }]);
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
         setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id) }]);
      }

    } else { 
      setDescription('');
      setTotalAmount(''); 
      setCategory(dynamicCategories[0]?.name || '');
      setIsMultiplePayers(false);
      setSplitMethod('equal');

      const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);

      setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
      setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id) }]);
      
      const currentPeopleIds = people.map(p => p.id);
      const previousPeopleSnapshot = initialPeopleSetForFormInstance.current;

      if (previousPeopleSnapshot.size === 0 && people.length > 0) {
        setSelectedPeopleEqual(currentPeopleIds);
        initialPeopleSetForFormInstance.current = new Set(currentPeopleIds); 
      } else {
        setSelectedPeopleEqual(prevSelected => {
          const newSelected = new Set(prevSelected);
          currentPeopleIds.forEach(personId => {
            if (!previousPeopleSnapshot.has(personId)) {
              newSelected.add(personId);
            }
          });
          return Array.from(newSelected).filter(id => currentPeopleIds.includes(id));
        });

        const currentSnapshotSet = new Set(currentPeopleIds);
        if (currentSnapshotSet.size !== previousPeopleSnapshot.size ||
            !Array.from(currentSnapshotSet).every(id => previousPeopleSnapshot.has(id))) {
          initialPeopleSetForFormInstance.current = currentSnapshotSet;
        }
      }
    }
  }, [expenseToEdit, people, dynamicCategories, defaultPayerId]);

  useEffect(() => {
    if (!isMultiplePayers) {
      const currentPayer = payers[0];
      const newPayerAmount = totalAmount; 
      const newPayerPersonId = currentPayer?.personId || defaultPayerId || (people.length > 0 ? people[0].id : '');

      if (!currentPayer || currentPayer.personId !== newPayerPersonId || currentPayer.amount !== newPayerAmount) {
        setPayers([{ id: currentPayer?.id || Date.now().toString(), personId: newPayerPersonId, amount: newPayerAmount }]);
      }
    } else { 
        const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
        if (payers.length === 0 && firstPayerPersonId) { 
             setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);
        } else if (payers.length === 1 && !payers[0].personId && firstPayerPersonId) {
            if (payers[0].personId !== firstPayerPersonId) { 
                setPayers(prev => [{ ...prev[0], personId: firstPayerPersonId }]);
            }
        }
    }
  }, [totalAmount, isMultiplePayers, defaultPayerId, people, payers]); 


  useEffect(() => {
    if (expenseToEdit) return; 

    if (splitMethod === 'unequal') {
       const anySharesPopulated = Object.values(unequalShares).some(val => val && parseFloat(val) > 0);
        if (!anySharesPopulated && people.length > 0) {
            const initialEmptyShares = people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>);
            if (JSON.stringify(unequalShares) !== JSON.stringify(initialEmptyShares)) { 
                 setUnequalShares(initialEmptyShares);
            }
        }
    }
    
    if (splitMethod === 'itemwise' && items.length === 0 && people.length > 0 ) {
        setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p=>p.id) }]);
    }
  }, [splitMethod, people, expenseToEdit, items, unequalShares]); 


  const handlePayerChange = (index: number, field: keyof PayerInputRow, value: string) => {
    const newPayers = [...payers];
    newPayers[index] = { ...newPayers[index], [field]: value };
    setPayers(newPayers);
  };

  const addPayer = () => {
    const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
    setPayers([...payers, { id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);
  };

  const removePayer = (index: number) => {
    const newPayers = payers.filter((_, i) => i !== index);
    const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
    if (newPayers.length === 0) { 
        if (isMultiplePayers) {
            setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);
        } else { 
            setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: totalAmount }]);
        }
    } else {
      setPayers(newPayers);
    }
  };
  
  const handleToggleMultiplePayers = () => {
    const goingToMultiple = !isMultiplePayers;
    setIsMultiplePayers(goingToMultiple);
    const firstPayerPersonId = payers[0]?.personId || defaultPayerId || (people.length > 0 ? people[0].id : '');

    if (goingToMultiple) {
      const firstPayerAmount = (payers.length === 1 && payers[0].amount && payers[0].amount !== '0' && payers[0].amount !== '0.00') ? payers[0].amount : '';
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: firstPayerAmount }]);
    } else {
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: totalAmount }]);
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
    setItems([...items, { id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id) }]); 
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
    if (!description.trim()) { toast({ title: "Validation Error", description: "Description cannot be empty.", variant: "destructive" }); return false; }
    const amountNum = parseFloat(totalAmount);
    if (isNaN(amountNum) || amountNum <= 0) { toast({ title: "Validation Error", description: "Total amount must be a positive number.", variant: "destructive" }); return false; }
    if (!category) { toast({ title: "Validation Error", description: "Category must be selected.", variant: "destructive" }); return false; }

    if (payers.some(p => !p.personId)) { toast({ title: "Validation Error", description: "Each payer must be selected.", variant: "destructive" }); return false; }
    const totalPaidByPayers = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(totalPaidByPayers - amountNum) > 0.001) { 
      toast({ title: "Validation Error", description: `Total paid by payers (${formatCurrency(totalPaidByPayers)}) does not match the total expense amount (${formatCurrency(amountNum)}).`, variant: "destructive" }); return false;
    }
    if (isMultiplePayers && payers.some(p => (parseFloat(p.amount) || 0) <= 0)) {
        if (payers.length > 1 || (payers.length ===1 && parseFloat(payers[0].amount || "0") <=0 )) { 
             toast({ title: "Validation Error", description: "Each payer's amount must be positive if listed.", variant: "destructive" }); return false;
        }
    }
    if (!isMultiplePayers && payers.length === 1 && (parseFloat(payers[0].amount) || 0) <= 0 && amountNum > 0) {
        toast({ title: "Validation Error", description: "Payer amount must be positive.", variant: "destructive" }); return false;
    }

    if (splitMethod === 'equal' && selectedPeopleEqual.length === 0) { toast({ title: "Validation Error", description: "At least one person must be selected for equal split.", variant: "destructive" }); return false; }
    if (splitMethod === 'unequal') {
      const sumUnequal = Object.values(unequalShares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      if (Math.abs(sumUnequal - amountNum) > 0.001) { toast({ title: "Validation Error", description: `Sum of unequal shares (${formatCurrency(sumUnequal)}) must equal total amount (${formatCurrency(amountNum)}).`, variant: "destructive" }); return false; }
      if (Object.values(unequalShares).some(val => parseFloat(val || "0") < 0)) { toast({ title: "Validation Error", description: "Unequal shares cannot be negative.", variant: "destructive" }); return false; }
    }
    if (splitMethod === 'itemwise') {
      if (items.length === 0) { toast({ title: "Validation Error", description: "At least one item must be added for itemwise split.", variant: "destructive" }); return false; }
      if (items.some(item => !item.name.trim() || isNaN(parseFloat(item.price as string)) || parseFloat(item.price as string) <= 0 || item.sharedBy.length === 0)) {
        toast({ title: "Validation Error", description: "Each item must have a name, positive price, and be shared by at least one person.", variant: "destructive" }); return false;
      }
      const sumItems = items.reduce((sum, item) => sum + (parseFloat(item.price as string) || 0), 0);
      if (Math.abs(sumItems - amountNum) > 0.001) { toast({ title: "Validation Error", description: `Sum of item prices (${formatCurrency(sumItems)}) must equal total amount (${formatCurrency(amountNum)}).`, variant: "destructive" }); return false; }
    }
    return true;
  }, [description, totalAmount, category, payers, splitMethod, selectedPeopleEqual, unequalShares, items, isMultiplePayers]);

  const handleSubmitExpense = async () => {
    if (!validateForm()) return;

    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Supabase client not available. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const finalPayers = payers
        .filter(p => p.personId && parseFloat(p.amount) > 0) 
        .map(p => ({ personId: p.personId, amount: parseFloat(p.amount) }));

    if (finalPayers.length === 0 && parseFloat(totalAmount) > 0) {
        toast({ title: "Validation Error", description: "At least one valid payer with a positive amount is required.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    let calculatedShares: { personId: string; amount: number; }[] = [];
    let expenseItemsPayload: ExpenseItemDetail[] | null = null;

    if (splitMethod === 'equal') {
      const shareAmount = selectedPeopleEqual.length > 0 ? parseFloat(totalAmount) / selectedPeopleEqual.length : 0;
      calculatedShares = selectedPeopleEqual.map(personId => ({ personId, amount: shareAmount }));
    } else if (splitMethod === 'unequal') {
      calculatedShares = Object.entries(unequalShares)
        .filter(([_, amountStr]) => parseFloat(amountStr || "0") > 0) 
        .map(([personId, amountStr]) => ({ personId, amount: parseFloat(amountStr) }));
    } else if (splitMethod === 'itemwise') {
      expenseItemsPayload = items.map(item => ({
        id: item.id, 
        name: item.name,
        price: parseFloat(item.price as string),
        sharedBy: item.sharedBy
      }));
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
      calculatedShares = Object.entries(itemwiseSharesMap).map(([personId, amount]) => ({ personId, amount }));
    }

    try {
      if (expenseToEdit && expenseToEdit.id) {
        const updatePayload: Partial<Omit<Expense, 'id' | 'created_at' | 'updated_at'>> & { items: ExpenseItemDetail[] | null } = {
          description,
          total_amount: parseFloat(totalAmount),
          category,
          paid_by: finalPayers,
          split_method: splitMethod,
          shares: calculatedShares,
          items: splitMethod === 'itemwise' ? expenseItemsPayload : null, 
        };
        
        const { error: updateError } = await db
          .from(EXPENSES_TABLE)
          .update(updatePayload) 
          .eq('id', expenseToEdit.id)
          .select();
        if (updateError) throw updateError;
        toast({ title: "Expense Updated", description: `${description} has been updated successfully.` });
      } else {
        const insertPayload: Omit<Expense, 'id' | 'created_at' | 'updated_at'> = {
          description,
          total_amount: parseFloat(totalAmount),
          category,
          paid_by: finalPayers,
          split_method: splitMethod,
          shares: calculatedShares,
          items: splitMethod === 'itemwise' ? expenseItemsPayload : undefined,
        };
        const { error: insertError } = await db
          .from(EXPENSES_TABLE)
          .insert([{ ...insertPayload, created_at: new Date().toISOString() }]) 
          .select();
        if (insertError) throw insertError;
        toast({ title: "Expense Added", description: `${description} has been added successfully.` });
      }
      onExpenseAdded(); 
      if (!expenseToEdit) { 
        // Fields are reset by the main useEffect if not editing
      }
    } catch (error: any) {
      let errorMessage = "An unknown error occurred while saving the expense.";
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
      console.error("Error saving expense:", errorMessage, error);
      toast({ title: "Save Error", description: `Could not save expense: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-lg rounded-lg h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          <p>Could not connect to the database. Adding or editing expenses is currently unavailable.</p>
          <p className="text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }

  if (people.length === 0 && !expenseToEdit) { 
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg h-full flex flex-col items-center justify-center">
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
    <Card className="shadow-lg rounded-lg h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <CreditCard className="mr-2 h-5 w-5 text-primary" /> {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
        </CardTitle>
        <CardDescription>
          {expenseToEdit ? 'Update the details of the expense.' : 'Enter the details of the expense, who paid, and how it should be split.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 min-h-0 overflow-y-auto">
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
              <Select value={category} onValueChange={setCategory} disabled={dynamicCategories.length === 0}>
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {dynamicCategories.map(cat => {
                      const iconInfo = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === cat.icon_name);
                      const IconComponent = iconInfo ? iconInfo.IconComponent : Settings2;
                      return (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center">
                          <IconComponent className="mr-2 h-4 w-4" />
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
        
        <PayerInputSection
          isMultiplePayers={isMultiplePayers}
          onToggleMultiplePayers={handleToggleMultiplePayers}
          payers={payers}
          people={people}
          defaultPayerId={defaultPayerId}
          handlePayerChange={handlePayerChange}
          addPayer={addPayer}
          removePayer={removePayer}
          expenseToEdit={expenseToEdit}
        />

        <Separator />

        <SplitMethodSelector splitMethod={splitMethod} setSplitMethod={setSplitMethod} />

        {splitMethod === 'equal' && (
          <EqualSplitSection 
            people={people}
            selectedPeopleEqual={selectedPeopleEqual}
            handleEqualSplitChange={handleEqualSplitChange}
          />
        )}

        {splitMethod === 'unequal' && (
          <UnequalSplitSection
            people={people}
            unequalShares={unequalShares}
            handleUnequalShareChange={handleUnequalShareChange}
          />
        )}
        
        {splitMethod === 'itemwise' && (
          <ItemwiseSplitSection
            items={items}
            people={people}
            handleItemChange={handleItemChange}
            handleItemSharedByChange={handleItemSharedByChange}
            removeItem={removeItem}
            addItem={addItem}
          />
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-end space-x-2">
        {expenseToEdit && onCancelEdit && (
            <Button variant="outline" onClick={onCancelEdit} disabled={isLoading}>Cancel</Button>
        )}
        <Button onClick={handleSubmitExpense} disabled={isLoading || (people.length === 0 && !expenseToEdit) || (dynamicCategories.length === 0 && !category) }>
          {isLoading ? (expenseToEdit ? "Updating..." : "Adding...") : (expenseToEdit ? "Update Expense" : "Add Expense")}
        </Button>
      </CardFooter>
    </Card>
  );
}
