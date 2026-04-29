"use client";

import { useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from "@/hooks/use-toast";
import type { Category, Expense, ManualSettlementOverride, Person, SettlementPayment, UserRole } from '@/lib/settleease';

let initialDefaultPeopleSetupAttemptedOrCompleted = false;

export function useConvexData(
  currentUser: SupabaseUser | null,
  userRole: UserRole,
  isLoadingAuth: boolean,
  isLoadingRole: boolean,
) {
  const people = useQuery(api.app.listPeople, currentUser ? {} : 'skip') as Person[] | undefined;
  const expenses = useQuery(api.app.listExpenses, currentUser ? {} : 'skip') as Expense[] | undefined;
  const categories = useQuery(api.app.listCategories, currentUser ? {} : 'skip') as Category[] | undefined;
  const settlementPayments = useQuery(api.app.listSettlementPayments, currentUser ? {} : 'skip') as SettlementPayment[] | undefined;
  const manualOverrides = useQuery(api.app.listManualSettlementOverrides, currentUser ? {} : 'skip') as ManualSettlementOverride[] | undefined;
  const ensureDefaultPeople = useMutation(api.app.ensureDefaultPeople);
  const [isDataFetchedAtLeastOnce, setIsDataFetchedAtLeastOnce] = useState(false);

  const isLoadingPeople = !!currentUser && people === undefined;
  const isLoadingExpenses = !!currentUser && expenses === undefined;
  const isLoadingCategories = !!currentUser && categories === undefined;
  const isLoadingSettlements = !!currentUser && settlementPayments === undefined;
  const isLoadingOverrides = !!currentUser && manualOverrides === undefined;
  const isLoadingData =
    isLoadingPeople ||
    isLoadingExpenses ||
    isLoadingCategories ||
    isLoadingSettlements ||
    isLoadingOverrides;

  useEffect(() => {
    if (!currentUser) {
      setIsDataFetchedAtLeastOnce(false);
      initialDefaultPeopleSetupAttemptedOrCompleted = false;
      return;
    }

    if (!isLoadingAuth && !isLoadingRole && !isLoadingData) {
      setIsDataFetchedAtLeastOnce(true);
    }
  }, [currentUser, isLoadingAuth, isLoadingRole, isLoadingData]);

  useEffect(() => {
    if (
      !currentUser ||
      userRole !== 'admin' ||
      initialDefaultPeopleSetupAttemptedOrCompleted ||
      people === undefined ||
      people.length > 0
    ) {
      return;
    }

    initialDefaultPeopleSetupAttemptedOrCompleted = true;
    void ensureDefaultPeople({})
      .then((added) => {
        if (added) {
          toast({ title: "Welcome!", description: "Added Alice, Bob, and Charlie to your group." });
        }
      })
      .catch((error) => {
        initialDefaultPeopleSetupAttemptedOrCompleted = false;
        console.error("Unexpected error in ensureDefaultPeople:", error);
        toast({
          title: "Setup Error",
          description: "An unexpected error occurred while setting up default people.",
          variant: "destructive",
        });
      });
  }, [currentUser, ensureDefaultPeople, people, userRole]);

  const fetchAllData = async (_showLoadingIndicator?: boolean) => {
    // Convex live queries keep this data synchronized automatically.
  };

  return {
    people: people ?? [],
    expenses: expenses ?? [],
    categories: categories ?? [],
    settlementPayments: settlementPayments ?? [],
    manualOverrides: manualOverrides ?? [],
    isLoadingData,
    isDataFetchedAtLeastOnce,
    isLoadingPeople,
    isLoadingExpenses,
    isLoadingCategories,
    isLoadingSettlements,
    isLoadingOverrides,
    fetchAllData,
  };
}
