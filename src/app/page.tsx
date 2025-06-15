
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient, type SupabaseClient, type User as SupabaseUser, type RealtimeChannel } from '@supabase/supabase-js';

import {
  Settings2, AlertTriangle, HandCoins // Added HandCoins
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import AuthForm from '@/components/settleease/AuthForm';
import AddExpenseTab from '@/components/settleease/AddExpenseTab';
import EditExpensesTab from '@/components/settleease/EditExpensesTab';
import ManagePeopleTab from '@/components/settleease/ManagePeopleTab';
import ManageCategoriesTab from '@/components/settleease/ManageCategoriesTab';
import ManageSettlementsTab from '@/components/settleease/ManageSettlementsTab';
import AnalyticsTab from '@/components/settleease/AnalyticsTab';
import SettingsTab from '@/components/settleease/SettingsTab'; // Added SettingsTab import
import AppSidebar from '@/components/settleease/AppSidebar';
import DashboardView from '@/components/settleease/DashboardView';
import AppLoadingScreen from '@/components/settleease/AppLoadingScreen';

import {
  EXPENSES_TABLE,
  PEOPLE_TABLE,
  CATEGORIES_TABLE,
  USER_PROFILES_TABLE,
  SETTLEMENT_PAYMENTS_TABLE,
  supabaseUrl,
  supabaseAnonKey,
  AVAILABLE_CATEGORY_ICONS,
} from '@/lib/settleease';

import type { Person, Expense, Category, UserRole, ActiveView, SettlementPayment } from '@/lib/settleease';


let db: SupabaseClient | undefined;
let supabaseInitializationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseInitializationError = "Supabase URL or Anon Key is missing. Check environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  console.error(supabaseInitializationError);
} else {
  try {
    db = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error: any) {
    console.error("Error initializing Supabase client:", error);
    supabaseInitializationError = `Supabase Client Initialization Error: ${error.message || "Could not initialize Supabase."}. Ensure your Supabase credentials are correct and the service is reachable.`;
  }
}


let initialDefaultPeopleSetupAttemptedOrCompleted = false;


export default function SettleEasePage() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDataFetchedAtLeastOnce, setIsDataFetchedAtLeastOnce] = useState(false);

  const peopleChannelRef = useRef<RealtimeChannel | null>(null);
  const expensesChannelRef = useRef<RealtimeChannel | null>(null);
  const categoriesChannelRef = useRef<RealtimeChannel | null>(null);
  const settlementPaymentsChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    console.log("Auth effect: Starts. Supabase Client:", !!db, "Supabase Init Error:", !!supabaseInitializationError);
    if (supabaseInitializationError || !db) {
      console.log("Auth effect: Supabase init error or no DB. Setting isLoadingAuth=false.");
      setIsLoadingAuth(false);
      return;
    }

    let isMounted = true;

    console.log("Auth effect: Setting up onAuthStateChange listener.");
    const { data: authListener } = db.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth effect: onAuthStateChange triggered. Event:", _event, "Session:", !!session, "Mounted:", isMounted);
      if (isMounted) {
        const newAuthUser = session?.user ?? null;
        
        setCurrentUser(prevLocalUser => { 
          if ((newAuthUser?.id !== prevLocalUser?.id) || (newAuthUser === null && prevLocalUser !== null) || (newAuthUser !== null && prevLocalUser === null) ) {
              console.log("Auth effect: onAuthStateChange - User state changed via functional update. Updating currentUser.");
              if (!newAuthUser) { // If user is changing to null (logout)
                setUserRole(null); // Reset role immediately
                setIsDataFetchedAtLeastOnce(false); // Reset data fetch flag
              }
              return newAuthUser;
          }
          return prevLocalUser; 
        });

        if (!newAuthUser) { 
          console.log("Auth effect: onAuthStateChange - No newAuthUser. Clearing data (will be handled by User Role & Data Effect).");
          // Resetting data and role is now primarily handled by the User Role & Data Effect when currentUser becomes null.
          if (_event === "SIGNED_OUT") {
            toast({ title: "Logged Out", description: "You have been successfully logged out." });
          }
        }
        
        console.log("Auth effect: onAuthStateChange - Setting isLoadingAuth=false.");
        setIsLoadingAuth(false); 
      } else {
        console.log("Auth effect: onAuthStateChange - Component unmounted, ignoring event.");
      }
    });
    
    console.log("Auth effect: Attempting to get session as a secondary check/optimization.");
    db.auth.getSession().then(({ data: { session } }) => {
      console.log("Auth effect: getSession returned. Session:", !!session, "Mounted:", isMounted);
      if (isMounted) {
        // Handled by onAuthStateChange
      }
    }).catch(err => {
        if(isMounted) {
            console.warn("Auth effect: Error in getSession:", err.message);
        }
    });

    return () => {
      console.log("Auth effect: Cleanup. Unsubscribing auth listener. isMounted=false.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [db, supabaseInitializationError]); 


  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    if (!db || !userId) return 'user';
    // setIsLoadingRole(true) is handled by the caller effect
    try {
      const { data, error } = await db
        .from(USER_PROFILES_TABLE)
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(
            `User profile or role not found for ${userId} (PGRST116). Defaulting to 'user' role. This is normal and often temporary for new users as their profile (with role) is being created by a database trigger. If persistent, ensure the trigger 'on_auth_user_created' is correctly populating '${USER_PROFILES_TABLE}'.`
          );
          return 'user';
        }
        let errorDetails = '';
        try {
          errorDetails = JSON.stringify(error);
        } catch (e) {
          errorDetails = 'Error object could not be stringified.';
        }
        console.error(
          `Error fetching user role (userId: ${userId}): Details: ${errorDetails}. Raw error object:`, error,
          `Defaulting to 'user' role. This strongly suggests an RLS misconfiguration on the '${USER_PROFILES_TABLE}' table. ` +
          `Ensure a RLS policy exists and is enabled, like: "CREATE POLICY \\"Users can view their own profile\\" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);"`
        );
        return 'user';
      }
      return data?.role as UserRole || 'user';
    } catch (e: any) {
      let exceptionDetails = '';
      try {
        exceptionDetails = JSON.stringify(e);
      } catch (stringifyError) {
        exceptionDetails = 'Exception object could not be stringified.';
      }
      console.error(
        `Catch: Unhandled exception while fetching user role (userId: ${userId}): Details: ${exceptionDetails}. Raw exception:`, e,
        "Defaulting to 'user' role."
      );
      return 'user';
    } finally {
      // setIsLoadingRole(false) is handled by the caller effect
    }
  }, [db]);


  const fetchAllData = useCallback(async (showLoadingIndicator = true) => {
    if (!db || supabaseInitializationError || !currentUser) {
      if (showLoadingIndicator) setIsLoadingData(false); // Ensure loader is turned off if prerequisites fail
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
      const { data: categoriesData, error: fetchCategoriesError } = await db.from(CATEGORIES_TABLE).select('*').order('name', { ascending: true });
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
    // Always turn off loading indicator if it was turned on, or if all fetches succeeded
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

  // Effect for fetching user role and initial data load
  useEffect(() => {
    let isMounted = true;
    console.log("User Role & Data Effect: Starts. isLoadingAuth:", isLoadingAuth, "currentUser:", !!currentUser, "userRole:", userRole, "isDataFetchedOnce:", isDataFetchedAtLeastOnce);
  
    if (isLoadingAuth) {
      console.log("User Role & Data Effect: Still loading auth, skipping.");
      return;
    }
  
    if (currentUser) {
      if (!userRole) { // Fetch role only if not already set for the current user session
        console.log("User Role & Data Effect: currentUser exists, userRole not set. Fetching role.");
        setIsLoadingRole(true);
        fetchUserRole(currentUser.id).then(fetchedRole => {
          if (!isMounted) {
            console.log("User Role & Data Effect: fetchUserRole - Component unmounted.");
            setIsLoadingRole(false);
            return;
          }
          console.log("User Role & Data Effect: fetchUserRole - Role fetched:", fetchedRole);
          setUserRole(fetchedRole);
          setIsLoadingRole(false);
  
          // Proceed with role-dependent setup and initial data fetch
          addDefaultPeople().then(() => {
            if (!isMounted) return;
            fetchAllData(true); // This will set isLoadingData and isDataFetchedAtLeastOnce
          });
        });
      } else {
        // User and role are already known. Fetch data if it hasn't been fetched yet.
        if (!isDataFetchedAtLeastOnce) {
          console.log("User Role & Data Effect: Role known, but data not fetched. Fetching data.");
          fetchAllData(true);
        } else {
          console.log("User Role & Data Effect: Role and data already loaded.");
        }
      }
    } else { 
      // No currentUser and not loading auth: Reset app state
      console.log("User Role & Data Effect: No currentUser. Resetting app state.");
      setPeople([]);
      setExpenses([]);
      setCategories([]);
      setSettlementPayments([]);
      setUserRole(null);
      setIsLoadingRole(false); // Ensure cleared
      setIsDataFetchedAtLeastOnce(false);
      setActiveView('dashboard');
    }
    return () => {
      console.log("User Role & Data Effect: Cleanup. isMounted=false.");
      isMounted = false;
    };
  }, [currentUser, isLoadingAuth, userRole, fetchUserRole, addDefaultPeople, fetchAllData, isDataFetchedAtLeastOnce]);
  
  // Effect to synchronize activeView based on userRole (e.g., redirect 'user' from admin pages)
  useEffect(() => {
    let restrictedViewsForUserRole: ActiveView[] = ['addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements', 'settings'];
    if (userRole === 'user' && restrictedViewsForUserRole.includes(activeView)) {
      console.log(`Role-View Sync Effect: User role is 'user' and current view ('${activeView}') is restricted. Resetting to dashboard.`);
      setActiveView('dashboard');
      toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
    }
  }, [userRole, activeView]);


  useEffect(() => {
    let isMounted = true;
    console.log("Realtime effect: Start. DB:", !!db, "currentUser:", !!currentUser, "SupabaseInitError:", !!supabaseInitializationError, "isDataFetchedOnce:", isDataFetchedAtLeastOnce, "userRole:", userRole);

    if (supabaseInitializationError || !db) {
      console.log("Realtime setup skipped: Supabase client not available or init error.");
      if (db && typeof db.removeAllChannels === 'function') {
        console.log("Realtime: Attempting to remove all channels due to init error/unavailable client.");
        db.removeAllChannels()
          .catch(e => console.warn("Realtime: Precautionary removeAllChannels (init error path) failed:", e?.message || e))
          .finally(() => {
            if (isMounted) {
              peopleChannelRef.current = null;
              expensesChannelRef.current = null;
              categoriesChannelRef.current = null;
              settlementPaymentsChannelRef.current = null;
              console.log("Realtime: Channel refs nullified (init error path).");
            }
          });
      } else {
        peopleChannelRef.current = null;
        expensesChannelRef.current = null;
        categoriesChannelRef.current = null;
        settlementPaymentsChannelRef.current = null;
        console.log("Realtime: Channel refs nullified (db client was null).");
      }
      return;
    }

    if (!currentUser) {
      console.log("Realtime setup skipped: No authenticated user.");
      if (peopleChannelRef.current || expensesChannelRef.current || categoriesChannelRef.current || settlementPaymentsChannelRef.current) {
        console.log("Realtime: User logged out. Ensuring local channel refs are cleared (should have been handled by prior cleanup).");
        peopleChannelRef.current = null;
        expensesChannelRef.current = null;
        categoriesChannelRef.current = null;
        settlementPaymentsChannelRef.current = null;
      }
      return;
    }

    if (!isDataFetchedAtLeastOnce || !userRole) {
      console.log("Realtime subscriptions deferred: Waiting for initial data fetch and user role.");
      return;
    }

    console.log("Attempting to set up Supabase Realtime subscriptions using refs...");

    const handleDbChange = (payload: any, table: string) => {
        if (!isMounted) return;
        console.log(`Realtime: ${table} change received!`, payload.eventType, payload.new || payload.old || payload);
        toast({ title: "Data Synced", description: `${table} has been updated.`, duration: 2000});
        fetchAllData(false);
    };

    const handleSubscriptionError = (tableName: string, status: string, error?: any) => {
      if (!isMounted) return;
      const baseMessage = `Subscription error on ${tableName}`;

      if (status === 'CHANNEL_ERROR') {
        if (error) {
          console.warn(`${baseMessage}: Status: ${status}. Error details:`, error);
        } else {
          console.warn(`${baseMessage}: Status was ${status} but no error object was provided. This often points to RLS or Realtime Replication issues in Supabase.`);
        }
      } else if (error) {
        console.error(`${baseMessage}: Status: ${status}`, error);
        toast({ title: `Realtime Error (${tableName})`, description: `Could not subscribe: ${error.message || 'Unknown error'}. Status: ${status}.`, variant: "destructive", duration: 10000 });
      } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
         console.warn(`${baseMessage}: Status was ${status} but no error object was provided. This often points to RLS or Realtime Replication issues in Supabase.`);
      } else {
         console.warn(`${baseMessage}: Unhandled status ${status} without an error object.`);
      }
    };

    const setupChannel = async (
        channelRef: React.MutableRefObject<RealtimeChannel | null>,
        tableName: string
      ) => {
        if (!db || !isMounted) return;
        if (channelRef.current && channelRef.current.state === 'joined') {
            console.log(`Realtime: Already subscribed to ${tableName}. State: ${channelRef.current.state}`);
            return;
        }

        if (channelRef.current) {
            console.log(`Realtime: Channel ref for ${tableName} exists but not joined (state: ${channelRef.current.state}). Attempting to remove first.`);
            try {
                await db.removeChannel(channelRef.current);
                console.log(`Realtime: Successfully removed existing (non-joined) channel for ${tableName}.`);
            } catch (removeError: any) {
                console.warn(`Realtime: Error removing existing (non-joined) channel for ${tableName}:`, removeError?.message || removeError);
            }
            channelRef.current = null;
        }

        console.log(`Realtime: Creating new channel for ${tableName}`);
        const channel = db.channel(`public:${tableName}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: tableName },
              (payload) => handleDbChange(payload, tableName)
          );

        channelRef.current = channel;

        try {
            console.log(`Realtime: Attempting to subscribe to ${tableName}...`);
            channel.subscribe(async (status, err) => {
              if (!isMounted) {
                 console.log(`Realtime (${tableName}): subscription callback ignored, component unmounted.`);
                 return;
              }

              console.log(`Realtime: Subscription status for ${tableName}: ${status}`, err ? `Error: ${err.message}` : '');
              if (status === 'SUBSCRIBED') {
                console.log(`Realtime: Subscribed successfully to ${tableName}`);
              } else if ((err && status !== 'CHANNEL_ERROR') || status === 'TIMED_OUT' || status === 'CLOSED') { 
                handleSubscriptionError(tableName, status, err);
                if(channelRef.current === channel) {
                    console.log(`Realtime: Nullifying channelRef for ${tableName} due to error/closed status.`);
                    channelRef.current = null;
                }
              } else if (status === 'CHANNEL_ERROR') { 
                  console.warn(`Subscription error on ${tableName}: Status was ${status}. Error details:`, err);
                  if(channelRef.current === channel) {
                    console.log(`Realtime: Nullifying channelRef for ${tableName} due to CHANNEL_ERROR.`);
                    channelRef.current = null;
                  }
              }
            });
          } catch (subscribeError: any) {
            if (!isMounted) return;
            console.error(`Realtime: Direct error during .subscribe() call for ${tableName}:`, subscribeError);
            handleSubscriptionError(tableName, 'SUBSCRIBE_CALL_ERROR', subscribeError);
            if(channelRef.current === channel) {
                 channelRef.current = null;
            }
          }
    };

    setupChannel(peopleChannelRef, PEOPLE_TABLE);
    setupChannel(expensesChannelRef, EXPENSES_TABLE);
    setupChannel(categoriesChannelRef, CATEGORIES_TABLE);
    setupChannel(settlementPaymentsChannelRef, SETTLEMENT_PAYMENTS_TABLE);

    return () => {
      isMounted = false;
      console.log("Realtime: Cleaning up Supabase Realtime subscriptions (useEffect cleanup)...");
      if (db && typeof db.removeAllChannels === 'function') {
        console.log("Realtime: Calling db.removeAllChannels() from effect cleanup...");
        db.removeAllChannels()
          .then(statuses => {
            console.log("Realtime: removeAllChannels() completed. Statuses:", statuses);
            if (statuses.some(s => s !== 'ok' && s !== 'closed' && s !== 'timed out')) { 
              console.warn("Realtime: Some channels might not have closed cleanly during removeAllChannels:", statuses);
            }
          })
          .catch(err => {
            console.error("Realtime: Error during db.removeAllChannels():", err?.message || err);
            if (err?.message?.includes("WebSocket is closed")) {
                 console.warn("Realtime: Caught 'WebSocket is closed' during removeAllChannels. This is often due to HMR or rapid unmounts/remounts or actual connection loss before cleanup.");
            }
          })
          .finally(() => {
            console.log("Realtime: Nullifying channel refs in .finally() after removeAllChannels attempt.");
            peopleChannelRef.current = null;
            expensesChannelRef.current = null;
            categoriesChannelRef.current = null;
            settlementPaymentsChannelRef.current = null;
          });
      } else {
        console.warn("Realtime: Supabase client (db) or removeAllChannels not available during cleanup. Manually nullifying refs.");
        peopleChannelRef.current = null;
        expensesChannelRef.current = null;
        categoriesChannelRef.current = null;
        settlementPaymentsChannelRef.current = null;
      }
    };
  }, [db, currentUser, supabaseInitializationError, isDataFetchedAtLeastOnce, userRole, fetchAllData]);


  const handleLogout = async () => {
    if (!db) return;
    const { error } = await db.auth.signOut();
    if (error) {
      if (error.message === "Auth session missing!") {
        console.warn("Logout attempt: Auth session was already missing or token was invalid. Forcing local currentUser to null.");
        setCurrentUser(null); // This will trigger the User Role & Data Effect to reset state.
      } else {
        toast({ title: "Logout Error", description: error.message, variant: "destructive" });
      }
    }
    // No need to manually reset currentUser here if onAuthStateChange handles it,
    // but if onAuthStateChange is slow or fails, setting it directly can be a fallback.
    // The current setCurrentUser(null) inside onAuthStateChange should be sufficient.
  };


  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

  const handleSetActiveView = (view: ActiveView) => {
    let restrictedViewsForUserRole: ActiveView[] = ['addExpense', 'editExpenses', 'managePeople', 'manageCategories', 'manageSettlements', 'settings'];
    if (userRole === 'user' && restrictedViewsForUserRole.includes(view)) {
      toast({ title: "Access Denied", description: "You do not have permission to access this page.", variant: "destructive" });
      setActiveView('dashboard'); // This triggers the Role-View Sync effect if needed
    } else {
      setActiveView(view);
    }
  };

 const getCategoryIconFromName = useCallback((categoryName: string): React.FC<React.SVGProps<SVGSVGElement>> => {
    if (categories && categories.length > 0) {
      const dynamicCat = categories.find(c => c.name === categoryName);
      if (dynamicCat) {
        const iconDetail = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === dynamicCat.icon_name);
        if (iconDetail) return iconDetail.IconComponent;
      }
    }
    const settingsIcon = AVAILABLE_CATEGORY_ICONS.find(icon => icon.iconKey === 'Settings2');
    return settingsIcon ? settingsIcon.IconComponent : Settings2;
  }, [categories]);


  if (isLoadingAuth || (currentUser && isLoadingRole)) {
    const title = "Loading SettleEase";
    const subtitle = isLoadingAuth 
      ? "Initializing application and verifying your session. Just a moment..." 
      : "Securing your account details. Almost there...";
    return <AppLoadingScreen title={title} subtitle={subtitle} />;
  }

  if (supabaseInitializationError && !db) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">SettleEase could not start due to a Supabase configuration problem.</p>
            <p className="mt-2 text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">{supabaseInitializationError}</p>
            <p className="mt-3 text-xs">Please ensure your Supabase environment variables (e.g., NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are correctly set in your project (e.g., in a `.env.local` file for local development, or in your hosting provider's settings for deployment).</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AuthForm db={db} />
      </div>
    );
  }

  if (isLoadingData && !isDataFetchedAtLeastOnce) {
     return <AppLoadingScreen title="Loading Your Data" subtitle="Preparing your dashboard and fetching latest information. Hang tight!" />;
  }


  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar activeView={activeView} setActiveView={handleSetActiveView} handleLogout={handleLogout} currentUserEmail={currentUser.email} userRole={userRole} />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <header className="p-4 md:hidden flex items-center sticky top-0 bg-background z-20 border-b shadow-sm">
            <div className="w-10"> {/* Left part for trigger */}
              <SidebarTrigger />
            </div>
            <div className="flex-grow flex items-center justify-center"> {/* Center part for logo */}
              <HandCoins className="h-7 w-7 text-primary mr-2" />
              <span className="text-xl font-bold text-primary">SettleEase</span>
            </div>
            <div className="w-10" /> {/* Right part, spacer for symmetry */}
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background no-scrollbar">
            {isLoadingData && isDataFetchedAtLeastOnce && (
                <div className="text-center text-sm text-muted-foreground mb-4">Syncing data...</div>
            )}
            {activeView === 'dashboard' && (
              <DashboardView
                expenses={expenses}
                people={people}
                peopleMap={peopleMap}
                dynamicCategories={categories}
                getCategoryIconFromName={getCategoryIconFromName}
                settlementPayments={settlementPayments}
                db={db}
                currentUserId={currentUser.id}
                onActionComplete={() => fetchAllData(false)}
                userRole={userRole}
              />
            )}
            {activeView === 'analytics' && (
              <AnalyticsTab
                expenses={expenses}
                people={people}
                peopleMap={peopleMap}
                dynamicCategories={categories}
                getCategoryIconFromName={getCategoryIconFromName}
              />
            )}
            {userRole === 'admin' && activeView === 'addExpense' && <AddExpenseTab people={people} db={db} supabaseInitializationError={supabaseInitializationError} onExpenseAdded={() => fetchAllData(false)} dynamicCategories={categories} />}
            {userRole === 'admin' && activeView === 'editExpenses' && <EditExpensesTab people={people} expenses={expenses} db={db} supabaseInitializationError={supabaseInitializationError} onActionComplete={() => fetchAllData(false)} dynamicCategories={categories} />}
            {userRole === 'admin' && activeView === 'managePeople' && <ManagePeopleTab people={people} db={db} supabaseInitializationError={supabaseInitializationError} />}
            {userRole === 'admin' && activeView === 'manageCategories' && <ManageCategoriesTab categories={categories} db={db} supabaseInitializationError={supabaseInitializationError} onCategoriesUpdate={() => fetchAllData(false)} />}
            {userRole === 'admin' && activeView === 'manageSettlements' && (
              <ManageSettlementsTab
                expenses={expenses}
                people={people}
                peopleMap={peopleMap}
                settlementPayments={settlementPayments}
                db={db}
                currentUserId={currentUser.id}
                onActionComplete={() => fetchAllData(false)}
              />
            )}
             {userRole === 'admin' && activeView === 'settings' && (
              <SettingsTab
                currentUserEmail={currentUser.email || undefined}
                userRole={userRole}
              />
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

