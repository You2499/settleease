"use client";

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import {
  EXPENSES_TABLE,
  PEOPLE_TABLE,
  CATEGORIES_TABLE,
  SETTLEMENT_PAYMENTS_TABLE,
} from '@/lib/settleease';
import type { Person, Expense, Category, SettlementPayment, UserRole } from '@/lib/settleease';

let initialDefaultPeopleSetupAttemptedOrCompleted = false;

export function useSupabaseData(
  db: SupabaseClient | undefined,
  supabaseInitializationError: string | null,
  currentUser: SupabaseUser | null,
  userRole: UserRole,
  isLoadingAuth: boolean,
  isLoadingRole: boolean
) {
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDataFetchedAtLeastOnce, setIsDataFetchedAtLeastOnce] = useState(false);

  const fetchAllData = useCallback(async (showLoadingIndicator = true) => {
    if (!db || supabaseInitializationError || !currentUser) {
      if (showLoadingIndicator) setIsLoadingData(false);
      return;
    }
    if (showLoadingIndicator) setIsLoadingData(true);

    let peopleErrorOccurred = false;
    let expensesErrorOccurred = false;
    let categoriesErrorOccurred = false;
    let settlementPaymentsErrorOccurred = false;

    try {
      const { data: peopleData, error: peopleError } = await db.from(PEOPLE_TABLE).select('*').order('name', { ascending: true });
      if (peopleError) {
        console.error("Error fetching people:", peopleError);
        toast({ title: "Data Error", description: `Could not fetch people: ${peopleError.message}`, variant: "destructive" });
        peopleErrorOccurred = true;
      } else {
        setPeople(peopleData as Person[]);
      }
    } catch (error) {
      console.error("Catch: Error fetching people:", error);
      toast({ title: "Data Error", description: `Unexpected error fetching people.`, variant: "destructive" });
      peopleErrorOccurred = true;
    }

    try {
      const { data: expensesData, error: expensesError } = await db.from(EXPENSES_TABLE).select('*').order('created_at', { ascending: false });
      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        toast({ title: "Data Error", description: `Could not fetch expenses: ${expensesError.message}`, variant: "destructive" });
        expensesErrorOccurred = true;
      } else {
        setExpenses(expensesData as Expense[]);
      }
    } catch (error) {
      console.error("Catch: Error fetching expenses:", error);
      toast({ title: "Data Error", description: `Unexpected error fetching expenses.`, variant: "destructive" });
      expensesErrorOccurred = true;
    }

    try {
      const { data: categoriesData, error: fetchCategoriesError } = await db.from(CATEGORIES_TABLE).select('*').order('rank', { ascending: true }).order('name', { ascending: true });
      if (fetchCategoriesError) {
        console.error("Error fetching categories:", fetchCategoriesError);
        toast({ title: "Data Error", description: `Could not fetch categories: ${fetchCategoriesError.message}`, variant: "destructive" });
        categoriesErrorOccurred = true;
      } else {
        setCategories(categoriesData as Category[]);
      }
    } catch (error) {
      console.error("Catch: Error fetching categories:", error);
      toast({ title: "Data Error", description: `Unexpected error fetching categories.`, variant: "destructive" });
      categoriesErrorOccurred = true;
    }
    
    try {
      const { data: settlementPaymentsData, error: settlementPaymentsError } = await db.from(SETTLEMENT_PAYMENTS_TABLE).select('*').order('settled_at', { ascending: false });
      if (settlementPaymentsError) {
        console.error("Error fetching settlement payments:", settlementPaymentsError);
        toast({ title: "Data Error", description: `Could not fetch settlement payments: ${settlementPaymentsError.message}`, variant: "destructive" });
        settlementPaymentsErrorOccurred = true;
      } else {
        setSettlementPayments(settlementPaymentsData as SettlementPayment[]);
      }
    } catch (error) {
      console.error("Catch: Error fetching settlement payments:", error);
      toast({ title: "Data Error", description: `Unexpected error fetching settlement_payments.`, variant: "destructive" });
      settlementPaymentsErrorOccurred = true;
    }

    if (!peopleErrorOccurred && !expensesErrorOccurred && !categoriesErrorOccurred && !settlementPaymentsErrorOccurred) {
        setIsDataFetchedAtLeastOnce(true);
    }
    if (showLoadingIndicator || (!peopleErrorOccurred && !expensesErrorOccurred && !categoriesErrorOccurred && !settlementPaymentsErrorOccurred)) {
     setIsLoadingData(false);
    }
  }, [currentUser, supabaseInitializationError, db]);

  const addDefaultPeople = useCallback(async () => {
    if (!db || initialDefaultPeopleSetupAttemptedOrCompleted || supabaseInitializationError || !currentUser || userRole !== 'admin') {
      if (userRole !== 'admin' && currentUser) {
        return;
      }
      if (initialDefaultPeopleSetupAttemptedOrCompleted && db) {
        const { data: currentPeople, error: currentPeopleError } = await db.from(PEOPLE_TABLE).select('id', { head: true, count: 'exact' });
        if (!currentPeopleError && currentPeople && (currentPeople as any).length > 0) {
          return;
        }
      } else if (!db) {
        console.warn("addDefaultPeople: Supabase client (db) not available.");
        return;
      } else if(!currentUser) {
        console.warn("addDefaultPeople: No current user.");
        return;
      }
    }

    initialDefaultPeopleSetupAttemptedOrCompleted = true;

    try {
      const { count, error: countError } = await db.from(PEOPLE_TABLE).select('id', { count: 'exact', head: true });

      if (countError) {
        console.error("Error checking for existing people:", countError);
        toast({ title: "Setup Error", description: `Could not check for existing people: ${countError.message}`, variant: "destructive" });
        initialDefaultPeopleSetupAttemptedOrCompleted = false;
        return;
      }

      if (count === 0) {
        const defaultPeopleNames = ['Alice', 'Bob', 'Charlie'];
        const peopleToInsert = defaultPeopleNames.map(name => ({ name, created_at: new Date().toISOString() }));
        const { error: insertError } = await db.from(PEOPLE_TABLE).insert(peopleToInsert).select();
        if (insertError) {
          console.error("Error adding default people:", insertError);
          toast({ title: "Setup Error", description: `Could not add default people: ${insertError.message}`, variant: "destructive" });
          initialDefaultPeopleSetupAttemptedOrCompleted = false;
        } else {
          toast({ title: "Welcome!", description: "Added Alice, Bob, and Charlie to your group." });
        }
      }
    } catch (error) {
      console.error("Unexpected error in addDefaultPeople:", error);
      toast({ title: "Setup Error", description: "An unexpected error occurred while setting up default people.", variant: "destructive" });
      initialDefaultPeopleSetupAttemptedOrCompleted = false;
    }
  }, [currentUser, userRole, supabaseInitializationError, db]);

  // Effect for initial data load
  useEffect(() => {
    let isMounted = true;
    console.log("Data Effect: Starts. isLoadingAuth:", isLoadingAuth, "currentUser:", !!currentUser, "userRole:", userRole, "isDataFetchedOnce:", isDataFetchedAtLeastOnce);
  
    if (isLoadingAuth || isLoadingRole) {
      console.log("Data Effect: Still loading auth/role, skipping.");
      return;
    }
  
    if (currentUser && userRole) {
      if (!isDataFetchedAtLeastOnce) {
        console.log("Data Effect: User and role known, but data not fetched. Fetching data.");
        addDefaultPeople().then(() => {
          if (!isMounted) return;
          fetchAllData(true);
        });
      } else {
        console.log("Data Effect: Role and data already loaded.");
      }
    } else if (!currentUser) { 
      console.log("Data Effect: No currentUser. Resetting app state.");
      setPeople([]);
      setExpenses([]);
      setCategories([]);
      setSettlementPayments([]);
      setIsDataFetchedAtLeastOnce(false);
    }
    
    return () => {
      console.log("Data Effect: Cleanup. isMounted=false.");
      isMounted = false;
    };
  }, [currentUser, isLoadingAuth, isLoadingRole, userRole, addDefaultPeople, fetchAllData, isDataFetchedAtLeastOnce]);

  return {
    people,
    expenses,
    categories,
    settlementPayments,
    isLoadingData,
    isDataFetchedAtLeastOnce,
    fetchAllData,
    setPeople,
    setExpenses,
    setCategories,
    setSettlementPayments,
  };
}