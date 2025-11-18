"use client";

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import {
  EXPENSES_TABLE,
  PEOPLE_TABLE,
  CATEGORIES_TABLE,
  SETTLEMENT_PAYMENTS_TABLE,
  MANUAL_SETTLEMENT_OVERRIDES_TABLE,
} from '@/lib/settleease';
import type { Person, Expense, Category, SettlementPayment, ManualSettlementOverride, UserRole } from '@/lib/settleease';

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
  const [manualOverrides, setManualOverrides] = useState<ManualSettlementOverride[]>([]);
  
  // Individual loading states for progressive loading - start as true for initial load
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(true);
  const [isLoadingOverrides, setIsLoadingOverrides] = useState(true);
  
  // Legacy loading state for backward compatibility
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDataFetchedAtLeastOnce, setIsDataFetchedAtLeastOnce] = useState(false);

  // Fetch data progressively - each table independently
  const fetchAllData = useCallback(async (showLoadingIndicator = true) => {
    if (!db || supabaseInitializationError || !currentUser) {
      if (showLoadingIndicator) setIsLoadingData(false);
      return;
    }
    if (showLoadingIndicator) setIsLoadingData(true);

    // Fetch all tables in parallel, not sequentially
    const fetchPromises: Promise<boolean>[] = [];

    // Fetch people
    setIsLoadingPeople(true);
    const peopleFetch = (async () => {
      try {
        const { data, error } = await db.from(PEOPLE_TABLE).select('*').order('name', { ascending: true });
        if (error) {
          console.error("Error fetching people:", error);
          toast({ title: "Data Error", description: `Could not fetch people: ${error.message}`, variant: "destructive" });
          return false;
        }
        setPeople(data as Person[]);
        return true;
      } catch (error: any) {
        console.error("Catch: Error fetching people:", error);
        toast({ title: "Data Error", description: `Unexpected error fetching people.`, variant: "destructive" });
        return false;
      } finally {
        setIsLoadingPeople(false);
      }
    })();
    fetchPromises.push(peopleFetch);

    // Fetch expenses
    setIsLoadingExpenses(true);
    const expensesFetch = (async () => {
      try {
        const { data, error } = await db.from(EXPENSES_TABLE).select('*').order('created_at', { ascending: false });
        if (error) {
          console.error("Error fetching expenses:", error);
          toast({ title: "Data Error", description: `Could not fetch expenses: ${error.message}`, variant: "destructive" });
          return false;
        }
        setExpenses(data as Expense[]);
        return true;
      } catch (error: any) {
        console.error("Catch: Error fetching expenses:", error);
        toast({ title: "Data Error", description: `Unexpected error fetching expenses.`, variant: "destructive" });
        return false;
      } finally {
        setIsLoadingExpenses(false);
      }
    })();
    fetchPromises.push(expensesFetch);

    // Fetch categories
    setIsLoadingCategories(true);
    const categoriesFetch = (async () => {
      try {
        const { data, error } = await db.from(CATEGORIES_TABLE).select('*').order('rank', { ascending: true }).order('name', { ascending: true });
        if (error) {
          console.error("Error fetching categories:", error);
          toast({ title: "Data Error", description: `Could not fetch categories: ${error.message}`, variant: "destructive" });
          return false;
        }
        setCategories(data as Category[]);
        return true;
      } catch (error: any) {
        console.error("Catch: Error fetching categories:", error);
        toast({ title: "Data Error", description: `Unexpected error fetching categories.`, variant: "destructive" });
        return false;
      } finally {
        setIsLoadingCategories(false);
      }
    })();
    fetchPromises.push(categoriesFetch);

    // Fetch settlement payments
    setIsLoadingSettlements(true);
    const settlementsFetch = (async () => {
      try {
        const { data, error } = await db.from(SETTLEMENT_PAYMENTS_TABLE).select('*').order('settled_at', { ascending: false });
        if (error) {
          console.error("Error fetching settlement payments:", error);
          toast({ title: "Data Error", description: `Could not fetch settlement payments: ${error.message}`, variant: "destructive" });
          return false;
        }
        setSettlementPayments(data as SettlementPayment[]);
        return true;
      } catch (error: any) {
        console.error("Catch: Error fetching settlement payments:", error);
        toast({ title: "Data Error", description: `Unexpected error fetching settlement_payments.`, variant: "destructive" });
        return false;
      } finally {
        setIsLoadingSettlements(false);
      }
    })();
    fetchPromises.push(settlementsFetch);

    // Fetch manual settlement overrides
    setIsLoadingOverrides(true);
    const overridesFetch = (async () => {
      try {
        const { data, error } = await db.from(MANUAL_SETTLEMENT_OVERRIDES_TABLE).select('*').order('created_at', { ascending: false });
        if (error) {
          console.error("Error fetching manual overrides:", error);
          toast({ title: "Data Error", description: `Could not fetch manual overrides: ${error.message}`, variant: "destructive" });
          return false;
        }
        setManualOverrides(data as ManualSettlementOverride[]);
        return true;
      } catch (error: any) {
        console.error("Catch: Error fetching manual overrides:", error);
        toast({ title: "Data Error", description: `Unexpected error fetching manual_settlement_overrides.`, variant: "destructive" });
        return false;
      } finally {
        setIsLoadingOverrides(false);
      }
    })();
    fetchPromises.push(overridesFetch);

    // Wait for all fetches to complete
    const results = await Promise.all(fetchPromises);
    const allSuccessful = results.every((result: boolean) => result === true);

    if (allSuccessful) {
      setIsDataFetchedAtLeastOnce(true);
    }
    
    if (showLoadingIndicator) {
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
      // Keep loading states as true - skeleton will show after auth completes
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
      setManualOverrides([]);
      setIsDataFetchedAtLeastOnce(false);
      // Reset loading states when no user
      setIsLoadingPeople(false);
      setIsLoadingExpenses(false);
      setIsLoadingCategories(false);
      setIsLoadingSettlements(false);
      setIsLoadingOverrides(false);
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
    manualOverrides,
    isLoadingData,
    isDataFetchedAtLeastOnce,
    isLoadingPeople,
    isLoadingExpenses,
    isLoadingCategories,
    isLoadingSettlements,
    isLoadingOverrides,
    fetchAllData,
    setPeople,
    setExpenses,
    setCategories,
    setSettlementPayments,
    setManualOverrides,
  };
}