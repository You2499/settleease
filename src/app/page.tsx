
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';

import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';
import {
  Users, PlusCircle, Trash2, LayoutDashboard, CreditCard, ArrowRight, FileText, Settings2, Pencil, Save, Ban, Menu, Info, MinusCircle, FilePenLine, ListChecks, AlertTriangle, LogOut
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ThemeToggleButton } from '@/components/ThemeToggleButton';


import AuthForm from '@/components/settleease/AuthForm';
import AddExpenseTab from '@/components/settleease/AddExpenseTab';
import EditExpensesTab from '@/components/settleease/EditExpensesTab';
import ManagePeopleTab from '@/components/settleease/ManagePeopleTab';
import ManageCategoriesTab from '@/components/settleease/ManageCategoriesTab';


import {
  EXPENSES_TABLE,
  PEOPLE_TABLE,
  CATEGORIES_TABLE,
  CHART_COLORS,
  formatCurrency,
  supabaseUrl,
  supabaseAnonKey,
  AVAILABLE_CATEGORY_ICONS,
  formatCurrencyForAxis
} from '@/lib/settleease';

import type { Person, Expense, ExpenseItemDetail, Category } from '@/lib/settleease';


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

type ActiveView = 'dashboard' | 'addExpense' | 'editExpenses' | 'managePeople' | 'manageCategories';


export default function SettleEasePage() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isDataFetchedAtLeastOnce, setIsDataFetchedAtLeastOnce] = useState(false);


  const fetchAllData = useCallback(async (showLoadingIndicator = true) => {
    if (!db || supabaseInitializationError || !currentUser) {
      setIsLoadingData(false);
      return;
    }
    if (showLoadingIndicator) setIsLoadingData(true);

    let peopleErrorOccurred = false;
    let expensesErrorOccurred = false;
    let categoriesErrorOccurred = false;

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

    if (!peopleErrorOccurred && !expensesErrorOccurred && !categoriesErrorOccurred) {
        setIsDataFetchedAtLeastOnce(true); // Mark that data has been fetched successfully at least once
    }
    if (showLoadingIndicator || (!peopleErrorOccurred && !expensesErrorOccurred && !categoriesErrorOccurred)) {
     setIsLoadingData(false);
    }
  }, [currentUser]);


  const addDefaultPeople = useCallback(async () => {
    if (!db || initialDefaultPeopleSetupAttemptedOrCompleted || supabaseInitializationError || !currentUser) {
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
          // fetchAllData will be called by the effect that watches currentUser
        }
      }
    } catch (error) {
      console.error("Unexpected error in addDefaultPeople:", error);
      toast({ title: "Setup Error", description: "An unexpected error occurred while setting up default people.", variant: "destructive" });
      initialDefaultPeopleSetupAttemptedOrCompleted = false;
    }
  }, [fetchAllData, currentUser]);


  // Effect for initializing auth and listening to auth state changes
  useEffect(() => {
    if (supabaseInitializationError || !db) {
      setIsLoadingAuth(false);
      return;
    }

    let isMounted = true;
    setIsLoadingAuth(true);

    db.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setCurrentUser(session?.user ?? null);
        setIsLoadingAuth(false);
      }
    }).catch(err => {
        if(isMounted) setIsLoadingAuth(false);
        console.error("Error getting session:", err);
    });

    const { data: authListener } = db.auth.onAuthStateChange(async (_event, session) => {
      if (isMounted) {
        const newAuthUser = session?.user ?? null;
        setCurrentUser(newAuthUser);
        if (!newAuthUser) { // User logged out
          setPeople([]);
          setExpenses([]);
          setCategories([]);
          setActiveView('dashboard');
          setIsDataFetchedAtLeastOnce(false); // Reset for next login
          toast({ title: "Logged Out", description: "You have been successfully logged out." });
        }
        // Data fetching will be handled by the useEffect dependent on currentUser
        if (isLoadingAuth) setIsLoadingAuth(false); // Ensure loading auth is false after first auth event
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabaseInitializationError]);


  // Effect for fetching data when currentUser changes (and auth is not loading)
  useEffect(() => {
    if (currentUser && !isLoadingAuth) {
      setIsLoadingData(true);
      addDefaultPeople().then(() => {
        fetchAllData(true).finally(() => {
             // setIsLoadingData(false); // fetchAllData now handles this
        });
      });
    } else if (!currentUser && !isLoadingAuth) {
      // Clear data if user logs out and auth isn't in an intermediate loading state
      setPeople([]);
      setExpenses([]);
      setCategories([]);
      setIsDataFetchedAtLeastOnce(false);
      setIsLoadingData(false);
    }
  }, [currentUser, isLoadingAuth, addDefaultPeople, fetchAllData]);


  // Effect for Supabase real-time subscriptions
  useEffect(() => {
    if (supabaseInitializationError || !db || !currentUser || !isDataFetchedAtLeastOnce) {
      // Remove any existing channels if conditions are not met
      if (db) {
        db.getChannels().forEach(channel => db.removeChannel(channel));
      }
      return;
    }

    let isMounted = true;

    const handleDbChange = (payload: any, table: string) => {
        if (!isMounted) return;
        console.log(`${table} change received!`, payload);
        toast({ title: "Data Synced", description: `${table} has been updated.`, duration: 2000});
        fetchAllData(false); // Fetch data without primary loading indicator
    };

    const peopleChannel = db.channel(`public:${PEOPLE_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: PEOPLE_TABLE },
        (payload) => handleDbChange(payload, PEOPLE_TABLE)
      ).subscribe((status, err) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') console.log(`Subscribed to ${PEOPLE_TABLE}`);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error on ${PEOPLE_TABLE}:`, err);
      });

    const expensesChannel = db.channel(`public:${EXPENSES_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: EXPENSES_TABLE },
        (payload) => handleDbChange(payload, EXPENSES_TABLE)
      ).subscribe((status, err) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') console.log(`Subscribed to ${EXPENSES_TABLE}`);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error on ${EXPENSES_TABLE}:`, err);
      });

    const categoriesChannel = db.channel(`public:${CATEGORIES_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: CATEGORIES_TABLE },
        (payload) => handleDbChange(payload, CATEGORIES_TABLE)
      ).subscribe((status, err) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') console.log(`Subscribed to ${CATEGORIES_TABLE}`);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error on ${CATEGORIES_TABLE}:`, err);
      });


    return () => {
      isMounted = false;
      if (db) {
        db.removeChannel(peopleChannel).catch(err => console.error("Error removing people channel", err));
        db.removeChannel(expensesChannel).catch(err => console.error("Error removing expenses channel", err));
        db.removeChannel(categoriesChannel).catch(err => console.error("Error removing categories channel", err));
      }
    };
  }, [supabaseInitializationError, db, fetchAllData, currentUser, isDataFetchedAtLeastOnce]);


  const handleLogout = async () => {
    if (!db) return;
    const { error } = await db.auth.signOut();
    if (error) {
      toast({ title: "Logout Error", description: error.message, variant: "destructive" });
    } else {
      // onAuthStateChange will handle UI updates (setting currentUser to null, clearing data)
      // No need to manually set currentUser to null here, listener does it.
    }
  };


  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);


  const getHeaderTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Dashboard';
      case 'addExpense': return 'Add New Expense';
      case 'editExpenses': return 'Edit Expenses';
      case 'managePeople': return 'Manage People';
      case 'manageCategories': return 'Manage Categories';
      default: return 'SettleEase';
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


  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center">
          <FileText className="w-16 h-16 text-primary animate-pulse mb-4" />
          <p className="text-xl font-semibold">Loading SettleEase...</p>
          <p className="text-muted-foreground">Initializing application and checking session.</p>
        </div>
      </div>
    );
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

  // User is logged in, but data might still be loading
  if (isLoadingData && !isDataFetchedAtLeastOnce) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center">
          <FileText className="w-16 h-16 text-primary animate-pulse mb-4" />
          <p className="text-xl font-semibold">Loading Your Data...</p>
          <p className="text-muted-foreground">Please wait while we prepare your dashboard.</p>
        </div>
      </div>
    );
  }


  return (
    <SidebarProvider defaultOpen={true}>
      <AppActualSidebar activeView={activeView} setActiveView={setActiveView} handleLogout={handleLogout} currentUserEmail={currentUser.email} />
      <SidebarInset>
        <div className="flex flex-col h-screen">
          <header className="p-4 border-b bg-card flex items-center justify-between">
            <div className="flex items-center h-10"> 
              <SidebarTrigger className="md:hidden mr-2" />
              <h1 className="text-2xl font-headline font-bold text-primary">
                {getHeaderTitle()}
              </h1>
            </div>
            <ThemeToggleButton />
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            {isLoadingData && isDataFetchedAtLeastOnce && ( // Show subtle loading indicator for re-fetches
                <div className="text-center py-2 text-sm text-muted-foreground">Syncing data...</div>
            )}
            {activeView === 'dashboard' && <DashboardTab expenses={expenses} people={people} peopleMap={peopleMap} dynamicCategories={categories} getCategoryIconFromName={getCategoryIconFromName} />}
            {activeView === 'addExpense' && <AddExpenseTab people={people} db={db} supabaseInitializationError={supabaseInitializationError} onExpenseAdded={() => fetchAllData(false)} dynamicCategories={categories} />}
            {activeView === 'editExpenses' && <EditExpensesTab people={people} expenses={expenses} db={db} supabaseInitializationError={supabaseInitializationError} onActionComplete={() => fetchAllData(false)} dynamicCategories={categories} />}
            {activeView === 'managePeople' && <ManagePeopleTab people={people} db={db} supabaseInitializationError={supabaseInitializationError} />}
            {activeView === 'manageCategories' && <ManageCategoriesTab categories={categories} db={db} supabaseInitializationError={supabaseInitializationError} onCategoriesUpdate={() => fetchAllData(false)} />}
          </main>
          <footer className="text-center py-3 text-xs text-muted-foreground border-t bg-card">
            <p>&copy; {new Date().getFullYear()} SettleEase. All rights reserved. Made by Gagan Gupta</p>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface AppActualSidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  handleLogout: () => void;
  currentUserEmail?: string | null;
}

function AppActualSidebar({ activeView, setActiveView, handleLogout, currentUserEmail }: AppActualSidebarProps) {
  const { isMobile } = useSidebar();
  return (
    <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} side="left" variant="sidebar">
      <SidebarHeader className="flex flex-row items-center justify-start p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 h-10">
        <svg className="h-8 w-8 fill-sidebar-primary flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-3.5h5v-2h-5v2zm0-3h5v-2h-5v2zm0-3h5v-2h-5v2zM4.03 7.44l2.83 2.83-1.42 1.41L2.61 8.85l1.42-1.41zM17.14 13.73l2.83-2.83-1.41-1.41-2.83 2.83 1.41 1.41zM7.5 17.5h2V14h-2v3.5zm7-3.5h2V14h-2v3.5zM6.21 4.93l1.41 1.41L4.79 9.17 3.38 7.76l2.83-2.83zM20.62 16.24l-2.83-2.83-1.41 1.41 2.83 2.83 1.41-1.41z"/>
            <path d="M21.29,10.29l-3.58-3.58c-0.39-0.39-1.02-0.39-1.41,0L12,11l-4.29-4.29c-0.39-0.39-1.02-0.39-1.41,0L2.71,10.29 c-0.39,0.39-0.39,1.02,0,1.41L6.3,15.29C6.49,15.48,6.74,15.58,7,15.58s0.51-0.09,0.71-0.29L12,11.41l4.29,4.29 C16.48,15.9,16.74,16,17,16s0.51-0.09,0.71-0.29l3.58-3.58C21.68,11.32,21.68,10.68,21.29,10.29z M7,13.17L5.83,12L7,10.83 V13.17z M17,13.17V10.83L18.17,12L17,13.17z"/>
            <path d="M12 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 13 12 13s3.5-1.57 3.5-3.5S13.93 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z"/>
            <path d="M12.01,20.79c-0.26-1.09-0.88-2.05-1.77-2.79H8.5c-0.28,0-0.5,0.22-0.5,0.5v3c0,0.28,0.22,0.5,0.5,0.5h1.27 c0.13,0,0.26-0.05,0.35-0.15c0.89-0.89,1.34-1.99,1.34-3.17V20.79z M15.5,20.5c0-0.28-0.22-0.5-0.5-0.5h-1.24 c-0.89,0.74-1.51,1.7-1.77,2.79v-1.87c0-1.18,0.45-2.28,1.34-3.17c0.1-0.1,0.22-0.15,0.35-0.15h1.27c0.28,0,0.5,0.22,0.5,0.5 V20.5z"/>
        </svg>
          <h2 className="text-2xl font-bold text-sidebar-primary group-data-[state=collapsed]:hidden">SettleEase</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('dashboard')}
              isActive={activeView === 'dashboard'}
              tooltip={{ content: "Dashboard", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <LayoutDashboard />
              <span className="group-data-[state=collapsed]:hidden">Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('addExpense')}
              isActive={activeView === 'addExpense'}
              tooltip={{ content: "Add Expense", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <CreditCard />
              <span className="group-data-[state=collapsed]:hidden">Add Expense</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('editExpenses')}
              isActive={activeView === 'editExpenses'}
              tooltip={{ content: "Edit Expenses", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <FilePenLine />
              <span className="group-data-[state=collapsed]:hidden">Edit Expenses</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('managePeople')}
              isActive={activeView === 'managePeople'}
              tooltip={{ content: "Manage People", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <Users />
              <span className="group-data-[state=collapsed]:hidden">Manage People</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('manageCategories')}
              isActive={activeView === 'manageCategories'}
              tooltip={{ content: "Manage Categories", side: "right", align: "center", className: "group-data-[state=expanded]:hidden" }}
              className="justify-start"
            >
              <ListChecks />
              <span className="group-data-[state=collapsed]:hidden">Manage Categories</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[state=collapsed]:hidden">
         {currentUserEmail && (
          <p className="text-xs text-sidebar-foreground/70 truncate mb-2" title={currentUserEmail}>
            Logged in as: {currentUserEmail}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
        <p className="text-xs text-sidebar-foreground/70 mt-2">Version 1.1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}


interface DashboardTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
  dynamicCategories: Category[];
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

function DashboardTab({ expenses, people, peopleMap, dynamicCategories, getCategoryIconFromName }: DashboardTabProps) {
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState<Expense | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const settlement = useMemo(() => {
    if (people.length === 0 || expenses.length === 0) return [];
    const balances: Record<string, number> = {};
    people.forEach(p => balances[p.id] = 0);

    expenses.forEach(expense => {
      if (Array.isArray(expense.paid_by)) {
        expense.paid_by.forEach(payment => {
          balances[payment.personId] = (balances[payment.personId] || 0) + Number(payment.amount);
        });
      }
      if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            balances[share.personId] = (balances[share.personId] || 0) - Number(share.amount);
          });
      }
    });

    const debtors = Object.entries(balances).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => a.amount - b.amount);
    const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => b.amount - a.amount);
    const transactions: { from: string, to: string, amount: number }[] = [];
    let debtorIdx = 0, creditorIdx = 0;
    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx], creditor = creditors[creditorIdx];
      const amountToSettle = Math.min(-debtor.amount, creditor.amount);
      if (amountToSettle > 0.01) { transactions.push({ from: debtor.id, to: creditor.id, amount: amountToSettle }); debtor.amount += amountToSettle; creditor.amount -= amountToSettle; }
      if (Math.abs(debtor.amount) < 0.01) debtorIdx++;
      if (Math.abs(creditor.amount) < 0.01) creditorIdx++;
    }
    return transactions;
  }, [expenses, people]);

  const shareVsPaidData = useMemo(() => {
    if (!people.length) return [];

    return people.map(person => {
      let totalPaidByPerson = 0;
      let totalShareForPerson = 0;

      expenses.forEach(expense => {
        if (Array.isArray(expense.paid_by)) {
          expense.paid_by.forEach(payment => {
            if (payment.personId === person.id) {
              totalPaidByPerson += Number(payment.amount);
            }
          });
        }
        if (Array.isArray(expense.shares)) {
          expense.shares.forEach(share => {
            if (share.personId === person.id) {
              totalShareForPerson += Number(share.amount);
            }
          });
        }
      });
      return {
        name: peopleMap[person.id] || person.name,
        paid: totalPaidByPerson,
        share: totalShareForPerson,
      };
    }).filter(d => d.paid > 0 || d.share > 0 || people.length <= 5);
  }, [expenses, people, peopleMap]);
  
  const yAxisDomainTop = useMemo(() => {
      const dataMax = shareVsPaidData.reduce((max, item) => Math.max(max, item.paid, item.share), 0);
      const paddedMax = Math.max(dataMax, 500) * 1.1; 
      return Math.ceil(paddedMax / 50) * 50; 
  }, [shareVsPaidData]);


  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      const categoryName = exp.category || "Uncategorized"; 
      data[categoryName] = (data[categoryName] || 0) + Number(exp.total_amount);
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount: Number(amount) })).filter(d => d.amount > 0);
  }, [expenses]);

  const handleExpenseCardClick = (expense: Expense) => {
    setSelectedExpenseForModal(expense);
    setIsExpenseModalOpen(true);
  };

  if (people.length === 0 && expenses.length === 0) {
    return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-primary">Welcome to SettleEase!</CardTitle></CardHeader>
        <CardContent className="space-y-3"><FileText className="mx-auto h-12 w-12 text-primary/70" />
          <p className="text-md text-muted-foreground">No people added and no expenses recorded yet.</p>
          <p className="text-sm">Navigate to "Manage People" to add participants, then to "Add Expense" to start managing your group finances.</p>
        </CardContent>
      </Card>
    );
  }
  if (expenses.length === 0) {
     return (
      <Card className="text-center py-10 shadow-lg rounded-lg">
        <CardHeader className="pb-2"><CardTitle className="text-xl font-semibold text-primary">Ready to Settle?</CardTitle></CardHeader>
        <CardContent className="space-y-3"><FileText className="mx-auto h-12 w-12 text-primary/70" />
          <p className="text-md text-muted-foreground">No expenses recorded yet.</p>
          <p className="text-sm">Navigate to "Add Expense" to start managing your group finances.</p>
           {people.length === 0 && <p className="text-sm mt-2">First, go to "Manage People" to add participants to your group.</p>}
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl"><ArrowRight className="mr-2 h-5 w-5 text-primary" /> Settlement Summary</CardTitle>
          <CardDescription className="text-sm">Minimum transactions required to settle all debts.</CardDescription>
        </CardHeader>
        <CardContent>
          {settlement.length > 0 ? (
            <ul className="space-y-1.5">
              {settlement.map((txn, i) => (
                <li key={i} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-md text-sm">
                  <span className="font-medium text-foreground">{peopleMap[txn.from] || 'Unknown'}</span>
                  <ArrowRight className="h-4 w-4 text-accent mx-2 shrink-0" />
                  <span className="font-medium text-foreground">{peopleMap[txn.to] || 'Unknown'}</span>
                  <span className="ml-auto font-semibold text-primary pl-2">{formatCurrency(txn.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (<p className="text-sm text-muted-foreground p-2">All debts are settled, or no expenses to settle yet!</p>)}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-lg">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Share vs. Paid Comparison</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {shareVsPaidData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={shareVsPaidData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 0, 
                    bottom: 20
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval={0} angle={shareVsPaidData.length > 4 ? -30 : 0} textAnchor={shareVsPaidData.length > 4 ? "end" : "middle"} height={shareVsPaidData.length > 4 ? 50: 30} />
                  
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'paid' ? 'Total Paid' : 'Total Share']}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="paid" name="Total Paid" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} barSize={Math.min(20, 60 / shareVsPaidData.length)} />
                  <Bar dataKey="share" name="Total Share" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} barSize={Math.min(20, 60 / shareVsPaidData.length)} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for comparison chart.</p>)}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Expenses by Category</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                  <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} outerRadius={Math.min(80, window.innerWidth / 8)} fill="#8884d8" dataKey="amount" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                    {expensesByCategory.map((entry, index) => (<RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name]} 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }} 
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for category chart.</p>)}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl"><FileText className="mr-2 h-5 w-5 text-primary" /> Expense Log</CardTitle>
          <CardDescription className="text-sm">A list of all recorded expenses, most recent first. Click an expense for details.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ScrollArea className="max-h-[350px] pr-2">
              <ul className="space-y-2.5">
                {expenses.map(expense => {
                  const CategoryIcon = getCategoryIconFromName(expense.category);
                  const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1
                    ? "Multiple Payers"
                    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1
                      ? (peopleMap[expense.paid_by[0].personId] || 'Unknown')
                      : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));

                  return (
                    <li key={expense.id} onClick={() => handleExpenseCardClick(expense)} className="cursor-pointer">
                      <Card className="bg-card/70 transition-all rounded-md">
                        <CardHeader className="pb-1.5 pt-2.5 px-3">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-[0.9rem] font-semibold leading-tight">{expense.description}</CardTitle>
                            <span className="text-md font-bold text-primary">{formatCurrency(Number(expense.total_amount))}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center"><CategoryIcon className="mr-1 h-3 w-3" /> {expense.category}</div>
                            <span>Paid by: <span className="font-medium">{displayPayerText}</span></span>
                          </div>
                          
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          ) : (<p className="text-sm text-muted-foreground p-2">No expenses recorded yet.</p>)}
        </CardContent>
      </Card>
      {selectedExpenseForModal && (
        <ExpenseDetailModal
          expense={selectedExpenseForModal}
          isOpen={isExpenseModalOpen}
          onOpenChange={setIsExpenseModalOpen}
          peopleMap={peopleMap}
          getCategoryIconFromName={getCategoryIconFromName}
        />
      )}
    </div>
  );
}


interface ExpenseDetailModalProps {
  expense: Expense;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peopleMap: Record<string, string>;
  getCategoryIconFromName: (categoryName: string) => React.FC<React.SVGProps<SVGSVGElement>>;
}

function ExpenseDetailModal({ expense, isOpen, onOpenChange, peopleMap, getCategoryIconFromName }: ExpenseDetailModalProps) {
  if (!expense) return null;

  const CategoryIcon = getCategoryIconFromName(expense.category);


  const involvedPersonIds = useMemo(() => {
    const ids = new Set<string>();
    if (Array.isArray(expense.paid_by)) {
      expense.paid_by.forEach(p => ids.add(p.personId));
    }
    if (Array.isArray(expense.shares)) {
      expense.shares.forEach(s => ids.add(s.personId));
    }
    return Array.from(ids);
  }, [expense.paid_by, expense.shares]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary flex items-center">
            <Info className="mr-2 h-6 w-6" /> Expense Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="flex justify-between"><span>Description:</span> <span className="font-medium text-right">{expense.description}</span></div>
                <div className="flex justify-between"><span>Total Amount:</span> <span className="font-bold text-primary text-right">{formatCurrency(Number(expense.total_amount))}</span></div>
                <div className="flex justify-between items-center"><span>Category:</span> <span className="font-medium flex items-center"><CategoryIcon className="mr-1.5 h-4 w-4" /> {expense.category}</span></div>

                <div>
                  <span className="block">Paid by:</span>
                  {Array.isArray(expense.paid_by) && expense.paid_by.length > 0 ? (
                    <ul className="list-disc list-inside pl-4">
                      {expense.paid_by.map(p => (
                        <li key={p.personId} className="flex justify-between text-xs">
                          <span>{peopleMap[p.personId] || 'Unknown'}</span>
                          <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="font-medium text-right block">No payers listed or data unavailable</span>
                  )}
                </div>
                
                <div className="flex justify-between"><span>Split Method:</span> <span className="font-medium capitalize text-right">{expense.split_method}</span></div>
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Individual Breakdown for this Expense</CardTitle>
                <CardDescription>How this specific expense affects each person's balance before overall settlement.</CardDescription>
              </CardHeader>
              <CardContent>
                {involvedPersonIds.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {involvedPersonIds.map(personId => {
                      const personName = peopleMap[personId] || 'Unknown Person';
                      const paymentRecord = Array.isArray(expense.paid_by) ? expense.paid_by.find(p => p.personId === personId) : null;
                      const amountPaidThisExpense = paymentRecord ? Number(paymentRecord.amount) : 0;

                      const shareRecord = Array.isArray(expense.shares) ? expense.shares.find(s => s.personId === personId) : null;
                      const shareOfThisExpense = shareRecord ? Number(shareRecord.amount) : 0;

                      const netForThisExpense = amountPaidThisExpense - shareOfThisExpense;

                      return (
                        <li key={personId} className="p-2.5 bg-secondary/30 rounded-md space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{personName}</span>
                            <span
                              className={`font-bold text-xs px-1.5 py-0.5 rounded-full
                                    ${netForThisExpense < -0.01 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : netForThisExpense > 0.01 ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300'}`}
                            >
                              {netForThisExpense < -0.01 ? `Owes ${formatCurrency(Math.abs(netForThisExpense))}` :
                                netForThisExpense > 0.01 ? `Is Owed ${formatCurrency(netForThisExpense)}` :
                                  `Settled`}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Amount Paid:</span> <span>{formatCurrency(amountPaidThisExpense)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Share of Expense:</span> <span>{formatCurrency(shareOfThisExpense)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No individuals involved in payments or shares for this expense.</p>
                )}
              </CardContent>
            </Card>

            {expense.split_method === 'itemwise' && expense.items && expense.items.length > 0 && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg">Item-wise Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {expense.items.map((item, index) => (
                      <Card key={item.id || index.toString()} className="p-3 bg-card/70 shadow-sm">
                        <div className="flex justify-between items-center mb-1.5">
                          <h4 className="font-semibold text-sm">{item.name || `Item ${index + 1}`}</h4>
                          <span className="text-sm font-medium text-primary">{formatCurrency(Number(item.price))}</span>
                        </div>
                        {item.sharedBy && item.sharedBy.length > 0 ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-1">Shared by:</p>
                            <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                              {item.sharedBy.map(personId => (
                                <li key={personId} className="flex justify-between">
                                  <span>{peopleMap[personId] || 'Unknown'}</span>
                                  <span className="text-muted-foreground">{formatCurrency(Number(item.price) / item.sharedBy.length)}</span>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : <p className="text-xs text-muted-foreground">Not shared by anyone.</p>}
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
            {(expense.split_method === 'equal' && expense.shares && expense.shares.length > 0) && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-lg">Equal Split Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-1">Split equally among {expense.shares.length} {expense.shares.length === 1 ? "person" : "people"}:</p>
                    <ul className="list-disc list-inside text-sm space-y-0.5">
                      {expense.shares.map(share => (
                        <li key={share.personId}>{peopleMap[share.personId] || 'Unknown Person'}</li>
                      ))}
                    </ul>
                    <p className="text-sm mt-2">Amount per person: <span className="font-semibold text-primary">{formatCurrency(Number(expense.total_amount) / expense.shares.length)}</span></p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
