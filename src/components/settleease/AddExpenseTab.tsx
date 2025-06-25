"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, AlertTriangle, Users, Settings2, PartyPopper, Wallet, Info, FileText, Scale } from 'lucide-react';

import { toast } from "@/hooks/use-toast";

import PayerInputSection from './addexpense/PayerInputSection';
import SplitMethodSelector from './addexpense/SplitMethodSelector';
import EqualSplitSection from './addexpense/EqualSplitSection';
import UnequalSplitSection from './addexpense/UnequalSplitSection';
import ItemwiseSplitSection from './addexpense/ItemwiseSplitSection';

import { EXPENSES_TABLE, AVAILABLE_CATEGORY_ICONS } from '@/lib/settleease/constants';
import { formatCurrency } from '@/lib/settleease/utils';
import type { Expense, Person, PayerInputRow, ExpenseItemDetail, Category as DynamicCategory, CelebrationContribution } from '@/lib/settleease/types';

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

  const [isCelebrationMode, setIsCelebrationMode] = useState(false);
  const [celebrationPayerId, setCelebrationPayerId] = useState<string>('');
  const [celebrationAmountInput, setCelebrationAmountInput] = useState<string>('');

  const [splitMethod, setSplitMethod] = useState<Expense['split_method']>('equal');
  
  const [selectedPeopleEqual, setSelectedPeopleEqual] = useState<string[]>([]);
  const [unequalShares, setUnequalShares] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ExpenseItemDetail[]>([{ id: Date.now().toString(), name: '', price: '', sharedBy: [], categoryName: '' }]);

  const [isLoading, setIsLoading] = useState(false);
  
  const initialPeopleSetForFormInstance = useRef<Set<string>>(new Set());

  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

  const defaultPayerId = useMemo(() => {
    if (people.length > 0) {
      const currentUserAsPerson = people.find(p => p.name.toLowerCase() === 'you' || p.name.toLowerCase() === 'me');
      return currentUserAsPerson ? currentUserAsPerson.id : people[0].id;
    }
    return '';
  }, [people]);

  const actualCelebrationAmount = useMemo(() => {
    if (!isCelebrationMode || !celebrationPayerId) return 0;
    const parsedAmount = parseFloat(celebrationAmountInput);
    return isNaN(parsedAmount) || parsedAmount < 0 ? 0 : parsedAmount;
  }, [isCelebrationMode, celebrationPayerId, celebrationAmountInput]);

  const amountToSplit = useMemo(() => {
    const currentTotal = parseFloat(totalAmount) || 0;
    return Math.max(0, currentTotal - actualCelebrationAmount);
  }, [totalAmount, actualCelebrationAmount]);

  const defaultItemCategory = useMemo(() => category || (dynamicCategories.length > 0 ? dynamicCategories[0].name : ''), [category, dynamicCategories]);


  useEffect(() => {
    if (!expenseToEdit) {
      initialPeopleSetForFormInstance.current = new Set();
    }
  }, [expenseToEdit]);

  // Main effect to populate form when expenseToEdit changes or for a new expense
  useEffect(() => {
    if (expenseToEdit) {
      initialPeopleSetForFormInstance.current = new Set(); 
      setDescription(expenseToEdit.description);
      setTotalAmount(expenseToEdit.total_amount.toString());
      setCategory(expenseToEdit.category);
      
      if (Array.isArray(expenseToEdit.paid_by) && expenseToEdit.paid_by.length > 0) {
          setIsMultiplePayers(expenseToEdit.paid_by.length > 1);
          // This correctly handles single payer (paid_by.length === 1) and multiple payers
          setPayers(expenseToEdit.paid_by.map(p => ({ 
            id: p.personId + Date.now().toString() + Math.random().toString(), // unique ID for React key
            personId: p.personId, 
            amount: p.amount.toString() 
          })));
      } else { 
        // This case means expenseToEdit.paid_by is empty or not an array.
        // For an existing expense, this is unusual but we'll default to single payer view.
        setIsMultiplePayers(false);
        setPayers([{ 
          id: Date.now().toString(), 
          personId: defaultPayerId || (people.length > 0 ? people[0].id : ''), // Fallback if paid_by is missing
          amount: expenseToEdit.total_amount.toString() 
        }]);
      }

      if (expenseToEdit.celebration_contribution) {
        setIsCelebrationMode(true);
        setCelebrationPayerId(expenseToEdit.celebration_contribution.personId);
        setCelebrationAmountInput(expenseToEdit.celebration_contribution.amount.toString());
      } else {
        setIsCelebrationMode(false);
        setCelebrationPayerId('');
        setCelebrationAmountInput('');
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
          sharedBy: item.sharedBy || [],
          categoryName: item.categoryName || defaultItemCategory,
        })));
      } else {
         setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: defaultItemCategory }]);
      }

    } else { 
      // Resetting form for a new expense
      setDescription('');
      setTotalAmount(''); 
      setCategory(dynamicCategories[0]?.name || ''); // Set to first available dynamic category or empty
      setIsMultiplePayers(false);
      setSplitMethod('equal');

      setIsCelebrationMode(false);
      setCelebrationPayerId('');
      setCelebrationAmountInput('');

      const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]); // Amount is initially empty for new expense

      setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
      setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: defaultItemCategory }]);
      
      // Logic for setting default selected people for equal split
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
  }, [expenseToEdit, people, dynamicCategories, defaultPayerId]); // Removed defaultItemCategory


  // Effect to manage payer amount(s) based on totalAmount and isMultiplePayers
  useEffect(() => {
    if (!isMultiplePayers) {
      const currentPayer = payers[0];
      const expectedAmount = totalAmount; // For single payer, amount is totalAmount

      if (expenseToEdit) {
        // We are editing an expense.
        const personIdToUse = currentPayer?.personId || 
                              (expenseToEdit.paid_by && expenseToEdit.paid_by.length === 1 ? expenseToEdit.paid_by[0].personId : defaultPayerId || (people.length > 0 ? people[0].id : ''));

        if (!currentPayer || currentPayer.personId === '' || currentPayer.amount !== expectedAmount) {
          setPayers([{
            id: currentPayer?.id || Date.now().toString(),
            personId: personIdToUse!,
            amount: expectedAmount
          }]);
        }
      } else {
        // This is a new expense.
        const defaultPersonIdForNewExpense = defaultPayerId || (people.length > 0 ? people[0].id : '');
        if (!currentPayer || currentPayer.personId === '' || currentPayer.amount !== expectedAmount) {
          setPayers([{
            id: currentPayer?.id || Date.now().toString(),
            personId: defaultPersonIdForNewExpense!,
            amount: expectedAmount
          }]);
        }
      }
    } else {
      // Logic for multiple payers (e.g., ensure a default row if payers array is empty)
      const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
      if (payers.length === 0 && firstPayerPersonId) {
           setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);
      } else if (payers.length === 1 && !payers[0].personId && firstPayerPersonId) {
          if (payers[0].personId !== firstPayerPersonId) {
              setPayers(prev => [{ ...prev[0], personId: firstPayerPersonId }]);
          }
      }
    }
  }, [totalAmount, isMultiplePayers, defaultPayerId, people, expenseToEdit]);


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
        setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p=>p.id), categoryName: defaultItemCategory }]);
    }
  }, [splitMethod, people, expenseToEdit, items, unequalShares, defaultItemCategory]); 


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
      // When switching to multiple, if there was a single payer with amount, use that amount for the first row.
      const firstPayerAmount = (payers.length === 1 && payers[0].amount && payers[0].amount !== '0' && payers[0].amount !== '0.00') ? payers[0].amount : '';
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: firstPayerAmount }]);
    } else {
      // When switching to single, set amount to totalAmount. Retain selected person if possible.
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
    setItems([...items, { id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: defaultItemCategory }]); 
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
    const originalTotalAmountNum = parseFloat(totalAmount);
    if (isNaN(originalTotalAmountNum) || originalTotalAmountNum <= 0) { toast({ title: "Validation Error", description: "Total Bill Amount must be a positive number.", variant: "destructive" }); return false; }
    if (!category) { toast({ title: "Validation Error", description: "Category must be selected.", variant: "destructive" }); return false; }

    if (isCelebrationMode) {
      if (!celebrationPayerId) { toast({ title: "Validation Error", description: "Celebratory payer must be selected.", variant: "destructive" }); return false; }
      if (actualCelebrationAmount <= 0) { toast({ title: "Validation Error", description: "Celebration contribution amount must be positive.", variant: "destructive" }); return false; }
      if (actualCelebrationAmount > originalTotalAmountNum) { toast({ title: "Validation Error", description: "Celebration contribution cannot exceed total bill amount.", variant: "destructive" }); return false; }
    }

    if (payers.some(p => !p.personId)) { toast({ title: "Validation Error", description: "Each payer must be selected.", variant: "destructive" }); return false; }
    const totalPaidByPayers = payers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    if (Math.abs(totalPaidByPayers - originalTotalAmountNum) > 0.001) { 
      toast({ title: "Validation Error", description: `Total paid by payers (${formatCurrency(totalPaidByPayers)}) does not match the total bill amount (${formatCurrency(originalTotalAmountNum)}).`, variant: "destructive" }); return false;
    }
    if (isMultiplePayers && payers.some(p => (parseFloat(p.amount) || 0) <= 0)) {
        if (payers.length > 1 || (payers.length ===1 && parseFloat(payers[0].amount || "0") <=0 )) { 
             toast({ title: "Validation Error", description: "Each payer's amount must be positive if listed.", variant: "destructive" }); return false;
        }
    }
    if (!isMultiplePayers && payers.length === 1 && (parseFloat(payers[0].amount) || 0) <= 0 && originalTotalAmountNum > 0) {
        toast({ title: "Validation Error", description: "Payer amount must be positive.", variant: "destructive" }); return false;
    }

    const currentAmountToSplit = amountToSplit; 

    if (splitMethod === 'equal' && selectedPeopleEqual.length === 0 && currentAmountToSplit > 0.001) { toast({ title: "Validation Error", description: "At least one person must be selected for equal split if there's an amount to split.", variant: "destructive" }); return false; }
    if (splitMethod === 'unequal') {
      const sumUnequal = Object.values(unequalShares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      if (Math.abs(sumUnequal - currentAmountToSplit) > 0.001) { toast({ title: "Validation Error", description: `Sum of unequal shares (${formatCurrency(sumUnequal)}) must equal amount to split (${formatCurrency(currentAmountToSplit)}).`, variant: "destructive" }); return false; }
      if (Object.values(unequalShares).some(val => parseFloat(val || "0") < 0)) { toast({ title: "Validation Error", description: "Unequal shares cannot be negative.", variant: "destructive" }); return false; }
    }
    if (splitMethod === 'itemwise') {
      if (items.length === 0 && currentAmountToSplit > 0.001) { toast({ title: "Validation Error", description: "At least one item must be added for itemwise split if there's an amount to split.", variant: "destructive" }); return false; }
      if (items.some(item => !item.name.trim() || isNaN(parseFloat(item.price as string)) || parseFloat(item.price as string) <= 0 || item.sharedBy.length === 0 || !item.categoryName) && currentAmountToSplit > 0.001) {
        toast({ title: "Validation Error", description: "Each item must have a name, positive price, a selected category, and be shared by at least one person if there's an amount to split.", variant: "destructive" }); return false;
      }
      const sumItemsOriginalPrices = items.reduce((sum, item) => sum + (parseFloat(item.price as string) || 0), 0);

      if (Math.abs(sumItemsOriginalPrices - originalTotalAmountNum) > 0.001) {
        toast({ title: "Validation Error", description: `Sum of item prices (${formatCurrency(sumItemsOriginalPrices)}) must equal the total bill amount (${formatCurrency(originalTotalAmountNum)}) before celebration contributions.`, variant: "destructive" }); return false;
      }
    }
    return true;
  }, [description, totalAmount, category, payers, splitMethod, selectedPeopleEqual, unequalShares, items, isMultiplePayers, isCelebrationMode, celebrationPayerId, actualCelebrationAmount, amountToSplit]);

  const handleSubmitExpense = async () => {
    if (!validateForm()) return;

    if (!db || supabaseInitializationError) {
      toast({ title: "Database Error", description: `Supabase client not available. ${supabaseInitializationError || ''}`, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const originalTotalAmountNum = parseFloat(totalAmount);

    const finalPayers = payers
        .filter(p => p.personId && parseFloat(p.amount) > 0) 
        .map(p => ({ personId: p.personId, amount: parseFloat(p.amount) }));

    if (finalPayers.length === 0 && originalTotalAmountNum > 0) {
        toast({ title: "Validation Error", description: "At least one valid payer with a positive amount is required.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    let celebrationContributionPayload: CelebrationContribution | null = null;
    if (isCelebrationMode && celebrationPayerId && actualCelebrationAmount > 0) {
        celebrationContributionPayload = { personId: celebrationPayerId, amount: actualCelebrationAmount };
    }
    
    const finalAmountEffectivelySplit = amountToSplit; 

    let calculatedShares: { personId: string; amount: number; }[] = [];
    let expenseItemsPayload: ExpenseItemDetail[] | null = null;

    if (finalAmountEffectivelySplit < 0.001 && splitMethod !== 'itemwise') { 
        calculatedShares = []; 
    } else if (splitMethod === 'equal') {
      const shareAmount = selectedPeopleEqual.length > 0 ? finalAmountEffectivelySplit / selectedPeopleEqual.length : 0;
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
        sharedBy: item.sharedBy,
        categoryName: item.categoryName || defaultItemCategory, 
      }));

      const itemwiseSharesMap: Record<string, number> = {};
      const sumOfOriginalItemPrices = expenseItemsPayload.reduce((sum, item) => sum + Number(item.price), 0);
      
      const reductionFactor = (sumOfOriginalItemPrices > 0.001 && finalAmountEffectivelySplit >= 0) 
        ? (finalAmountEffectivelySplit / sumOfOriginalItemPrices) 
        : (sumOfOriginalItemPrices === 0 && finalAmountEffectivelySplit === 0 ? 1 : 0);


      items.forEach(item => {
        const originalItemPrice = parseFloat(item.price as string);
        const adjustedItemPriceToSplit = originalItemPrice * reductionFactor;

        if (item.sharedBy.length > 0) {
            const pricePerPersonForItem = adjustedItemPriceToSplit / item.sharedBy.length;
            item.sharedBy.forEach(personId => {
            itemwiseSharesMap[personId] = (itemwiseSharesMap[personId] || 0) + pricePerPersonForItem;
            });
        }
      });
      calculatedShares = Object.entries(itemwiseSharesMap).map(([personId, amount]) => ({ personId, amount: Math.max(0, amount) })); 
    }

    try {
      const commonPayload = {
        description,
        total_amount: originalTotalAmountNum, 
        category,
        paid_by: finalPayers,
        split_method: splitMethod,
        shares: calculatedShares, 
        items: splitMethod === 'itemwise' ? expenseItemsPayload : null,
        ...(celebrationContributionPayload && { celebration_contribution: celebrationContributionPayload }),
      };

      let errorPayload: any = null;
      if (expenseToEdit && expenseToEdit.id) {
        const { error } = await db
          .from(EXPENSES_TABLE)
          .update({ ...commonPayload, updated_at: new Date().toISOString() })
          .eq('id', expenseToEdit.id)
          .select();
        errorPayload = error;
        if (!error) toast({ title: "Expense Updated", description: `${description} has been updated successfully.` });
      } else {
        const { error } = await db
          .from(EXPENSES_TABLE)
          .insert([{ ...commonPayload, created_at: new Date().toISOString() }])
          .select();
        errorPayload = error;
        if (!error) toast({ title: "Expense Added", description: `${description} has been added successfully.` });
      }

      if (errorPayload) throw errorPayload;
      
      onExpenseAdded(); 
      if (!expenseToEdit) { 
        // Fields are reset by the main useEffect if not editing
      }
    } catch (error: any) {
      let errorMessage = "An unknown error occurred while saving the expense.";
      
      if (error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error("Error saving expense:", errorMessage, error);
      toast({ title: "Save Error", description: `Could not save expense: ${errorMessage}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (supabaseInitializationError && !db) {
    return (
      <Card className="shadow-xl rounded-lg h-full flex flex-col">
        <CardHeader className="p-4 sm:p-6 pb-4 border-b">
          <CardTitle className="text-lg sm:text-xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" /> Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-4 sm:p-6 pt-0">
          <p className="text-sm sm:text-base">Could not connect to the database. Adding or editing expenses is currently unavailable.</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{supabaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }

  if (people.length === 0 && !expenseToEdit) { 
    return (
      <Card className="text-center py-8 sm:py-10 shadow-xl rounded-lg h-full flex flex-col items-center justify-center p-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl font-semibold text-primary flex items-center justify-center">
            <Users className="mr-2 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7" /> Add People First
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0">
          <p className="text-sm sm:text-md text-muted-foreground">You need to add people to your group before you can add expenses.</p>
          <p className="text-xs sm:text-sm">Please go to the "Manage People" tab to add participants.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl rounded-lg h-full flex flex-col">
      <CardHeader className="p-4 sm:p-6 pb-4 border-b">
        <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
          <CreditCard className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {expenseToEdit ? 'Update the details of the existing expense.' : 'Enter details, who paid, and how the cost should be split.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 pt-4 sm:pt-6">
        
        <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
          <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary"><FileText className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />Bill Information</h3>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
              <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Dinner, Groceries" className="mt-1 text-sm sm:text-base h-10 sm:h-11" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="totalAmount" className="text-sm sm:text-base">Total Bill Amount</Label>
                <Input id="totalAmount" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="e.g., 100.00" className="mt-1 text-sm sm:text-base h-10 sm:h-11" />
              </div>
              <div>
                <Label htmlFor="category" className="text-sm sm:text-base">Main Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={dynamicCategories.length === 0}>
                  <SelectTrigger id="category" className="mt-1 text-sm sm:text-base h-10 sm:h-11">
                    <SelectValue placeholder="Select main category" />
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
            {(parseFloat(totalAmount) || 0) > 0 && (
              <div className="p-3 bg-muted/50 border-dashed border-primary/50 rounded-md">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center text-muted-foreground">
                          <Wallet className="mr-2 h-4 w-4"/>
                          <span>Amount to be Split:</span>
                      </div>
                      <span className="font-bold text-md sm:text-lg text-primary">{formatCurrency(amountToSplit)}</span>
                  </div>
                  {isCelebrationMode && actualCelebrationAmount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                          (After {formatCurrency(actualCelebrationAmount)} contribution by {peopleMap[celebrationPayerId] || 'Payer'})
                      </p>
                  )}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary"><Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />Who Paid?</h3>
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
        </div>
        
        <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-md sm:text-lg font-semibold flex items-center text-primary">
                    <PartyPopper className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />Special Contribution
                </h3>
                <Checkbox
                    id="celebrationMode"
                    checked={isCelebrationMode}
                    onCheckedChange={(checked) => {
                        const newIsCelebrationMode = !!checked;
                        setIsCelebrationMode(newIsCelebrationMode);
                        if (!newIsCelebrationMode) {
                        setCelebrationPayerId('');
                        setCelebrationAmountInput('');
                        } else if (people.length > 0 && !celebrationPayerId) {
                        setCelebrationPayerId(defaultPayerId || people[0].id);
                        }
                    }}
                    className="h-5 w-5"
                    aria-label="Toggle celebration contribution mode"
                />
            </div>
            {isCelebrationMode && (
                <div className="p-3 sm:p-4 bg-accent/10 shadow-inner space-y-3 sm:space-y-4 mt-2 border border-accent/30 rounded-md">
                <div className="text-xs flex items-start text-muted-foreground">
                    <Info size={16} className="mr-2 mt-0.5 shrink-0 text-accent" />
                    <span>A celebration contribution means one person covers a part of the bill as a treat. This amount is subtracted *before* splitting the remaining cost.</span>
                </div>
                <div>
                    <Label htmlFor="celebrationPayer" className="text-sm sm:text-base">Who is treating?</Label>
                    <Select value={celebrationPayerId} onValueChange={setCelebrationPayerId} disabled={people.length === 0}>
                    <SelectTrigger id="celebrationPayer" className="mt-1 text-sm sm:text-base h-10 sm:h-11">
                        <SelectValue placeholder="Select who is contributing" />
                    </SelectTrigger>
                    <SelectContent>{people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="celebrationAmount" className="text-sm sm:text-base">Contribution Amount</Label>
                    <Input
                    id="celebrationAmount"
                    type="number"
                    value={celebrationAmountInput}
                    onChange={e => setCelebrationAmountInput(e.target.value)}
                    placeholder="Amount they are covering"
                    className="mt-1 text-sm sm:text-base h-10 sm:h-11"
                    />
                    <div className="flex space-x-1 sm:space-x-2 mt-2 flex-wrap gap-1">
                    {[10, 25, 50, 100].map(perc => (
                        <Button
                        key={perc}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const currentTotalNum = parseFloat(totalAmount) || 0;
                            if (currentTotalNum > 0) {
                            setCelebrationAmountInput(((currentTotalNum * perc) / 100).toFixed(2));
                            } else {
                            setCelebrationAmountInput('0.00');
                            }
                        }}
                        className="text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 h-auto"
                        >
                        {perc}% of Bill
                        </Button>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCelebrationAmountInput(totalAmount)}
                        className="text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 h-auto"
                        disabled={!totalAmount || parseFloat(totalAmount) <=0}
                        >
                        Full Bill Amount
                        </Button>
                    </div>
                </div>
                </div>
            )}
            {!isCelebrationMode && (
                <p className="text-xs sm:text-sm text-muted-foreground">Toggle the switch on the right if someone is treating for a portion of this bill.</p>
            )}
        </div>

        <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary"><Scale className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />How to Split the Cost?</h3>
            <div className="space-y-3 sm:space-y-4">
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
                    dynamicCategories={dynamicCategories}
                    handleItemChange={handleItemChange}
                    handleItemSharedByChange={handleItemSharedByChange}
                    removeItem={removeItem}
                    addItem={handleAddItem}
                    />
                )}
            </div>
        </div>
      </CardContent>

      <CardFooter className="border-t p-4 sm:pt-6 flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-3">
        {expenseToEdit && onCancelEdit && (
            <Button variant="outline" size="default" onClick={onCancelEdit} disabled={isLoading} className="w-full sm:w-auto">Cancel</Button>
        )}
        <Button onClick={handleSubmitExpense} size="default" disabled={isLoading || (people.length === 0 && !expenseToEdit) || (dynamicCategories.length === 0 && !category) } className="w-full sm:w-auto">
          {isLoading ? (expenseToEdit ? "Updating..." : "Adding...") : (expenseToEdit ? "Update Expense" : "Add Expense")}
        </Button>
      </CardFooter>
    </Card>
  );
}

    

    