
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth, type User } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  getDocs,
  writeBatch,
  serverTimestamp,
  limit,
  type Firestore,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell as RechartsCell } from 'recharts';
import {
  Users, PlusCircle, Trash2, LayoutDashboard, CreditCard, ArrowRight, CheckCircle2, XCircle, FileText, Utensils, Car, ShoppingCart, PartyPopper, Lightbulb, AlertTriangle, Settings2
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';


// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let firebaseInitializationError: string | null = null;

// Validate essential Firebase config values
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
  firebaseInitializationError = "Firebase API Key is missing or is a placeholder. Please set the NEXT_PUBLIC_FIREBASE_API_KEY environment variable correctly.";
} else if (!firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
  firebaseInitializationError = "Firebase Project ID is missing or is a placeholder. Please set the NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable correctly.";
}

if (!firebaseInitializationError) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error: any) {
    console.error("Error initializing Firebase SDK:", error);
    firebaseInitializationError = `Firebase SDK Initialization Error: ${error.message || "Could not initialize Firebase."}. Ensure your Firebase project is set up correctly and environment variables are accessible.`;
  }
} else {
  // Log the pre-initialization config error
  console.error("Firebase Configuration Error:", firebaseInitializationError);
}


// --- Constants ---
const APP_ID = "SettleEaseApp"; // Used in collection paths
const PEOPLE_COLLECTION_PATH = `artifacts/${APP_ID}/public/data/people`;
const EXPENSES_COLLECTION_PATH = `artifacts/${APP_ID}/public/data/expenses`;

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
  createdAt?: Timestamp;
}

interface Expense {
  id: string;
  description: string;
  totalAmount: number;
  category: string;
  paidBy: string; // personId
  splitMethod: 'equal' | 'unequal' | 'itemwise';
  shares: { personId: string, amount: number }[];
  items?: { name: string, price: number, sharedBy: string[] }[]; // personIds
  createdAt: Timestamp;
}

interface Item {
  id: string; // for React key
  name: string;
  price: number;
  sharedBy: string[]; // personIds
}

// --- Main Application Component ---
export default function SettleEaseApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'addExpense'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Authentication
  useEffect(() => {
    if (firebaseInitializationError) {
      toast({
        title: "Firebase Configuration Error",
        description: firebaseInitializationError,
        variant: "destructive",
        duration: 15000, // Keep message visible for a while
      });
      setIsLoading(false);
      return;
    }

    if (!auth) {
      // This case implies an issue even if pre-checks passed, e.g. SDK internal error
      toast({
        title: "Firebase Error",
        description: "Firebase Authentication service is not available. Please check console logs.",
        variant: "destructive",
        duration: 15000,
      });
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // db should be available if auth is, due to initialization logic
        if (db) await addDefaultPeople();
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          console.error("Error signing in anonymously:", error);
          let description = "Could not sign in anonymously. Check Firebase console.";
          if (error.code === 'auth/operation-not-allowed') {
            description = "Anonymous sign-in is not enabled in your Firebase project. Please enable it in the Firebase console (Authentication > Sign-in method).";
          } else if (error.code === 'auth/api-key-not-valid') {
            description = "Firebase API key is invalid. This should have been caught earlier. Please verify NEXT_PUBLIC_FIREBASE_API_KEY.";
          }
          toast({ title: "Authentication Error", description, variant: "destructive" });
        }
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []); // Dependencies are stable after initial module load

  // Firestore Listeners
  useEffect(() => {
    if (firebaseInitializationError || !currentUser || !db) {
        // If there was an init error, or no user, or db is not available, don't set up listeners.
        // isLoading should be false if firebaseInitializationError is set from the auth effect.
        // If !currentUser or !db, it's normal not to fetch, so no special loading handling here.
        return;
    }

    const peopleQuery = query(collection(db, PEOPLE_COLLECTION_PATH), orderBy("name", "asc"));
    const expensesQuery = query(collection(db, EXPENSES_COLLECTION_PATH), orderBy("createdAt", "desc"));

    const unsubscribePeople = onSnapshot(peopleQuery, (snapshot) => {
      const peopleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Person));
      setPeople(peopleData);
    }, (error) => {
      console.error("Error fetching people:", error);
      toast({ title: "Data Error", description: "Could not fetch people data.", variant: "destructive" });
    });

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      toast({ title: "Data Error", description: "Could not fetch expenses data.", variant: "destructive" });
    });

    return () => {
      unsubscribePeople();
      unsubscribeExpenses();
    };
  }, [currentUser]); // firebaseInitializationError and db are stable after init.

  const addDefaultPeople = async () => {
    if (!db) return; // db check already here, good.
    const peopleCollectionRef = collection(db, PEOPLE_COLLECTION_PATH);
    const q = query(peopleCollectionRef, limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const defaultPeopleNames = ['Alice', 'Bob', 'Charlie'];
      const batch = writeBatch(db);
      defaultPeopleNames.forEach(name => {
        const newPersonRef = doc(peopleCollectionRef);
        batch.set(newPersonRef, { name, createdAt: serverTimestamp() });
      });
      try {
        await batch.commit();
        toast({ title: "Welcome!", description: "Added Alice, Bob, and Charlie to your group." });
      } catch (error) {
        console.error("Error adding default people:", error);
        toast({ title: "Setup Error", description: "Could not add default people.", variant: "destructive" });
      }
    }
  };
  
  const peopleMap = useMemo(() => {
    return people.reduce((acc, person) => {
      acc[person.id] = person.name;
      return acc;
    }, {} as Record<string, string>);
  }, [people]);


  if (isLoading) { // Show loading only if we haven't hit an error or completed auth.
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center">
          <FileText className="w-16 h-16 text-primary animate-pulse mb-4" />
          <p className="text-xl font-semibold">Loading SettleEase...</p>
          <p className="text-muted-foreground">Please wait while we prepare your dashboard.</p>
          {firebaseInitializationError && ( // Also show error here if still loading for some reason
            <p className="mt-4 text-sm text-destructive p-2 bg-destructive/10 rounded-md max-w-md text-center">
              Configuration Issue: {firebaseInitializationError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // If firebase failed to initialize and not loading, show a clear message.
  if (firebaseInitializationError && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Configuration Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">SettleEase could not start due to a Firebase configuration problem.</p>
            <p className="mt-2 text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">{firebaseInitializationError}</p>
            <p className="mt-4 text-xs">Please ensure your Firebase environment variables (e.g., <code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>) are correctly set in your project and are not using placeholder values.</p>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-body">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary">SettleEase</h1>
        <p className="text-muted-foreground">Simplify your group expenses effortlessly.</p>
      </header>

      <div className="max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="mb-6 flex justify-center border-b border-border">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2 px-4 text-lg rounded-none ${activeTab === 'dashboard' ? 'border-b-2 border-accent text-accent font-semibold' : 'text-muted-foreground hover:text-accent'}`}
          >
            <LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('addExpense')}
            className={`pb-2 px-4 text-lg rounded-none ${activeTab === 'addExpense' ? 'border-b-2 border-accent text-accent font-semibold' : 'text-muted-foreground hover:text-accent'}`}
          >
            <CreditCard className="mr-2 h-5 w-5" /> Add Expense
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && <DashboardTab expenses={expenses} people={people} peopleMap={peopleMap} />}
        {activeTab === 'addExpense' && <AddExpenseTab people={people} />}
      </div>
      <footer className="text-center mt-12 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SettleEase. All rights reserved.</p>
      </footer>
    </div>
  );
}

// --- AddExpenseTab Component ---
interface AddExpenseTabProps {
  people: Person[];
}

function AddExpenseTab({ people }: AddExpenseTabProps) {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState(''); // personId
  const [splitMethod, setSplitMethod] = useState<'equal' | 'unequal' | 'itemwise'>('equal');
  
  // Equal split state
  const [selectedPeopleEqual, setSelectedPeopleEqual] = useState<string[]>([]);

  // Unequal split state
  const [unequalShares, setUnequalShares] = useState<Record<string, number | ''>>({});
  
  // Item-wise split state
  const [items, setItems] = useState<Item[]>([{ id: Date.now().toString(), name: '', price: '' as any, sharedBy: [] }]);

  const [newPersonName, setNewPersonName] = useState('');

  const handleAddPerson = async () => {
    if (!newPersonName.trim() || !db || firebaseInitializationError) {
        if (firebaseInitializationError){
             toast({ title: "Error", description: "Cannot add person due to Firebase configuration issue.", variant: "destructive" });
        }
        return;
    }
    try {
      await addDoc(collection(db, PEOPLE_COLLECTION_PATH), {
        name: newPersonName.trim(),
        createdAt: serverTimestamp()
      });
      toast({ title: "Person Added", description: `${newPersonName.trim()} has been added to the group.` });
      setNewPersonName('');
    } catch (error) {
      console.error("Error adding person:", error);
      toast({ title: "Error", description: "Could not add person.", variant: "destructive" });
    }
  };
  
  const isFormValid = useMemo(() => {
    if (!description.trim() || !totalAmount || totalAmount <= 0 || !category || !paidBy) return false;

    if (splitMethod === 'equal') {
      return selectedPeopleEqual.length > 0;
    }
    if (splitMethod === 'unequal') {
      const sumOfShares = Object.values(unequalShares).reduce((sum, share) => sum + (Number(share) || 0), 0);
      return Math.abs(sumOfShares - Number(totalAmount)) < 0.01 && Object.values(unequalShares).every(s => s !== '' && Number(s) >= 0);
    }
    if (splitMethod === 'itemwise') {
      if (items.length === 0) return false;
      const sumOfItemPrices = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
      return Math.abs(sumOfItemPrices - Number(totalAmount)) < 0.01 && items.every(item => item.name.trim() && Number(item.price) > 0 && item.sharedBy.length > 0);
    }
    return false;
  }, [description, totalAmount, category, paidBy, splitMethod, selectedPeopleEqual, unequalShares, items]);

  const remainingAmountUnequal = useMemo(() => {
    if (splitMethod !== 'unequal' || totalAmount === '') return 0;
    const sumOfShares = Object.values(unequalShares).reduce((sum, share) => sum + (Number(share) || 0), 0);
    return Number(totalAmount) - sumOfShares;
  }, [totalAmount, unequalShares, splitMethod]);

  const sumOfItemPrices = useMemo(() => {
    if (splitMethod !== 'itemwise') return 0;
    return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [items, splitMethod]);


  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', price: '' as any, sharedBy: [] }]);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleItemChange = (itemId: string, field: keyof Item, value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const handleItemSharedByChange = (itemId: string, personId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const newSharedBy = item.sharedBy.includes(personId)
          ? item.sharedBy.filter(id => id !== personId)
          : [...item.sharedBy, personId];
        return { ...item, sharedBy: newSharedBy };
      }
      return item;
    }));
  };

  const resetForm = () => {
    setDescription('');
    setTotalAmount('');
    setCategory('');
    setPaidBy('');
    setSelectedPeopleEqual([]);
    setUnequalShares({});
    setItems([{ id: Date.now().toString(), name: '', price: '' as any, sharedBy: [] }]);
    // setSplitMethod('equal'); // Optionally reset split method
  };

  const handleSubmitExpense = async () => {
    if (!isFormValid || !db || firebaseInitializationError) {
        if (firebaseInitializationError){
             toast({ title: "Error", description: "Cannot add expense due to Firebase configuration issue.", variant: "destructive" });
        }
        return;
    }

    let shares: { personId: string, amount: number }[] = [];

    if (splitMethod === 'equal') {
      const amountPerPerson = Number(totalAmount) / selectedPeopleEqual.length;
      shares = selectedPeopleEqual.map(personId => ({ personId, amount: amountPerPerson }));
    } else if (splitMethod === 'unequal') {
      shares = Object.entries(unequalShares)
        .filter(([_, amount]) => Number(amount) > 0)
        .map(([personId, amount]) => ({ personId, amount: Number(amount) }));
    } else if (splitMethod === 'itemwise') {
      const personOwes: Record<string, number> = {};
      items.forEach(item => {
        if (item.sharedBy.length > 0) {
          const amountPerPersonForItem = Number(item.price) / item.sharedBy.length;
          item.sharedBy.forEach(personId => {
            personOwes[personId] = (personOwes[personId] || 0) + amountPerPersonForItem;
          });
        }
      });
      shares = Object.entries(personOwes).map(([personId, amount]) => ({ personId, amount }));
    }

    const expenseData: Omit<Expense, 'id' | 'createdAt'> = {
      description,
      totalAmount: Number(totalAmount),
      category,
      paidBy,
      splitMethod,
      shares,
      createdAt: serverTimestamp() as Timestamp, // Cast for type consistency pre-server
    };
    if (splitMethod === 'itemwise') {
      expenseData.items = items.map(item => ({ ...item, price: Number(item.price) }));
    }
    
    try {
      await addDoc(collection(db, EXPENSES_COLLECTION_PATH), expenseData);
      toast({ title: "Expense Added!", description: `${description} has been successfully recorded.` });
      resetForm();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({ title: "Error", description: "Could not add expense.", variant: "destructive" });
    }
  };
  

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl"><Users className="mr-2 h-6 w-6 text-primary" /> Manage People</CardTitle>
          <CardDescription>Add or view people in your settlement group.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="newPersonName" className="text-sm font-medium">Add New Person</Label>
            <div className="flex space-x-2 mt-1">
              <Input
                id="newPersonName"
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Enter person's name"
                className="flex-grow"
              />
              <Button onClick={handleAddPerson} disabled={!newPersonName.trim() || !!firebaseInitializationError}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-muted-foreground">Current People:</h4>
            {people.length > 0 ? (
              <ScrollArea className="h-24 rounded-md border p-2">
                <ul className="space-y-1">
                  {people.map(person => (
                    <li key={person.id} className="text-sm p-1 bg-secondary/30 rounded-sm">{person.name}</li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">No people added yet. Add some to get started!</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl"><CreditCard className="mr-2 h-6 w-6 text-primary" /> Add New Expense</CardTitle>
          <CardDescription>Fill in the details of the expense and how it was split.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Fields */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Dinner with friends" className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input id="totalAmount" type="number" value={totalAmount} onChange={(e) => setTotalAmount(parseFloat(e.target.value) || '')} placeholder="e.g., 1000" className="mt-1" />
            </div>
             <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="w-full mt-1">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => {
                    const IconComponent = cat.icon;
                    return (<SelectItem key={cat.name} value={cat.name}>
                      <div className="flex items-center">
                        <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" /> {cat.name}
                      </div>
                    </SelectItem>)
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="paidBy">Paid by</Label>
            <Select value={paidBy} onValueChange={setPaidBy} disabled={people.length === 0}>
              <SelectTrigger id="paidBy" className="w-full mt-1">
                <SelectValue placeholder={people.length === 0 ? "Add people first" : "Select who paid"} />
              </SelectTrigger>
              <SelectContent>
                {people.map(person => (
                  <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split Method Selector */}
          <div>
            <Label>Split Method</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Button variant={splitMethod === 'equal' ? 'default' : 'outline'} onClick={() => setSplitMethod('equal')}>Equal</Button>
              <Button variant={splitMethod === 'unequal' ? 'default' : 'outline'} onClick={() => setSplitMethod('unequal')}>Unequal</Button>
              <Button variant={splitMethod === 'itemwise' ? 'default' : 'outline'} onClick={() => setSplitMethod('itemwise')}>Item-wise</Button>
            </div>
          </div>

          {/* Dynamic Split UI */}
          {totalAmount > 0 && people.length > 0 && (
            <>
            {splitMethod === 'equal' && (
              <div className="space-y-2 p-4 border rounded-md bg-secondary/20">
                <h4 className="font-semibold">Select who shared:</h4>
                {people.map(person => (
                  <div key={person.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equal-${person.id}`}
                      checked={selectedPeopleEqual.includes(person.id)}
                      onCheckedChange={(checked) => {
                        setSelectedPeopleEqual(prev => 
                          checked ? [...prev, person.id] : prev.filter(id => id !== person.id)
                        );
                      }}
                    />
                    <Label htmlFor={`equal-${person.id}`} className="font-normal">{person.name}</Label>
                  </div>
                ))}
              </div>
            )}

            {splitMethod === 'unequal' && (
              <div className="space-y-3 p-4 border rounded-md bg-secondary/20">
                <h4 className="font-semibold">Enter individual shares:</h4>
                {people.map(person => (
                  <div key={person.id} className="flex items-center justify-between space-x-2">
                    <Label htmlFor={`unequal-${person.id}`} className="min-w-[80px]">{person.name}</Label>
                    <Input
                      id={`unequal-${person.id}`}
                      type="number"
                      value={unequalShares[person.id] || ''}
                      onChange={(e) => setUnequalShares(prev => ({ ...prev, [person.id]: parseFloat(e.target.value) || '' }))}
                      placeholder="Amount"
                      className="w-1/2"
                    />
                  </div>
                ))}
                <div className={`text-sm font-medium p-2 rounded-md ${remainingAmountUnequal === 0 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                  Remaining: {formatCurrency(remainingAmountUnequal)}
                </div>
              </div>
            )}

            {splitMethod === 'itemwise' && (
              <div className="space-y-4 p-4 border rounded-md bg-secondary/20">
                <h4 className="font-semibold">Add items and assign shares:</h4>
                {items.map((item, index) => (
                  <Card key={item.id} className="p-3 bg-card/80 shadow-sm">
                    <div className="space-y-2">
                       <div className="flex justify-between items-center mb-2">
                         <p className="font-medium text-sm">Item #{index + 1}</p>
                         {items.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-6 w-6 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                       </div>
                      <Input 
                        value={item.name} 
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} 
                        placeholder="Item name (e.g., Pizza)" 
                        className="text-sm"
                      />
                      <Input 
                        type="number" 
                        value={item.price} 
                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value) || '')} 
                        placeholder="Item price" 
                        className="text-sm"
                      />
                      <div className="space-y-1 pt-1">
                        <p className="text-xs text-muted-foreground">Shared by:</p>
                        <div className="grid grid-cols-2 gap-1">
                          {people.map(person => (
                            <div key={person.id} className="flex items-center space-x-1">
                              <Checkbox
                                id={`item-${item.id}-person-${person.id}`}
                                checked={item.sharedBy.includes(person.id)}
                                onCheckedChange={() => handleItemSharedByChange(item.id, person.id)}
                                className="h-3 w-3"
                              />
                              <Label htmlFor={`item-${item.id}-person-${person.id}`} className="text-xs font-normal">{person.name}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={handleAddItem} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                </Button>
                <div className={`text-sm font-medium p-2 rounded-md ${Math.abs(sumOfItemPrices - Number(totalAmount)) < 0.01 ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                  Sum of item prices: {formatCurrency(sumOfItemPrices)} (Total: {formatCurrency(Number(totalAmount))})
                </div>
              </div>
            )}
            </>
          )}

        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmitExpense} disabled={!isFormValid || !!firebaseInitializationError} className="w-full text-lg py-3">
            Add Expense
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// --- DashboardTab Component ---
interface DashboardTabProps {
  expenses: Expense[];
  people: Person[];
  peopleMap: Record<string, string>;
}

function DashboardTab({ expenses, people, peopleMap }: DashboardTabProps) {
  const settlement = useMemo(() => {
    if (people.length === 0 || expenses.length === 0) return [];

    const balances: Record<string, number> = {};
    people.forEach(p => balances[p.id] = 0);

    expenses.forEach(expense => {
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.totalAmount;
      expense.shares.forEach(share => {
        balances[share.personId] = (balances[share.personId] || 0) - share.amount;
      });
    });

    const debtors = Object.entries(balances).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: bal }));
    const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal }));
    
    debtors.sort((a, b) => a.amount - b.amount); // Most negative first
    creditors.sort((a, b) => b.amount - a.amount); // Most positive first

    const transactions: { from: string, to: string, amount: number }[] = [];
    let debtorIdx = 0;
    let creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];
      const amountToSettle = Math.min(-debtor.amount, creditor.amount);

      if (amountToSettle > 0.01) { // Avoid tiny transactions
          transactions.push({ from: debtor.id, to: creditor.id, amount: amountToSettle });
          debtor.amount += amountToSettle;
          creditor.amount -= amountToSettle;
      }

      if (Math.abs(debtor.amount) < 0.01) debtorIdx++;
      if (Math.abs(creditor.amount) < 0.01) creditorIdx++;
    }
    return transactions;
  }, [expenses, people]);

  const expensesByPayer = useMemo(() => {
    const data: Record<string, number> = {};
    people.forEach(p => data[p.name] = 0);
    expenses.forEach(exp => {
      const payerName = peopleMap[exp.paidBy];
      if (payerName) {
        data[payerName] = (data[payerName] || 0) + exp.totalAmount;
      }
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount })).filter(d => d.amount > 0);
  }, [expenses, peopleMap, people]);

  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    CATEGORIES.forEach(c => data[c.name] = 0);
    expenses.forEach(exp => {
      data[exp.category] = (data[exp.category] || 0) + exp.totalAmount;
    });
    return Object.entries(data).map(([name, amount]) => ({ name, amount })).filter(d => d.amount > 0);
  }, [expenses]);

  if (firebaseInitializationError && people.length === 0 && expenses.length === 0) {
    // This message is handled by the main SettleEaseApp component if firebaseInitializationError is set.
    // So, this specific block in DashboardTab might not be strictly necessary if the parent handles it.
    // However, keeping a fallback or context-specific message can be useful.
    return (
      <Card className="text-center py-12 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-destructive flex items-center justify-center">
             <AlertTriangle className="mr-2 h-8 w-8" />Firebase Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg text-muted-foreground">Cannot display dashboard due to Firebase configuration issues.</p>
          <p className="text-sm p-2 bg-destructive/10 rounded-md">{firebaseInitializationError}</p>
        </CardContent>
      </Card>
    );
  }


  if (people.length === 0 && expenses.length === 0) {
     return (
      <Card className="text-center py-12 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-primary">Welcome to SettleEase!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileText className="mx-auto h-16 w-16 text-primary/70" />
          <p className="text-lg text-muted-foreground">No expenses recorded yet.</p>
          <p>Go to the "Add Expense" tab to start managing your group finances.</p>
           {currentUser ? null : <p className="text-sm text-amber-600 mt-2">Note: You are currently not signed in. Data might be limited or temporary.</p>}
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl"><ArrowRight className="mr-2 h-6 w-6 text-primary" /> Settlement Summary</CardTitle>
          <CardDescription>Minimum transactions required to settle all debts.</CardDescription>
        </CardHeader>
        <CardContent>
          {settlement.length > 0 ? (
            <ul className="space-y-2">
              {settlement.map((txn, i) => (
                <li key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md text-sm">
                  <span className="font-medium">{peopleMap[txn.from] || 'Unknown'}</span>
                  <ArrowRight className="h-4 w-4 text-accent mx-2" />
                  <span className="font-medium">{peopleMap[txn.to] || 'Unknown'}</span>
                  <span className="ml-auto font-semibold text-primary">{formatCurrency(txn.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">All debts are settled, or no expenses to settle yet!</p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Expenses by Payer</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {expensesByPayer.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expensesByPayer} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center">No data for payer chart.</p>)}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expensesByCategory.map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}/>
                  <Legend wrapperStyle={{fontSize: "12px"}}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (<p className="text-muted-foreground h-full flex items-center justify-center">No data for category chart.</p>)}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl"><FileText className="mr-2 h-6 w-6 text-primary" /> Expense Log</CardTitle>
          <CardDescription>A list of all recorded expenses, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ScrollArea className="h-[400px] pr-3">
            <ul className="space-y-4">
              {expenses.map(expense => {
                 const CategoryIcon = CATEGORIES.find(c => c.name === expense.category)?.icon || Settings2;
                 return (
                  <li key={expense.id}>
                    <Card className="bg-card/70 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2 pt-4 px-4">
                         <div className="flex justify-between items-start">
                            <CardTitle className="text-md font-semibold leading-tight">{expense.description}</CardTitle>
                            <span className="text-lg font-bold text-primary">{formatCurrency(expense.totalAmount)}</span>
                         </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 text-xs text-muted-foreground space-y-1">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center">
                               <CategoryIcon className="mr-1.5 h-3.5 w-3.5" /> {expense.category}
                            </div>
                            <span>Paid by: <span className="font-medium text-foreground">{peopleMap[expense.paidBy] || 'Unknown'}</span></span>
                         </div>
                         <p>Date: {expense.createdAt?.toDate().toLocaleDateString() || 'N/A'}</p>
                      </CardContent>
                    </Card>
                  </li>
                )})}
            </ul>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground">No expenses recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

