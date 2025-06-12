
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';
import {
  Users, PlusCircle, Trash2, LayoutDashboard, CreditCard, ArrowRight, FileText, Utensils, Car, ShoppingCart, PartyPopper, Lightbulb, AlertTriangle, Settings2, Pencil, Save, Ban, Menu, Info, MinusCircle
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
  DialogDescription,
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


// --- Supabase Configuration ---
const supabaseUrl = "https://pzednvgbxgixonpvbdsx.supabase.co"; 
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6ZWRudmdieGdpeG9ucHZiZHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjMwNTgsImV4cCI6MjA2NTMzOTA1OH0.O1t0484ROMUbVNPWmuEvOLU1Z6IO4svK65Q0d-3h_Og"; 

let db: SupabaseClient | undefined;
let supabaseInitializationError: string | null = null;

// Hardcoded Supabase credentials (NOT RECOMMENDED FOR PRODUCTION)
if (!supabaseUrl || !supabaseAnonKey) {
  supabaseInitializationError = "Supabase URL or Anon Key is missing in the hardcoded values.";
} else {
  try {
    db = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error: any) {
    console.error("Error initializing Supabase client with hardcoded values:", error);
    supabaseInitializationError = `Supabase Client Initialization Error (hardcoded): ${error.message || "Could not initialize Supabase."}. Check the hardcoded values.`;
  }
}


// --- Constants ---
const PEOPLE_TABLE = 'people';
const EXPENSES_TABLE = 'expenses';

const CATEGORIES = [
  { name: 'Food', icon: Utensils },
  { name: 'Transport', icon: Car },
  { name: 'Groceries', icon: ShoppingCart },
  { name: 'Entertainment', icon: PartyPopper },
  { name: 'Utilities', icon: Lightbulb },
  { name: 'Other', icon: Settings2 },
];

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// --- Helper Functions ---
const formatCurrency = (amount: number): string => {
  return `₹${Number(amount).toFixed(2)}`;
};

interface Person {
  id: string; 
  name: string;
  created_at?: string; 
}

interface ExpenseItemDetail { 
  id: string; 
  name: string;
  price: number;
  sharedBy: string[]; 
}

interface PayerShare {
  personId: string;
  amount: number;
}

interface Expense {
  id: string; 
  description: string;
  total_amount: number; 
  category: string;
  paid_by: PayerShare[]; 
  split_method: 'equal' | 'unequal' | 'itemwise';
  shares: { personId: string, amount: number }[]; 
  items?: ExpenseItemDetail[]; 
  created_at: string; 
}


let initialDefaultPeopleSetupAttemptedOrCompleted = false;


// --- Main Application Structure ---
export default function SettleEasePage() {
  const [activeView, setActiveView] = useState<'dashboard' | 'addExpense'>('dashboard');
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null); 
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const addDefaultPeople = useCallback(async () => {
    if (!db || initialDefaultPeopleSetupAttemptedOrCompleted) {
      if (initialDefaultPeopleSetupAttemptedOrCompleted && db) {
        const { data: currentPeople, error: currentPeopleError } = await db.from(PEOPLE_TABLE).select('id', { head: true, count: 'exact' });
        if (!currentPeopleError && currentPeople && currentPeople.length > 0) {
          return; 
        }
      } else if (!db) {
         console.warn("addDefaultPeople: Supabase client (db) not available.");
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
  }, []);


  useEffect(() => {
    if (supabaseInitializationError) {
      toast({ title: "Supabase Configuration Error", description: supabaseInitializationError, variant: "destructive", duration: 15000 });
      setIsLoading(false);
      return;
    }
    if (!db) {
      toast({ title: "Supabase Error", description: "Supabase client is not available.", variant: "destructive", duration: 15000 });
      setIsLoading(false);
      return;
    }
    
    let isMounted = true;
    let authStateProcessed = false; 

    const checkInitialSession = async () => {
        if (!db) return;
        const { data: { session } } = await db.auth.getSession();
        if (isMounted) {
            setCurrentUser(session?.user ?? null);
             if (!initialDefaultPeopleSetupAttemptedOrCompleted) {
                await addDefaultPeople();
            }
            if (!authStateProcessed) { setIsLoading(false); authStateProcessed = true; }
        }
    };
    checkInitialSession();
    
    const { data: authListener } = db.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setCurrentUser(session?.user ?? null);
      if (!initialDefaultPeopleSetupAttemptedOrCompleted) {
        await addDefaultPeople();
      }
      if (!authStateProcessed) { setIsLoading(false); authStateProcessed = true; }
    });
    
    const loadingFallbackTimeout = setTimeout(() => {
        if (isMounted && !authStateProcessed) {
            setIsLoading(false);
            authStateProcessed = true;
            if (!initialDefaultPeopleSetupAttemptedOrCompleted) {
                 addDefaultPeople(); 
            }
        }
    }, 2500); 

    return () => { 
        isMounted = false; 
        authListener?.subscription.unsubscribe(); 
        clearTimeout(loadingFallbackTimeout);
    };
  }, [addDefaultPeople]); 


  useEffect(() => {
    if (supabaseInitializationError || !db) return;
    let isMounted = true;
    const fetchInitialData = async () => {
      if (!isMounted || !db) return;

      const { data: peopleData, error: peopleError } = await db.from(PEOPLE_TABLE).select('*').order('name', { ascending: true });
      if (!isMounted) return;
      if (peopleError) {
        console.error("Error fetching people:", peopleError);
        toast({ title: "Data Error", description: `Could not fetch people: ${peopleError.message}`, variant: "destructive" });
      } else { setPeople(peopleData as Person[]); }

      const { data: expensesData, error: expensesError } = await db.from(EXPENSES_TABLE).select('*').order('created_at', { ascending: false });
      if (!isMounted) return;
      if (expensesError) {
        console.error("Error fetching expenses:", expensesError);
        toast({ title: "Data Error", description: `Could not fetch expenses: ${expensesError.message}`, variant: "destructive" });
      } else { setExpenses(expensesData as Expense[]); }
      
    };

    fetchInitialData(); 

    const peopleChannel = db.channel(`public:${PEOPLE_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: PEOPLE_TABLE }, 
        (payload) => {
          console.log('People change received!', payload);
          fetchInitialData(); 
        }
      ).subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log(`Subscribed to ${PEOPLE_TABLE}`);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error on ${PEOPLE_TABLE}:`, err);
      });

    const expensesChannel = db.channel(`public:${EXPENSES_TABLE}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: EXPENSES_TABLE }, 
        (payload) => {
          console.log('Expenses change received!', payload);
          fetchInitialData(); 
        }
      ).subscribe((status, err) => {
         if (status === 'SUBSCRIBED') console.log(`Subscribed to ${EXPENSES_TABLE}`);
         if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error on ${EXPENSES_TABLE}:`, err);
      });
    
    return () => { 
        isMounted = false; 
        if (db) {
            db.removeChannel(peopleChannel); 
            db.removeChannel(expensesChannel); 
        }
    };
  }, [supabaseInitializationError]); 
  
  const peopleMap = useMemo(() => people.reduce((acc, person) => { acc[person.id] = person.name; return acc; }, {} as Record<string, string>), [people]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center">
          <FileText className="w-16 h-16 text-primary animate-pulse mb-4" />
          <p className="text-xl font-semibold">Loading SettleEase...</p>
          <p className="text-muted-foreground">Please wait while we prepare your dashboard.</p>
        </div>
      </div>
    );
  }

  if (supabaseInitializationError) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center"><AlertTriangle className="mr-2 h-6 w-6" /> Configuration Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">SettleEase could not start due to a Supabase configuration problem.</p>
            <p className="mt-2 text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">{supabaseInitializationError}</p>
            <p className="mt-3 text-xs">If using hardcoded values for local testing, double-check them in `src/app/page.tsx`. For production, please ensure your Supabase environment variables (e.g., NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are correctly set.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppActualSidebar activeView={activeView} setActiveView={setActiveView} />
      <SidebarInset>
        <div className="flex flex-col h-screen"> 
          <header className="p-4 border-b bg-card flex items-center justify-between">
            <div className="flex items-center">
              <SidebarTrigger className="md:hidden mr-2" /> 
              <h1 className="text-2xl font-headline font-bold text-primary">
                {activeView === 'dashboard' ? 'Dashboard' : 'Manage Expenses'}
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
            {activeView === 'dashboard' && <DashboardTab expenses={expenses} people={people} peopleMap={peopleMap} />}
            {activeView === 'addExpense' && <AddExpenseTab people={people} />}
          </main>
          <footer className="text-center py-3 text-xs text-muted-foreground border-t bg-card">
            <p>&copy; {new Date().getFullYear()} SettleEase. All rights reserved.</p>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

interface AppActualSidebarProps {
  activeView: 'dashboard' | 'addExpense';
  setActiveView: (view: 'dashboard' | 'addExpense') => void;
}

function AppActualSidebar({ activeView, setActiveView }: AppActualSidebarProps) {
    const { isMobile } = useSidebar(); 
    return (
        <Sidebar collapsible={isMobile ? "offcanvas" : "icon"} side="left" variant="sidebar">
            <SidebarHeader className="items-center p-4 border-b border-sidebar-border">
                 <div className="flex items-center gap-2">
                    <svg className="h-8 w-8 fill-primary" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" data-ai-logo="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 14h-3v-4H7v-2h4V8l4 4-4 4v-2h3v2z"/></svg>
                    <h2 className="text-xl font-bold text-sidebar-primary group-data-[state=collapsed]:hidden">SettleEase</h2>
                 </div>
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setActiveView('dashboard')}
                            isActive={activeView === 'dashboard'}
                            tooltip={{content: "Dashboard", side: "right", align:"center", className: "group-data-[state=expanded]:hidden"}}
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
                            tooltip={{content: "Add Expense", side: "right", align:"center", className: "group-data-[state=expanded]:hidden"}}
                            className="justify-start"
                        >
                            <CreditCard />
                            <span className="group-data-[state=collapsed]:hidden">Add Expense</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-3 border-t border-sidebar-border group-data-[state=collapsed]:hidden">
                 <p className="text-xs text-sidebar-foreground/70">Version 1.0.0</p>
            </SidebarFooter>
        </Sidebar>
    );
}

interface PayerInputRow {
  id: string; 
  personId: string;
  amount: number | '';
}
interface AddExpenseTabProps {
  people: Person[];
}

function AddExpenseTab({ people }: AddExpenseTabProps) {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  
  const [payers, setPayers] = useState<PayerInputRow[]>([{ id: Date.now().toString(), personId: '', amount: '' }]);

  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal' | 'itemwise'>('equal');
  
  const [selectedPeopleEqual, setSelectedPeopleEqual] = useState<string[]>([]);
  const [unequalShares, setUnequalShares] = useState<Record<string, number | ''>>({});
  const [items, setItems] = useState<ExpenseItemDetail[]>([{ id: Date.now().toString(), name: '', price: '' as any, sharedBy: [] }]);
  
  const [newPersonName, setNewPersonName] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonNewName, setEditingPersonNewName] = useState('');
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  const handlePayerChange = (rowId: string, field: 'personId' | 'amount', value: string | number) => {
    setPayers(prevPayers => 
      prevPayers.map(p => 
        p.id === rowId 
        ? { ...p, [field]: field === 'amount' ? (value === '' ? '' : parseFloat(value as string) || 0) : value } 
        : p
      )
    );
  };

  const addPayerRow = () => {
    setPayers(prevPayers => [...prevPayers, { id: Date.now().toString(), personId: '', amount: '' }]);
  };

  const removePayerRow = (rowId: string) => {
    setPayers(prevPayers => prevPayers.length > 1 ? prevPayers.filter(p => p.id !== rowId) : prevPayers);
  };

  useEffect(() => {
    if (payers.length === 1 && totalAmount && payers[0].amount === '' && payers[0].personId) {
      setPayers([{ ...payers[0], amount: Number(totalAmount) }]);
    }
  }, [totalAmount, payers]); 


  const handleAddPerson = async () => {
    if (!newPersonName.trim() || !db || supabaseInitializationError) {
        if (supabaseInitializationError){ toast({ title: "Error", description: "Cannot add person: Supabase issue.", variant: "destructive" }); } 
        else if (!newPersonName.trim()) { toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" }); }
        return;
    }
    try {
      await db.from(PEOPLE_TABLE).insert([{ name: newPersonName.trim(), created_at: new Date().toISOString() }]).select();
      toast({ title: "Person Added", description: `${newPersonName.trim()} has been added.` });
      setNewPersonName('');
    } catch (error: any) { toast({ title: "Error", description: `Could not add person: ${error.message}`, variant: "destructive" }); }
  };

  const handleStartEditPerson = (person: Person) => { setEditingPersonId(person.id); setEditingPersonNewName(person.name); };
  const handleCancelEditPerson = () => { setEditingPersonId(null); setEditingPersonNewName(''); };

  const handleSavePersonName = async () => {
    if (!editingPersonId || !editingPersonNewName.trim() || !db || supabaseInitializationError) {
      if (supabaseInitializationError) { toast({ title: "Error", description: "Cannot update person: Supabase issue.", variant: "destructive" }); } 
      else if (!editingPersonNewName.trim()) { toast({ title: "Validation Error", description: "Person's name cannot be empty.", variant: "destructive" }); }
      return;
    }
    try {
      await db.from(PEOPLE_TABLE).update({ name: editingPersonNewName.trim() }).eq('id', editingPersonId);
      toast({ title: "Person Updated", description: "Name updated successfully." });
      handleCancelEditPerson();
    } catch (error: any) { toast({ title: "Error", description: `Could not update person: ${error.message}`, variant: "destructive" }); }
  };
  
  const handleConfirmRemovePerson = (person: Person) => setPersonToDelete(person);

  const handleExecuteRemovePerson = async () => {
    if (!personToDelete || !db || supabaseInitializationError) {
       if (supabaseInitializationError) { toast({ title: "Error", description: "Cannot remove person: Supabase issue.", variant: "destructive" }); }
      setPersonToDelete(null); return;
    }
    try {
      await db.from(PEOPLE_TABLE).delete().eq('id', personToDelete.id);
      toast({ title: "Person Removed", description: `${personToDelete.name} has been removed.` });
      if (editingPersonId === personToDelete.id) handleCancelEditPerson();
      
      setPayers(prev => {
        const updatedPayers = prev.map(p => p.personId === personToDelete.id ? {...p, personId: '', amount: ''} : p).filter(p => p.personId !== '');
        if (updatedPayers.length === 0 && people.length > 1) { 
            return [{ id: Date.now().toString(), personId: '', amount: '' }];
        }
        return updatedPayers.length === 0 ? [{ id: Date.now().toString(), personId: '', amount: '' }] : updatedPayers;
      });


      setSelectedPeopleEqual(prev => prev.filter(id => id !== personToDelete.id));
      setUnequalShares(prev => { const newShares = {...prev}; delete newShares[personToDelete.id]; return newShares; });
      setItems(prevItems => prevItems.map(item => ({ ...item, sharedBy: item.sharedBy.filter(id => id !== personToDelete.id) })));
    } catch (error: any) { toast({ title: "Error", description: `Could not remove ${personToDelete.name}: ${error.message}`, variant: "destructive" }); } 
    finally { setPersonToDelete(null); }
  };
  
  const sumOfPayerAmounts = useMemo(() => {
    return payers.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payers]);

  const isFormValid = useMemo(() => {
    if (!description.trim() || !totalAmount || Number(totalAmount) <= 0 || !category) return false;
    
    if (payers.some(p => !p.personId || p.amount === '' || Number(p.amount) < 0)) return false; 
    if (payers.every(p => Number(p.amount) === 0) && Number(totalAmount) > 0) return false; 
    if (Math.abs(sumOfPayerAmounts - Number(totalAmount)) > 0.01) return false;


    if (splitMethod === 'equal') return selectedPeopleEqual.length > 0;
    if (splitMethod === 'unequal') {
      const sumOfShares = Object.values(unequalShares).reduce((sum, share) => sum + (Number(share) || 0), 0);
      return Math.abs(sumOfShares - Number(totalAmount)) < 0.01 && Object.values(unequalShares).every(s => s !== '' && Number(s) >= 0) && Object.keys(unequalShares).length > 0;
    }
    if (splitMethod === 'itemwise') {
      if (items.length === 0) return false;
      const sumOfItemPrices = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      return Math.abs(sumOfItemPrices - Number(totalAmount)) < 0.01 && items.every(item => item.name.trim() && Number(item.price) > 0 && item.sharedBy.length > 0);
    }
    return false;
  }, [description, totalAmount, category, payers, sumOfPayerAmounts, splitMethod, selectedPeopleEqual, unequalShares, items]);

  const remainingAmountUnequal = useMemo(() => {
    if (splitMethod !== 'unequal' || totalAmount === '') return 0;
    const sumOfShares = Object.values(unequalShares).reduce((sum, share) => sum + (Number(share) || 0), 0);
    return Number(totalAmount) - sumOfShares;
  }, [totalAmount, unequalShares, splitMethod]);

  const sumOfItemPrices = useMemo(() => {
    if (splitMethod !== 'itemwise') return 0;
    return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [items, splitMethod]);

  const handleAddItem = () => setItems([...items, { id: Date.now().toString(), name: '', price: '' as any, sharedBy: [] }]);
  const handleRemoveItem = (itemId: string) => setItems(items.filter(item => item.id !== itemId));
  const handleItemChange = (itemId: string, field: keyof Omit<ExpenseItemDetail, 'id' | 'price'> | 'price', value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: field === 'price' ? (value === '' ? '' : parseFloat(value as string) || 0) : value } : item));
  };
  const handleItemSharedByChange = (itemId: string, personId: string) => {
    setItems(items.map(item => item.id === itemId ? { ...item, sharedBy: item.sharedBy.includes(personId) ? item.sharedBy.filter(id => id !== personId) : [...item.sharedBy, personId] } : item));
  };

  const resetForm = () => {
    setDescription(''); setTotalAmount(''); setCategory('');
    setPayers([{ id: Date.now().toString(), personId: '', amount: '' }]);
    setSelectedPeopleEqual([]); setUnequalShares({});
    setItems([{ id: Date.now().toString(), name: '', price: '' as any, sharedBy: [] }]);
    setSplitMethod('equal');
  };

  const handleSubmitExpense = async () => {
    if (!isFormValid || !db || supabaseInitializationError) {
        if (supabaseInitializationError){ toast({ title: "Error", description: "Cannot add expense: Supabase issue.", variant: "destructive" }); } 
        else if (!isFormValid) { toast({ title: "Validation Error", description: "Please fill all required fields correctly. Ensure payer amounts sum to total, and splits add up.", variant: "destructive" }); }
        return;
    }
    let sharesData: { personId: string, amount: number }[] = [];
    if (splitMethod === 'equal') {
      const amountPerPerson = Number(totalAmount) / selectedPeopleEqual.length;
      sharesData = selectedPeopleEqual.map(personId => ({ personId, amount: amountPerPerson }));
    } else if (splitMethod === 'unequal') {
      sharesData = Object.entries(unequalShares).filter(([_, amount]) => Number(amount) > 0).map(([personId, amount]) => ({ personId, amount: Number(amount) }));
    } else if (splitMethod === 'itemwise') {
      const personOwes: Record<string, number> = {};
      items.forEach(item => {
        if (item.sharedBy.length > 0) {
          const amountPerPersonForItem = Number(item.price) / item.sharedBy.length;
          item.sharedBy.forEach(personId => { personOwes[personId] = (personOwes[personId] || 0) + amountPerPersonForItem; });
        }
      });
      sharesData = Object.entries(personOwes).map(([personId, amount]) => ({ personId, amount }));
    }
    
    const validPayers = payers.filter(p => p.personId && Number(p.amount) >= 0).map(p => ({ personId: p.personId, amount: Number(p.amount) }));

    const expenseToInsert = { 
        description, 
        total_amount: Number(totalAmount), 
        category, 
        paid_by: validPayers, 
        split_method: splitMethod, 
        shares: sharesData, 
        items: splitMethod === 'itemwise' ? items.map(item => ({ ...item, price: Number(item.price) })) : undefined, 
        created_at: new Date().toISOString() 
    };
    try {
      await db.from(EXPENSES_TABLE).insert([expenseToInsert]);
      toast({ title: "Expense Added!", description: `${description} has been successfully recorded.` });
      resetForm();
    } catch (error: any) { toast({ title: "Error", description: `Could not add expense: ${error.message}`, variant: "destructive" }); }
  };
  
  return (
    <div className="space-y-6"> 
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><Users className="mr-2 h-5 w-5 text-primary" /> Manage People</CardTitle>
          <CardDescription>Add, edit, or remove people in your settlement group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="newPersonName" className="text-sm font-medium">Add New Person</Label>
            <div className="flex space-x-2 mt-1">
              <Input id="newPersonName" type="text" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Enter person's name" className="flex-grow" />
              <Button onClick={handleAddPerson} disabled={!newPersonName.trim() || !!supabaseInitializationError}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground text-sm">Current People:</h4>
            {people.length > 0 ? (
              <ScrollArea className="h-40 rounded-md border p-2 bg-background">
                <ul className="space-y-1.5">
                  {people.map(person => (
                    <li key={person.id} className="flex items-center justify-between p-2 bg-card/60 hover:bg-secondary/40 rounded-sm text-sm group">
                      {editingPersonId === person.id ? (
                        <>
                          <Input type="text" value={editingPersonNewName} onChange={(e) => setEditingPersonNewName(e.target.value)} className="flex-grow mr-2 h-8 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSavePersonName()} />
                          <Button variant="ghost" size="icon" onClick={handleSavePersonName} className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100" title="Save"><Save className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={handleCancelEditPerson} className="h-7 w-7 text-gray-500 hover:text-gray-600 hover:bg-gray-100" title="Cancel"><Ban className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="truncate flex-grow" title={person.name}>{person.name}</span>
                          <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => handleStartEditPerson(person)} className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100" title="Edit name"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleConfirmRemovePerson(person)} className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100" title="Remove person"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : ( <p className="text-sm text-muted-foreground p-2">No people added yet. Add some to get started!</p> )}
          </div>
        </CardContent>
      </Card>

      {personToDelete && (
        <AlertDialog open={personToDelete !== null} onOpenChange={(open) => !open && setPersonToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action will remove <strong>{personToDelete.name}</strong> from the group. Associated expense data might be affected. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPersonToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleExecuteRemovePerson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove {personToDelete.name}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><CreditCard className="mr-2 h-5 w-5 text-primary" /> Add New Expense</CardTitle>
          <CardDescription>Fill in the details of the expense and how it was split.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4"> 
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Dinner with friends" className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label htmlFor="totalAmount">Total Amount</Label><Input id="totalAmount" type="number" value={totalAmount} onChange={(e) => setTotalAmount(parseFloat(e.target.value) || '')} placeholder="e.g., 1000" className="mt-1" /></div>
            <div><Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}><SelectTrigger id="category" className="w-full mt-1"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(cat => { const IconComponent = cat.icon; return (<SelectItem key={cat.name} value={cat.name}><div className="flex items-center"><IconComponent className="mr-2 h-4 w-4 text-muted-foreground" /> {cat.name}</div></SelectItem>)})}</SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label>Paid by</Label>
            {payers.map((payerRow, index) => (
              <Card key={payerRow.id} className="p-3 bg-card/60 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex-grow">
                    <Label htmlFor={`payer-person-${payerRow.id}`} className="sr-only">Payer Person</Label>
                    <Select 
                      value={payerRow.personId} 
                      onValueChange={(value) => handlePayerChange(payerRow.id, 'personId', value)}
                      disabled={people.length === 0}
                    >
                      <SelectTrigger id={`payer-person-${payerRow.id}`} className="w-full h-9 text-sm">
                        <SelectValue placeholder={people.length === 0 ? "Add people first" : "Select payer"} />
                      </SelectTrigger>
                      <SelectContent>
                        {people.map(person => (<SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/3">
                     <Label htmlFor={`payer-amount-${payerRow.id}`} className="sr-only">Payer Amount</Label>
                    <Input 
                      id={`payer-amount-${payerRow.id}`} 
                      type="number" 
                      value={payerRow.amount} 
                      onChange={(e) => handlePayerChange(payerRow.id, 'amount', e.target.value)} 
                      placeholder="Amount" 
                      className="h-9 text-sm"
                    />
                  </div>
                  {payers.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePayerRow(payerRow.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            <Button variant="outline" onClick={addPayerRow} className="w-full h-9 text-sm" disabled={people.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Another Payer
            </Button>
            {Number(totalAmount) > 0 && (
                 <div className={`text-xs font-medium p-1.5 rounded-md mt-1 ${Math.abs(sumOfPayerAmounts - Number(totalAmount)) < 0.01 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                    Payer Sum: {formatCurrency(sumOfPayerAmounts)} (Total Expense: {formatCurrency(Number(totalAmount))})
                 </div>
            )}
          </div>


          <div><Label>Split Method</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Button variant={splitMethod === 'equal' ? 'default' : 'outline'} onClick={() => setSplitMethod('equal')} className="text-sm">Equal</Button>
              <Button variant={splitMethod === 'unequal' ? 'default' : 'outline'} onClick={() => setSplitMethod('unequal')} className="text-sm">Unequal</Button>
              <Button variant={splitMethod === 'itemwise' ? 'default' : 'outline'} onClick={() => setSplitMethod('itemwise')} className="text-sm">Item-wise</Button>
            </div>
          </div>

          {Number(totalAmount) > 0 && people.length > 0 && (
            <div className="p-3 border rounded-md bg-secondary/20 mt-3"> 
            {splitMethod === 'equal' && (<div className="space-y-2"><h4 className="font-semibold text-sm">Select who shared:</h4>{people.map(person => (<div key={person.id} className="flex items-center space-x-2"><Checkbox id={`equal-${person.id}`} checked={selectedPeopleEqual.includes(person.id)} onCheckedChange={(checked) => setSelectedPeopleEqual(prev => checked ? [...prev, person.id] : prev.filter(id => id !== person.id))} /><Label htmlFor={`equal-${person.id}`} className="font-normal text-sm">{person.name}</Label></div>))}</div>)}
            {splitMethod === 'unequal' && (<div className="space-y-2"><h4 className="font-semibold text-sm">Enter individual shares:</h4>{people.map(person => (<div key={person.id} className="flex items-center justify-between space-x-2"><Label htmlFor={`unequal-${person.id}`} className="min-w-[70px] text-sm">{person.name}</Label><Input id={`unequal-${person.id}`} type="number" value={unequalShares[person.id] || ''} onChange={(e) => setUnequalShares(prev => ({ ...prev, [person.id]: parseFloat(e.target.value) || '' }))} placeholder="Amt" className="w-1/2 h-8 text-sm" /></div>))}<div className={`text-xs font-medium p-1.5 rounded-md mt-1 ${Math.abs(remainingAmountUnequal) < 0.01 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>Remaining: {formatCurrency(remainingAmountUnequal)}</div></div>)}
            {splitMethod === 'itemwise' && (<div className="space-y-3"><h4 className="font-semibold text-sm">Add items and assign shares:</h4>{items.map((item, index) => (<Card key={item.id} className="p-2.5 bg-card/80 shadow-sm"><div className="space-y-1.5"><div className="flex justify-between items-center mb-1"><p className="font-medium text-xs">Item #{index + 1}</p>{items.length > 1 && (<Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-5 w-5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>)}</div><Input value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} placeholder="Item name" className="text-xs h-8" /><Input type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} placeholder="Price" className="text-xs h-8" /><div className="space-y-0.5 pt-0.5"><p className="text-xs text-muted-foreground">Shared by:</p><div className="grid grid-cols-2 gap-x-2 gap-y-1">{people.map(person => (<div key={person.id} className="flex items-center space-x-1"><Checkbox id={`item-${item.id}-person-${person.id}`} checked={item.sharedBy.includes(person.id)} onCheckedChange={() => handleItemSharedByChange(item.id, person.id)} className="h-3 w-3" /><Label htmlFor={`item-${item.id}-person-${person.id}`} className="text-xs font-normal">{person.name}</Label></div>))}</div></div></div></Card>))}<Button variant="outline" onClick={handleAddItem} className="w-full h-9 text-sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Another Item</Button><div className={`text-xs font-medium p-1.5 rounded-md mt-1 ${Math.abs(sumOfItemPrices - Number(totalAmount)) < 0.01 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>Item Sum: {formatCurrency(sumOfItemPrices)} (Total: {formatCurrency(Number(totalAmount))})</div></div>)}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmitExpense} disabled={!isFormValid || !!supabaseInitializationError} className="w-full text-base py-2.5">Add Expense</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface DashboardTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
}

function DashboardTab({ expenses, people, peopleMap }: DashboardTabProps) {
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
      expense.shares.forEach(share => { 
        balances[share.personId] = (balances[share.personId] || 0) - Number(share.amount); 
      });
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

  const expensesByPayer = useMemo(() => {
    const data: Record<string, number> = {};
    people.forEach(p => data[p.name] = 0);
    expenses.forEach(exp => { 
      if (Array.isArray(exp.paid_by)) {
        exp.paid_by.forEach(payment => {
          const payerName = peopleMap[payment.personId];
          if (payerName) { data[payerName] = (data[payerName] || 0) + Number(payment.amount); }
        });
      }
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount })).filter(d => d.amount > 0);
  }, [expenses, peopleMap, people]);

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    CATEGORIES.forEach(c => data[c.name] = 0);
    expenses.forEach(exp => { data[exp.category] = (data[exp.category] || 0) + exp.total_amount; });
    return Object.entries(data).map(([name, amount]) => ({ name, amount })).filter(d => d.amount > 0);
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
          <p className="text-md text-muted-foreground">No expenses recorded yet.</p>
          <p className="text-sm">Navigate to "Add Expense" to start managing your group finances.</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-lg">Expenses by Payer</CardTitle></CardHeader>
          <CardContent className="h-[280px]"> 
            {expensesByPayer.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByPayer} margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for payer chart.</p>)}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg">
          <CardHeader className="pb-2"><CardTitle className="text-lg">Expenses by Category</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
             {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}> 
                  <Pie data={expensesByCategory} cx="50%" cy="50%" labelLine={false} outerRadius={70} fill="#8884d8" dataKey="amount" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                    {expensesByCategory.map((entry, index) => (<RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '4px 8px' }}/>
                  <Legend wrapperStyle={{fontSize: "11px", paddingTop: "10px"}}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center text-sm">No data for category chart.</p>)}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg rounded-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-xl"><FileText className="mr-2 h-5 w-5 text-primary" /> Expense Log</CardTitle>
          <CardDescription className="text-sm">A list of all recorded expenses, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="max-h-[350px] overflow-y-auto pr-2"> 
            <ul className="space-y-2.5">
              {expenses.map(expense => {
                 const CategoryIcon = CATEGORIES.find(c => c.name === expense.category)?.icon || Settings2;
                 const payerNames = Array.isArray(expense.paid_by) 
                    ? expense.paid_by.map(p => peopleMap[p.personId] || 'Unknown').join(', ')
                    : 'Data Error'; 
                 const displayPayerText = Array.isArray(expense.paid_by) && expense.paid_by.length > 1 
                    ? "Multiple Payers" 
                    : (Array.isArray(expense.paid_by) && expense.paid_by.length === 1 
                        ? (peopleMap[expense.paid_by[0].personId] || 'Unknown') 
                        : (expense.paid_by && (expense.paid_by as any).length === 0 ? 'None' : 'Error'));


                 return (
                  <li key={expense.id} onClick={() => handleExpenseCardClick(expense)} className="cursor-pointer">
                    <Card className="bg-card/70 hover:shadow-md hover:border-primary/50 transition-all rounded-md">
                      <CardHeader className="pb-1.5 pt-2.5 px-3">
                         <div className="flex justify-between items-start">
                            <CardTitle className="text-[0.9rem] font-semibold leading-tight">{expense.description}</CardTitle>
                            <span className="text-md font-bold text-primary">{formatCurrency(expense.total_amount)}</span>
                         </div>
                      </CardHeader>
                      <CardContent className="px-3 pb-2 text-xs text-muted-foreground space-y-0.5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center"><CategoryIcon className="mr-1 h-3 w-3" /> {expense.category}</div>
                            <span>Paid by: <span className="font-medium text-foreground">{displayPayerText}</span></span>
                         </div>
                         <p>Date: {expense.created_at ? new Date(expense.created_at).toLocaleDateString() : 'N/A'}</p>
                      </CardContent>
                    </Card>
                  </li>
                )})}
            </ul>
            </div>
          ) : (<p className="text-sm text-muted-foreground p-2">No expenses recorded yet.</p>)}
        </CardContent>
      </Card>
      {selectedExpenseForModal && (
        <ExpenseDetailModal 
          expense={selectedExpenseForModal} 
          isOpen={isExpenseModalOpen} 
          onOpenChange={setIsExpenseModalOpen}
          peopleMap={peopleMap} 
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
}

function ExpenseDetailModal({ expense, isOpen, onOpenChange, peopleMap }: ExpenseDetailModalProps) {
  if (!expense) return null;

  const CategoryIcon = CATEGORIES.find(c => c.name === expense.category)?.icon || Settings2;

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
          <DialogDescription>
            Detailed breakdown of "{expense.description}" recorded on {new Date(expense.created_at).toLocaleDateString()}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow min-h-0 overflow-y-auto pr-4">
          <div className="space-y-4 py-4">
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1.5">
                <div className="flex justify-between"><span>Description:</span> <span className="font-medium text-right">{expense.description}</span></div>
                <div className="flex justify-between"><span>Total Amount:</span> <span className="font-bold text-primary text-right">{formatCurrency(expense.total_amount)}</span></div>
                <div className="flex justify-between items-center"><span>Category:</span> <span className="font-medium flex items-center"><CategoryIcon className="mr-1.5 h-4 w-4 text-muted-foreground" /> {expense.category}</span></div>
                
                <div>
                  <span className="block">Paid by:</span>
                  {Array.isArray(expense.paid_by) && expense.paid_by.length > 0 ? (
                    <ul className="list-disc list-inside pl-4">
                      {expense.paid_by.map(p => (
                        <li key={p.personId} className="flex justify-between text-xs">
                          <span>{peopleMap[p.personId] || 'Unknown'}</span>
                          <span className="font-medium">{formatCurrency(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="font-medium text-right block">No payers listed or data unavailable</span>
                  )}
                </div>

                <div className="flex justify-between"><span>Date:</span> <span className="font-medium text-right">{new Date(expense.created_at).toLocaleDateString()}</span></div>
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
                                    ${netForThisExpense < -0.01 ? 'bg-red-100 text-red-700' : netForThisExpense > 0.01 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
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
                      <Card key={item.id || index} className="p-3 bg-card/70 shadow-sm">
                        <div className="flex justify-between items-center mb-1.5">
                          <h4 className="font-semibold text-sm">{item.name || `Item ${index + 1}`}</h4>
                          <span className="text-sm font-medium text-primary">{formatCurrency(item.price)}</span>
                        </div>
                        {item.sharedBy.length > 0 ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-1">Shared by:</p>
                            <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
                              {item.sharedBy.map(personId => (
                                <li key={personId} className="flex justify-between">
                                  <span>{peopleMap[personId] || 'Unknown'}</span>
                                  <span className="text-muted-foreground">{formatCurrency(item.price / item.sharedBy.length)}</span>
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
             {(expense.split_method === 'equal' && expense.shares.length > 0) && (
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
                     <p className="text-sm mt-2">Amount per person: <span className="font-semibold text-primary">{formatCurrency(expense.total_amount / expense.shares.length)}</span></p>
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


    
