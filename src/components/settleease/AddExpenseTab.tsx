"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, AlertTriangle, Users, Wallet } from 'lucide-react';

import PayerInputSection from './addexpense/PayerInputSection';
import SplitMethodSelector from './addexpense/SplitMethodSelector';
import EqualSplitSection from './addexpense/EqualSplitSection';
import UnequalSplitSection from './addexpense/UnequalSplitSection';
import ItemwiseSplitSection from './addexpense/ItemwiseSplitSection';
import ExpenseBasicInfo from './addexpense/ExpenseBasicInfo';
import CelebrationSection from './addexpense/CelebrationSection';
import { useExpenseFormLogic } from './addexpense/ExpenseFormLogic';
import SettleEaseErrorBoundary from '../ui/SettleEaseErrorBoundary';
import { crashTestManager } from '@/lib/settleease/crashTestContext';

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

// Section wrapper components with crash test logic
const PaymentDetailsSection = ({ children }: { children: React.ReactNode }) => {
  crashTestManager.checkAndCrash('paymentDetails', 'Payment Details Section crashed: Payment validation engine failed');
  return <>{children}</>;
};

const PayerInputSectionWrapper = ({ children }: { children: React.ReactNode }) => {
  crashTestManager.checkAndCrash('payerInputSection', 'Payer Input Section crashed: Payer validation failed with invalid person data');
  return <>{children}</>;
};

const SplitMethodSelectorWrapper = ({ children }: { children: React.ReactNode }) => {
  crashTestManager.checkAndCrash('splitMethodSelector', 'Split Method Selector crashed: Split method validation failed');
  return <>{children}</>;
};

export default function AddExpenseTab({
  people,
  db,
  supabaseInitializationError,
  onExpenseAdded,
  dynamicCategories,
  expenseToEdit,
  onCancelEdit,
}: AddExpenseTabProps) {
  // Check for crash test
  useEffect(() => {
    crashTestManager.checkAndCrash('addExpense', 'Add Expense Tab crashed: Form validation failed with corrupted category data');
  });

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
  const [calendarOpen, setCalendarOpen] = useState(false);

  const initialPeopleSetForFormInstance = useRef<Set<string>>(new Set());
  const previousExpenseToEdit = useRef<Expense | null | undefined>(undefined);

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

  const defaultItemCategory = useMemo(() => dynamicCategories.length > 0 ? dynamicCategories[0].name : '', [dynamicCategories]);

  const { handleSubmitExpense } = useExpenseFormLogic({
    db,
    supabaseInitializationError,
    onExpenseAdded,
  });

  const onSubmit = () => {
    handleSubmitExpense(
      description,
      totalAmount,
      category,
      expenseDate,
      payers,
      splitMethod,
      selectedPeopleEqual,
      unequalShares,
      items,
      isMultiplePayers,
      isCelebrationMode,
      celebrationPayerId,
      actualCelebrationAmount,
      amountToSplit,
      expenseToEdit,
      defaultItemCategory,
      setIsLoading
    );
  };

  useEffect(() => {
    if (!expenseToEdit) {
      initialPeopleSetForFormInstance.current = new Set();
    }
  }, [expenseToEdit]);

  // Main effect to populate form when expenseToEdit changes or for a new expense
  useEffect(() => {
    const isTransitioningToNewExpense = previousExpenseToEdit.current !== undefined &&
      previousExpenseToEdit.current !== null &&
      expenseToEdit === null;
    const isInitialMount = previousExpenseToEdit.current === undefined && expenseToEdit === null;

    if (expenseToEdit) {
      initialPeopleSetForFormInstance.current = new Set();
      setDescription(expenseToEdit.description);
      setTotalAmount(expenseToEdit.total_amount.toString());
      // Ensure the category exists in the current categories list
      const categoryExists = dynamicCategories.some(cat => cat.name === expenseToEdit.category);
      setCategory(categoryExists ? expenseToEdit.category : (dynamicCategories[0]?.name || ''));
      setExpenseDate(expenseToEdit.created_at ? new Date(expenseToEdit.created_at) : new Date());

      if (Array.isArray(expenseToEdit.paid_by) && expenseToEdit.paid_by.length > 0) {
        setIsMultiplePayers(expenseToEdit.paid_by.length > 1);
        setPayers(expenseToEdit.paid_by.map(p => ({
          id: p.personId + Date.now().toString() + Math.random().toString(),
          personId: p.personId,
          amount: p.amount.toString()
        })));
      } else {
        setIsMultiplePayers(false);
        setPayers([{
          id: Date.now().toString(),
          personId: defaultPayerId || (people.length > 0 ? people[0].id : ''),
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
          categoryName: item.categoryName || category || defaultItemCategory,
        })));
      } else {
        setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: category || defaultItemCategory }]);
      }

    } else if (isTransitioningToNewExpense || isInitialMount) {
      // Resetting form for a new expense - only when transitioning from edit mode or initial mount
      setDescription('');
      setTotalAmount('');
      setCategory(dynamicCategories[0]?.name || '');
      setExpenseDate(new Date());
      setIsMultiplePayers(false);
      setSplitMethod('equal');

      setIsCelebrationMode(false);
      setCelebrationPayerId('');
      setCelebrationAmountInput('');

      const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);

      setUnequalShares(people.reduce((acc, p) => { acc[p.id] = ''; return acc; }, {} as Record<string, string>));
      setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: category || defaultItemCategory }]);

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

    // Update the ref to track the current expenseToEdit for next render
    previousExpenseToEdit.current = expenseToEdit;
  }, [expenseToEdit, people, dynamicCategories, defaultPayerId]);

  // Effect to manage payer amount(s) based on totalAmount and isMultiplePayers
  useEffect(() => {
    if (!isMultiplePayers) {
      const currentPayer = payers[0];
      const expectedAmount = totalAmount;

      if (expenseToEdit) {
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

    if (splitMethod === 'itemwise' && items.length === 0 && people.length > 0) {
      setItems([{ id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: category || defaultItemCategory }]);
    }
  }, [splitMethod, people, expenseToEdit, items, unequalShares]);

  const handlePayerChange = (index: number, field: keyof PayerInputRow, value: string) => {
    const newPayers = [...payers];
    newPayers[index] = { ...newPayers[index], [field]: value };
    
    // Smart auto-calculation: if amount field changed and multiple payers exist
    if (field === 'amount' && isMultiplePayers && newPayers.length > 1) {
      const total = parseFloat(totalAmount) || 0;
      
      // Calculate sum of all entered amounts except the last payer
      let sumOfOthers = 0;
      for (let i = 0; i < newPayers.length - 1; i++) {
        const amt = parseFloat(newPayers[i].amount) || 0;
        sumOfOthers += amt;
      }
      
      // Auto-calculate the last payer's amount
      const remainder = Math.max(0, total - sumOfOthers);
      newPayers[newPayers.length - 1].amount = remainder.toFixed(2);
    }
    
    setPayers(newPayers);
  };

  const addPayer = () => {
    const firstPayerPersonId = defaultPayerId || (people.length > 0 ? people[0].id : '');
    const total = parseFloat(totalAmount) || 0;
    
    // Auto-distribute amounts equally when adding a new payer
    if (isMultiplePayers && total > 0) {
      const newPayerCount = payers.length + 1;
      const equalAmount = (total / newPayerCount).toFixed(2);
      
      const redistributedPayers = payers.map(payer => ({
        ...payer,
        amount: equalAmount
      }));
      
      setPayers([...redistributedPayers, { 
        id: Date.now().toString(), 
        personId: firstPayerPersonId, 
        amount: equalAmount 
      }]);
    } else {
      setPayers([...payers, { id: Date.now().toString(), personId: firstPayerPersonId, amount: '' }]);
    }
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
    } else if (isMultiplePayers && newPayers.length > 1) {
      // Auto-redistribute after removal
      const total = parseFloat(totalAmount) || 0;
      const equalAmount = (total / newPayers.length).toFixed(2);
      
      const redistributedPayers = newPayers.map(payer => ({
        ...payer,
        amount: equalAmount
      }));
      
      setPayers(redistributedPayers);
    } else {
      setPayers(newPayers);
    }
  };

  const handleToggleMultiplePayers = () => {
    const goingToMultiple = !isMultiplePayers;
    setIsMultiplePayers(goingToMultiple);
    const firstPayerPersonId = payers[0]?.personId || defaultPayerId || (people.length > 0 ? people[0].id : '');

    if (goingToMultiple) {
      // When switching to multiple payers, start with the total amount for the first payer
      const total = parseFloat(totalAmount) || 0;
      setPayers([{ id: Date.now().toString(), personId: firstPayerPersonId, amount: total > 0 ? totalAmount : '' }]);
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
    setItems([...items, { id: Date.now().toString(), name: '', price: '', sharedBy: people.map(p => p.id), categoryName: category || defaultItemCategory }]);
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
          <CreditCard className="mr-2 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {expenseToEdit ? 'Update the details of the existing expense.' : 'Enter details, who paid, and how the cost should be split.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 pt-4 sm:pt-6">
        <SettleEaseErrorBoundary componentName="Expense Basic Info" size="medium">
          <ExpenseBasicInfo
            description={description}
            setDescription={setDescription}
            totalAmount={totalAmount}
            setTotalAmount={setTotalAmount}
            category={category}
            setCategory={setCategory}
            expenseDate={expenseDate}
            setExpenseDate={setExpenseDate}
            calendarOpen={calendarOpen}
            setCalendarOpen={setCalendarOpen}
            dynamicCategories={dynamicCategories}
          />
        </SettleEaseErrorBoundary>

        <SettleEaseErrorBoundary componentName="Celebration Section" size="medium">
          <CelebrationSection
            isCelebrationMode={isCelebrationMode}
            setIsCelebrationMode={setIsCelebrationMode}
            celebrationPayerId={celebrationPayerId}
            setCelebrationPayerId={setCelebrationPayerId}
            celebrationAmountInput={celebrationAmountInput}
            setCelebrationAmountInput={setCelebrationAmountInput}
            actualCelebrationAmount={actualCelebrationAmount}
            totalAmount={totalAmount}
            amountToSplit={amountToSplit}
            people={people}
            peopleMap={peopleMap}
          />
        </SettleEaseErrorBoundary>

        <SettleEaseErrorBoundary componentName="Payment Details" size="medium">
          <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
              <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Payment Details
            </h3>
            <div className="space-y-4 sm:space-y-5">
              <SettleEaseErrorBoundary componentName="Payer Input Section" size="small">
                <PayerInputSectionWrapper>
                  <PayerInputSection
                    payers={payers}
                    people={people}
                    isMultiplePayers={isMultiplePayers}
                    handlePayerChange={handlePayerChange}
                    addPayer={addPayer}
                    removePayer={removePayer}
                    onToggleMultiplePayers={handleToggleMultiplePayers}
                    defaultPayerId={defaultPayerId}
                  />
                </PayerInputSectionWrapper>
              </SettleEaseErrorBoundary>
            </div>
          </div>
        </SettleEaseErrorBoundary>

        <SettleEaseErrorBoundary componentName="Split Method" size="medium">
          <div className="p-4 sm:p-5 border rounded-lg shadow-sm bg-card/50">
            <h3 className="text-md sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center text-primary">
              <Wallet className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Split Method
            </h3>
            <div className="space-y-4 sm:space-y-5">
              <SettleEaseErrorBoundary componentName="Split Method Selector" size="small">
                <SplitMethodSelectorWrapper>
                  <SplitMethodSelector splitMethod={splitMethod} setSplitMethod={setSplitMethod} />
                </SplitMethodSelectorWrapper>
              </SettleEaseErrorBoundary>

              {splitMethod === 'equal' && (
                <SettleEaseErrorBoundary componentName="Equal Split Section" size="small">
                  <EqualSplitSection
                    people={people}
                    selectedPeopleEqual={selectedPeopleEqual}
                    handleEqualSplitChange={handleEqualSplitChange}
                  />
                </SettleEaseErrorBoundary>
              )}
              {splitMethod === 'unequal' && (
                <SettleEaseErrorBoundary componentName="Unequal Split Section" size="small">
                  <UnequalSplitSection
                    people={people}
                    unequalShares={unequalShares}
                    handleUnequalShareChange={handleUnequalShareChange}
                    amountToSplit={amountToSplit}
                  />
                </SettleEaseErrorBoundary>
              )}
              {splitMethod === 'itemwise' && (
                <SettleEaseErrorBoundary componentName="Itemwise Split Section" size="small">
                  <ItemwiseSplitSection
                    items={items}
                    people={people}
                    dynamicCategories={dynamicCategories}
                    handleItemChange={handleItemChange}
                    handleItemSharedByChange={handleItemSharedByChange}
                    removeItem={removeItem}
                    addItem={handleAddItem}
                  />
                </SettleEaseErrorBoundary>
              )}
            </div>
          </div>
        </SettleEaseErrorBoundary>
      </CardContent>

      <CardFooter className="border-t p-4 sm:pt-6 flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-3">
        {expenseToEdit && onCancelEdit && (
          <Button variant="outline" size="sm" onClick={onCancelEdit} disabled={isLoading} className="w-full sm:w-auto">
            <AlertTriangle className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        )}
        <Button onClick={onSubmit} size="sm" disabled={isLoading || (people.length === 0 && !expenseToEdit) || (dynamicCategories.length === 0 && !category)} className="w-full sm:w-auto">
          <CreditCard className="mr-1 h-4 w-4" />
          {isLoading ? (expenseToEdit ? "Updating..." : "Adding...") : (expenseToEdit ? "Update Expense" : "Add Expense")}
        </Button>
      </CardFooter>
    </Card>
  );
}