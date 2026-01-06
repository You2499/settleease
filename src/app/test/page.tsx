"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient, type SupabaseClient, type AuthChangeEvent, type Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import TestLabPage from "@/components/settleease/test/TestLabPage";
import type {
    Person,
    Expense,
    SettlementPayment,
    ManualSettlementOverride,
} from "@/lib/settleease/types";
import {
    PEOPLE_TABLE,
    EXPENSES_TABLE,
    SETTLEMENT_PAYMENTS_TABLE,
    MANUAL_SETTLEMENT_OVERRIDES_TABLE,
    supabaseUrl,
    supabaseAnonKey,
} from "@/lib/settleease/constants";

export default function TestPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [db, setDb] = useState<SupabaseClient | null>(null);

    // Real data state
    const [people, setPeople] = useState<Person[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [settlementPayments, setSettlementPayments] = useState<SettlementPayment[]>([]);
    const [manualOverrides, setManualOverrides] = useState<ManualSettlementOverride[]>([]);
    const [peopleMap, setPeopleMap] = useState<Record<string, string>>({});

    // Initialize Supabase client
    useEffect(() => {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        setDb(supabase);

        // Check auth state
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsAuthenticated(!!user);
            setIsLoading(false);

            if (user) {
                // Fetch real data
                await fetchData(supabase);
            }
        };

        checkAuth();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                setIsAuthenticated(!!session?.user);
                if (session?.user) {
                    await fetchData(supabase);
                } else {
                    // Clear data on logout
                    setPeople([]);
                    setExpenses([]);
                    setSettlementPayments([]);
                    setManualOverrides([]);
                    setPeopleMap({});
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchData = useCallback(async (supabase: SupabaseClient) => {
        try {
            // Fetch people
            const { data: peopleData } = await supabase
                .from(PEOPLE_TABLE)
                .select("*")
                .order("name");

            if (peopleData) {
                setPeople(peopleData as Person[]);
                const map: Record<string, string> = {};
                peopleData.forEach((p: Person) => {
                    map[p.id] = p.name;
                });
                setPeopleMap(map);
            }

            // Fetch expenses
            const { data: expensesData } = await supabase
                .from(EXPENSES_TABLE)
                .select("*")
                .order("created_at", { ascending: false });

            if (expensesData) {
                setExpenses(expensesData as Expense[]);
            }

            // Fetch settlement payments
            const { data: settlementsData } = await supabase
                .from(SETTLEMENT_PAYMENTS_TABLE)
                .select("*");

            if (settlementsData) {
                setSettlementPayments(settlementsData as SettlementPayment[]);
            }

            // Fetch manual overrides
            const { data: overridesData } = await supabase
                .from(MANUAL_SETTLEMENT_OVERRIDES_TABLE)
                .select("*");

            if (overridesData) {
                setManualOverrides(overridesData as ManualSettlementOverride[]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to App
                        </Button>
                    </Link>

                    <div className="flex items-center gap-2">
                        {isAuthenticated ? (
                            <span className="text-sm text-green-600 font-medium">
                                ✓ Signed in (Real data available)
                            </span>
                        ) : (
                            <Link href="/">
                                <Button variant="outline" size="sm">
                                    <LogIn className="h-4 w-4 mr-2" />
                                    Sign in for Real Data
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main>
                <TestLabPage
                    realPeople={isAuthenticated ? people : undefined}
                    realExpenses={isAuthenticated ? expenses : undefined}
                    realSettlements={isAuthenticated ? settlementPayments : undefined}
                    realOverrides={isAuthenticated ? manualOverrides : undefined}
                    realPeopleMap={isAuthenticated ? peopleMap : undefined}
                />
            </main>

            {/* Footer */}
            <footer className="border-t py-4 mt-8">
                <div className="container max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p>
                        SettleEase Test Lab - Verification Suite
                    </p>
                    <p className="mt-1">
                        {isAuthenticated
                            ? `Testing with ${people.length} people, ${expenses.length} expenses, ${settlementPayments.length} settlements`
                            : "Testing with predefined scenarios only (sign in for real data)"}
                    </p>
                </div>
            </footer>
        </div>
    );
}
