"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, AlertTriangle, Users, Settings2, PartyPopper, Wallet, Info, FileText, Scale, Calendar as CalendarIcon, PlusCircle, Trash2 as TrashIcon, UserPlus } from 'lucide-react';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  
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
      setExpenseDate(expenseToEdit.created_at ? new Date(expenseToEdit.created_at) : new Date());
      
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
      setExpenseDate(new Date());
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
        celebration_contribution: celebrationContributionPayload,
      };

      let errorPayload: any = null;
      if (expenseToEdit && expenseToEdit.id) {
        const { error } = await db
          .from(EXPENSES_TABLE)
          .update({ ...commonPayload, created_at: expenseDate?.toISOString(), updated_at: new Date().toISOString() })
          .eq('id', expenseToEdit.id)
          .select();
        errorPayload = error;
        if (!error) toast({ title: "Expense Updated", description: `${description} has been updated successfully.` });
      } else {
        const { error } = await db
          .from(EXPENSES_TABLE)
          .insert([{ ...commonPayload, created_at: expenseDate?.toISOString() }])
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
        <CardHeader className="p-4 sm:p-6 border-b">
            <CardTitle className="flex items-center text-lg sm:text-xl font-bold">
                {expenseToEdit ? <FileText className="mr-2 h-5 w-5 text-primary" /> : <PlusCircle className="mr-2 h-5 w-5 text-primary" />}
                {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
                {expenseToEdit ? 'Modify the details of the existing expense below.' : 'Fill out the form to add a new expense to your records.'}
            </CardDescription>
        </CardHeader>

        <ScrollArea className="flex-1" style={{ minHeight: 0 }}>
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-3">
                    <Label htmlFor="description" className="text-sm font-medium">What is this for?</Label>
                    <Input
                        id="description"
                        placeholder="e.g., Dinner at Pizza Palace"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="text-base"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <Label htmlFor="totalAmount" className="text-sm font-medium">Total Bill Amount</Label>
                        <Input
                            id="totalAmount"
                            type="number"
                            placeholder="0.00"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                            className="text-base font-semibold"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category" className="text-base">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {dynamicCategories.map((c) => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="expenseDate" className="text-sm font-medium">Date of Expense</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="expenseDate"
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal text-base",
                                    !expenseDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={expenseDate}
                                onSelect={setExpenseDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                
                <Separator />
                
                {/* Payer Section */}
                <PayerInputSection
                  people={people}
                  payers={payers}
                  isMultiplePayers={isMultiplePayers}
                  onPayerChange={handlePayerChange}
                  onAddPayer={addPayer}
                  onRemovePayer={removePayer}
                  onToggleMultiplePayers={handleToggleMultiplePayers}
                  totalAmount={totalAmount}
                />

                <Separator />

                {/* Celebration Contribution Section */}
                <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="celebration-mode" checked={isCelebrationMode} onCheckedChange={(checked) => setIsCelebrationMode(Boolean(checked))} />
                        <Label htmlFor="celebration-mode" className="text-sm font-medium flex items-center"><PartyPopper className="h-4 w-4 mr-1.5 text-amber-600"/>Is this a celebration contribution?</Label>
                    </div>
                    {isCelebrationMode && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="celebration-payer" className="text-xs">Who is treating?</Label>
                                <Select value={celebrationPayerId} onValueChange={setCelebrationPayerId}>
                                    <SelectTrigger id="celebration-payer">
                                        <SelectValue placeholder="Select a person" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {people.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="celebration-amount" className="text-xs">Contribution Amount</Label>
                                <Input id="celebration-amount" type="number" placeholder="0.00" value={celebrationAmountInput} onChange={e => setCelebrationAmountInput(e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>

                <Separator />
                
                {/* Split Method Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className='flex flex-col'>
                            <Label className="text-sm font-medium">How should the bill be split?</Label>
                            {amountToSplit > 0 && <span className="text-xs text-muted-foreground">{formatCurrency(amountToSplit)} to be split.</span>}
                        </div>
                        <SplitMethodSelector splitMethod={splitMethod} onSplitMethodChange={setSplitMethod} />
                    </div>
                    <div className="pt-2">
                        {splitMethod === 'equal' && <EqualSplitSection people={people} selectedPeople={selectedPeopleEqual} onSelectionChange={handleEqualSplitChange} />}
                        {splitMethod === 'unequal' && <UnequalSplitSection people={people} shares={unequalShares} onShareChange={handleUnequalShareChange} amountToSplit={amountToSplit} />}
                        {splitMethod === 'itemwise' && (
                            <ItemwiseSplitSection
                                items={items}
                                people={people}
                                onItemChange={handleItemChange}
                                onAddItem={handleAddItem}
                                onRemoveItem={removeItem}
                                onSharedByChange={handleItemSharedByChange}
                                peopleMap={peopleMap}
                                dynamicCategories={dynamicCategories}
                                defaultCategory={defaultItemCategory}
                            />
                        )}
                    </div>
                </div>
            </CardContent>
        </ScrollArea>

        <CardFooter className="p-4 sm:p-6 border-t flex flex-row-reverse">
            <Button onClick={handleSubmitExpense} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? 'Saving...' : (expenseToEdit ? 'Update Expense' : 'Add Expense')}
            </Button>
            {expenseToEdit && onCancelEdit && (
                <Button variant="outline" onClick={onCancelEdit} disabled={isLoading} className="mr-2 w-full sm:w-auto mb-2 sm:mb-0">
                    Cancel
                </Button>
            )}
        </CardFooter>
    </Card>
  );
}

    

    