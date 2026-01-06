/**
 * Bug Finding Tests for Settlement Calculations
 * 
 * These tests specifically target edge cases that could cause 
 * incorrect settlement displays:
 * 
 * 1. Person IDs in expenses not matching people array
 * 2. Settlement payments between people not in expenses
 * 3. exclude_from_settlement inconsistencies
 * 4. Balance drift from partial payments
 */

import { describe, it, expect } from "vitest";
import {
    calculateNetBalances,
    calculateSimplifiedTransactions,
    calculatePairwiseTransactions,
} from "../settlementCalculations";
import type { Person, Expense, SettlementPayment, ManualSettlementOverride } from "../types";

// =============================================================================
// BUG #1: ORPHANED PERSON IDS IN EXPENSES
// =============================================================================

describe("BUG: Orphaned Person IDs", () => {
    const registeredPeople: Person[] = [
        { id: "alice", name: "Alice" },
        { id: "bob", name: "Bob" },
    ];

    it("should handle expense with payer NOT in people array", () => {
        // This could happen if a person was deleted but their expenses remain
        const expense: Expense = {
            id: "exp-1",
            description: "Test",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "charlie", amount: 100 }], // Charlie not registered!
            split_method: "equal",
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "bob", amount: 50 },
            ],
        };

        const result = calculateNetBalances(registeredPeople, [expense], []);

        // BUG CHECK: What happens to Charlie's +100?
        // It should probably raise an error or be handled gracefully
        console.log("Orphaned payer result:", result);

        // Current behavior: Charlie's balance is tracked but not in result
        // Alice and Bob are debited but no one is credited in the people array
        expect(result["alice"]).toBe(-50);
        expect(result["bob"]).toBe(-50);

        // POTENTIAL BUG: The sum of balances should be 0, but it's -100
        const sum = Object.values(result).reduce((a, b) => a + b, 0);
        console.log("Balance sum (should be 0):", sum);
        expect(sum).toBeCloseTo(0, 2); // THIS WILL FAIL IF BUG EXISTS
    });

    it("should handle expense with sharer NOT in people array", () => {
        const expense: Expense = {
            id: "exp-1",
            description: "Test",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "alice", amount: 100 }],
            split_method: "equal",
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "charlie", amount: 50 }, // Charlie not registered!
            ],
        };

        const result = calculateNetBalances(registeredPeople, [expense], []);

        console.log("Orphaned sharer result:", result);

        // Alice paid 100, owes 50 = +50
        // Charlie owes 50 but isn't in people array
        expect(result["alice"]).toBe(50);

        // POTENTIAL BUG: Balance sum should be 0
        const sum = Object.values(result).reduce((a, b) => a + b, 0);
        console.log("Balance sum (should be 0):", sum);
        expect(sum).toBeCloseTo(0, 2); // THIS WILL FAIL IF BUG EXISTS
    });
});

// =============================================================================
// BUG #2: SETTLEMENT PAYMENTS WITH UNKNOWN PARTIES
// =============================================================================

describe("BUG: Settlement Payments with Unknown Parties", () => {
    const people: Person[] = [
        { id: "alice", name: "Alice" },
        { id: "bob", name: "Bob" },
    ];

    const expense: Expense = {
        id: "exp-1",
        description: "Dinner",
        total_amount: 100,
        category: "Food",
        paid_by: [{ personId: "alice", amount: 100 }],
        split_method: "equal",
        shares: [
            { personId: "alice", amount: 50 },
            { personId: "bob", amount: 50 },
        ],
    };

    it("should handle settlement from unknown debtor", () => {
        const settlement: SettlementPayment = {
            id: "settle-1",
            debtor_id: "charlie", // Not in people!
            creditor_id: "alice",
            amount_settled: 50,
            settled_at: "2026-01-01T00:00:00Z",
            marked_by_user_id: "user-1",
        };

        // Initial: Alice +50, Bob -50
        // Settlement: Charlie->Alice 50 (but Charlie not tracked)
        const result = calculateNetBalances(people, [expense], [settlement]);

        console.log("Settlement from unknown debtor:", result);

        // Alice should have +50 - 50 = 0 (receives settlement)
        // But Charlie's +50 isn't tracked
        expect(result["alice"]).toBe(0);
        expect(result["bob"]).toBe(-50);

        // POTENTIAL BUG: Sum should still be 0
        const sum = Object.values(result).reduce((a, b) => a + b, 0);
        console.log("Balance sum:", sum);
    });

    it("should handle settlement to unknown creditor", () => {
        const settlement: SettlementPayment = {
            id: "settle-1",
            debtor_id: "bob",
            creditor_id: "charlie", // Not in people!
            amount_settled: 50,
            settled_at: "2026-01-01T00:00:00Z",
            marked_by_user_id: "user-1",
        };

        const result = calculateNetBalances(people, [expense], [settlement]);

        console.log("Settlement to unknown creditor:", result);

        // Bob: -50 + 50 (paid settlement) = 0
        // But Charlie's -50 isn't tracked
        expect(result["bob"]).toBe(0);
        expect(result["alice"]).toBe(50);
    });
});

// =============================================================================  
// BUG #3: SIMPLIFIED TRANSACTIONS NOT MATCHING EXPECTED AMOUNTS
// =============================================================================

describe("BUG: Simplified Transaction Amount Verification", () => {
    it("should produce transactions that exactly settle all debts", () => {
        const people: Person[] = [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
            { id: "c", name: "C" },
            { id: "d", name: "D" },
        ];

        // Complex scenario: A pays for everyone multiple times
        const expenses: Expense[] = [
            {
                id: "exp-1",
                description: "Dinner 1",
                total_amount: 400,
                category: "Food",
                paid_by: [{ personId: "a", amount: 400 }],
                split_method: "equal",
                shares: [
                    { personId: "a", amount: 100 },
                    { personId: "b", amount: 100 },
                    { personId: "c", amount: 100 },
                    { personId: "d", amount: 100 },
                ],
            },
            {
                id: "exp-2",
                description: "Dinner 2",
                total_amount: 200,
                category: "Food",
                paid_by: [{ personId: "b", amount: 200 }],
                split_method: "equal",
                shares: [
                    { personId: "a", amount: 50 },
                    { personId: "b", amount: 50 },
                    { personId: "c", amount: 50 },
                    { personId: "d", amount: 50 },
                ],
            },
        ];

        const balances = calculateNetBalances(people, expenses, []);
        const transactions = calculateSimplifiedTransactions(people, expenses, []);

        console.log("Initial balances:", balances);
        console.log("Simplified transactions:", transactions);

        // Apply all transactions
        const finalBalances = { ...balances };
        transactions.forEach(t => {
            finalBalances[t.from] += t.amount;
            finalBalances[t.to] -= t.amount;
        });

        console.log("Final balances after transactions:", finalBalances);

        // All balances should be ~0
        Object.entries(finalBalances).forEach(([id, balance]) => {
            expect(Math.abs(balance)).toBeLessThan(0.02);
        });
    });

    it("should handle complex multi-payer scenario", () => {
        const people: Person[] = [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
            { id: "c", name: "C" },
        ];

        // A and B both pay for C
        const expenses: Expense[] = [
            {
                id: "exp-1",
                description: "Test",
                total_amount: 300,
                category: "Food",
                paid_by: [
                    { personId: "a", amount: 200 },
                    { personId: "b", amount: 100 },
                ],
                split_method: "equal",
                shares: [
                    { personId: "a", amount: 100 },
                    { personId: "b", amount: 100 },
                    { personId: "c", amount: 100 },
                ],
            },
        ];

        // Expected:
        // A: paid 200, owes 100 = +100
        // B: paid 100, owes 100 = 0
        // C: paid 0, owes 100 = -100
        // 
        // Simplified: C should pay A 100

        const balances = calculateNetBalances(people, expenses, []);
        console.log("Multi-payer balances:", balances);

        expect(balances["a"]).toBe(100);
        expect(balances["b"]).toBe(0);
        expect(balances["c"]).toBe(-100);

        const transactions = calculateSimplifiedTransactions(people, expenses, []);
        console.log("Multi-payer transactions:", transactions);

        expect(transactions.length).toBe(1);
        expect(transactions[0].from).toBe("c");
        expect(transactions[0].to).toBe("a");
        expect(transactions[0].amount).toBe(100);
    });
});

// =============================================================================
// BUG #4: MANUAL OVERRIDE EDGE CASES
// =============================================================================

describe("BUG: Manual Override Edge Cases", () => {
    const people: Person[] = [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
    ];

    const expense: Expense = {
        id: "exp-1",
        description: "Test",
        total_amount: 300,
        category: "Food",
        paid_by: [{ personId: "a", amount: 300 }],
        split_method: "equal",
        shares: [
            { personId: "a", amount: 100 },
            { personId: "b", amount: 100 },
            { personId: "c", amount: 100 },
        ],
    };

    it("should correctly apply override when debtor owes less than override amount", () => {
        // A: +200, B: -100, C: -100
        // Override says B should pay A 500 (but B only owes 100)
        const override: ManualSettlementOverride = {
            id: "override-1",
            debtor_id: "b",
            creditor_id: "a",
            amount: 500, // More than B owes!
            is_active: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
        };

        const transactions = calculateSimplifiedTransactions(
            people,
            [expense],
            [],
            [override]
        );

        console.log("Override exceeds debt:", transactions);

        // Should cap at what B actually owes (100)
        const bPayments = transactions.filter(t => t.from === "b");
        const totalFromB = bPayments.reduce((sum, t) => sum + t.amount, 0);

        expect(totalFromB).toBeLessThanOrEqual(100);
    });

    it("should correctly apply override when creditor is owed less than override", () => {
        // Scenario: A paid 150, B paid 150 (shared equally)
        // A: +50, B: +50, C: -100
        const expense2: Expense = {
            ...expense,
            paid_by: [
                { personId: "a", amount: 150 },
                { personId: "b", amount: 150 },
            ],
        };

        // Override says C should pay A 200 (but A is only owed 50)
        const override: ManualSettlementOverride = {
            id: "override-1",
            debtor_id: "c",
            creditor_id: "a",
            amount: 200,
            is_active: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
        };

        const balances = calculateNetBalances(people, [expense2], []);
        console.log("Balances:", balances);

        const transactions = calculateSimplifiedTransactions(
            people,
            [expense2],
            [],
            [override]
        );

        console.log("Override exceeds credit:", transactions);

        // C->A should be capped at 50 (what A is owed)
        const cToA = transactions.find(t => t.from === "c" && t.to === "a");
        if (cToA) {
            expect(cToA.amount).toBeLessThanOrEqual(50);
        }
    });
});

// =============================================================================
// BUG #5: FLOATING POINT PRECISION ISSUES
// =============================================================================

describe("BUG: Floating Point Precision", () => {
    it("should handle repeating decimals correctly", () => {
        const people: Person[] = [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
            { id: "c", name: "C" },
        ];

        // 100 / 3 = 33.333...
        const expense: Expense = {
            id: "exp-1",
            description: "Test",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "a", amount: 100 }],
            split_method: "equal",
            shares: [
                { personId: "a", amount: 33.33 },
                { personId: "b", amount: 33.33 },
                { personId: "c", amount: 33.34 }, // Rounding adjustment
            ],
        };

        const balances = calculateNetBalances(people, [expense], []);

        // Sum should be exactly 0 (or very close)
        const sum = Object.values(balances).reduce((a, b) => a + b, 0);
        console.log("Repeating decimal balances:", balances, "Sum:", sum);

        expect(Math.abs(sum)).toBeLessThan(0.01);
    });

    it("should handle many small transactions without drift", () => {
        const people: Person[] = [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
        ];

        // Create 100 small expenses
        const expenses: Expense[] = [];
        for (let i = 0; i < 100; i++) {
            expenses.push({
                id: `exp-${i}`,
                description: `Small expense ${i}`,
                total_amount: 1.11,
                category: "Food",
                paid_by: [{ personId: i % 2 === 0 ? "a" : "b", amount: 1.11 }],
                split_method: "equal",
                shares: [
                    { personId: "a", amount: 0.555 },
                    { personId: "b", amount: 0.555 },
                ],
            });
        }

        const balances = calculateNetBalances(people, expenses, []);

        // With 100 expenses, 50 paid by A, 50 by B
        // Each pays 1.11, each owes 0.555 per expense
        // A: pays 50*1.11 = 55.5, owes 100*0.555 = 55.5 => 0
        // B: pays 50*1.11 = 55.5, owes 100*0.555 = 55.5 => 0

        console.log("Many transactions balances:", balances);

        // Should both be close to 0
        expect(Math.abs(balances["a"])).toBeLessThan(0.1);
        expect(Math.abs(balances["b"])).toBeLessThan(0.1);
    });
});
