/**
 * Unit Tests for Settlement Calculations
 * 
 * Tests the three core functions:
 * - calculateNetBalances
 * - calculateSimplifiedTransactions
 * - calculatePairwiseTransactions
 */

import { describe, it, expect } from "vitest";
import {
    calculateNetBalances,
    calculateSimplifiedTransactions,
    calculatePairwiseTransactions,
} from "../settlementCalculations";
import {
    people,
    singlePerson,
    emptyPeople,
    simpleExpenseEqualSplit,
    unequalSplitExpense,
    multiPayerExpense,
    celebrationExpense,
    excludedExpense,
    itemwiseExpense,
    settlementPayment1,
    settlementPayment2,
    emptySettlements,
    activeManualOverride,
    inactiveManualOverride,
    circularDebtExpenses,
    zeroAmountExpense,
    expenseWithEmptyPaidBy,
    expenseWithEmptyShares,
    tinyAmountExpense,
    largeAmountExpense,
    tripExpenses,
    tripSettlements,
} from "./settlementCalculations.fixtures";

// =============================================================================
// calculateNetBalances TESTS
// =============================================================================

describe("calculateNetBalances", () => {
    describe("empty and edge cases", () => {
        it("should return empty object for empty people array", () => {
            const result = calculateNetBalances(emptyPeople, [], emptySettlements);
            expect(result).toEqual({});
        });

        it("should return zero balances when no expenses", () => {
            const result = calculateNetBalances(people, [], emptySettlements);
            expect(result["person-a"]).toBe(0);
            expect(result["person-b"]).toBe(0);
            expect(result["person-c"]).toBe(0);
            expect(result["person-d"]).toBe(0);
        });

        it("should handle zero amount expense", () => {
            const result = calculateNetBalances(people, [zeroAmountExpense], emptySettlements);
            expect(result["person-a"]).toBe(0);
            expect(result["person-b"]).toBe(0);
        });

        it("should handle expense with empty paid_by array", () => {
            // Should only debit shares, no credits
            const result = calculateNetBalances(people, [expenseWithEmptyPaidBy], emptySettlements);
            expect(result["person-a"]).toBe(-50);
            expect(result["person-b"]).toBe(-50);
        });

        it("should handle expense with empty shares array", () => {
            // Should only credit payer, no debits
            const result = calculateNetBalances(people, [expenseWithEmptyShares], emptySettlements);
            expect(result["person-a"]).toBe(100);
        });

        it("should handle very small amounts", () => {
            const result = calculateNetBalances(people, [tinyAmountExpense], emptySettlements);
            expect(result["person-a"]).toBeCloseTo(0.0005, 4);
            expect(result["person-b"]).toBeCloseTo(-0.0005, 4);
        });

        it("should handle large amounts without precision loss", () => {
            const result = calculateNetBalances(people, [largeAmountExpense], emptySettlements);
            // Alice paid 999999.99, owes 333333.33 = +666666.66
            expect(result["person-a"]).toBeCloseTo(666666.66, 2);
            expect(result["person-b"]).toBeCloseTo(-333333.33, 2);
            expect(result["person-c"]).toBeCloseTo(-333333.33, 2);
        });
    });

    describe("simple expense calculations", () => {
        it("should calculate correct balances for simple equal split", () => {
            const result = calculateNetBalances(people, [simpleExpenseEqualSplit], emptySettlements);
            // Alice paid 100, owes 50 = +50
            // Bob paid 0, owes 50 = -50
            expect(result["person-a"]).toBe(50);
            expect(result["person-b"]).toBe(-50);
            expect(result["person-c"]).toBe(0);
            expect(result["person-d"]).toBe(0);
        });

        it("should calculate correct balances for unequal split", () => {
            const result = calculateNetBalances(people, [unequalSplitExpense], emptySettlements);
            // Bob paid 150, owes 50 = +100
            // Alice paid 0, owes 100 = -100
            expect(result["person-a"]).toBe(-100);
            expect(result["person-b"]).toBe(100);
        });
    });

    describe("multi-payer expense calculations", () => {
        it("should calculate correct balances for multi-payer expense", () => {
            const result = calculateNetBalances(people, [multiPayerExpense], emptySettlements);
            // Alice: paid 60 - owes 33.33 = +26.67
            // Bob: paid 40 - owes 33.33 = +6.67
            // Charlie: paid 0 - owes 33.34 = -33.34
            expect(result["person-a"]).toBeCloseTo(26.67, 2);
            expect(result["person-b"]).toBeCloseTo(6.67, 2);
            expect(result["person-c"]).toBeCloseTo(-33.34, 2);
        });
    });

    describe("celebration contribution calculations", () => {
        it("should include celebration contribution in balance calculation", () => {
            const result = calculateNetBalances(people, [celebrationExpense], emptySettlements);
            // Alice: paid 200 - owes 50 (share) - 50 (celebration) = +100
            // Bob: owes 50 = -50
            // Charlie: owes 50 = -50
            expect(result["person-a"]).toBe(100);
            expect(result["person-b"]).toBe(-50);
            expect(result["person-c"]).toBe(-50);
        });
    });

    describe("exclude_from_settlement flag", () => {
        it("should not include excluded expenses in balance calculation", () => {
            const result = calculateNetBalances(people, [excludedExpense], emptySettlements);
            expect(result["person-a"]).toBe(0);
            expect(result["person-b"]).toBe(0);
        });

        it("should only count non-excluded expenses when mixed", () => {
            const result = calculateNetBalances(
                people,
                [simpleExpenseEqualSplit, excludedExpense],
                emptySettlements
            );
            // Only simpleExpenseEqualSplit should count
            expect(result["person-a"]).toBe(50);
            expect(result["person-b"]).toBe(-50);
        });
    });

    describe("settlement payment adjustments", () => {
        it("should adjust balances for settlement payments", () => {
            // Start with simple expense: Alice +50, Bob -50
            // Then Bob pays Alice 50: Bob +50, Alice -50
            // Net: Alice 0, Bob 0
            const result = calculateNetBalances(
                people,
                [simpleExpenseEqualSplit],
                [settlementPayment1]
            );
            expect(result["person-a"]).toBe(0);
            expect(result["person-b"]).toBe(0);
        });

        it("should handle partial settlement", () => {
            // Start with simple expense: Alice +50, Bob -50
            // Bob pays Alice 25: only half settled
            const halfPayment = { ...settlementPayment1, amount_settled: 25 };
            const result = calculateNetBalances(
                people,
                [simpleExpenseEqualSplit],
                [halfPayment]
            );
            expect(result["person-a"]).toBe(25); // +50 - 25 from settlement received
            expect(result["person-b"]).toBe(-25);  // -50 + 25 from settlement made
        });

        it("should handle multiple settlement payments", () => {
            const result = calculateNetBalances(
                people,
                [simpleExpenseEqualSplit],
                [settlementPayment1, settlementPayment2]
            );
            // Initial: Alice +50, Bob -50, Charlie 0
            // After settlement1 (Bob→Alice 50): Bob +50, Alice -50 → Alice 0, Bob 0
            // After settlement2 (Charlie→Bob 30): Charlie +30, Bob -30 → Bob -30, Charlie +30
            // Wait - settlement adjustments: debtor gets +, creditor gets -
            // So net result: Alice 0, Bob -30 (got settled2), Charlie +30 (made settle2)
            // But Charlie started at 0, so: Charlie = 0 + 30 = 30 (received)
            // Bob = 0 - 30 = -30 (paid out to Charlie?)
            // Actually settlementPayment2: debtor=Charlie, creditor=Bob
            // So Charlie's balance += 30 (paid), Bob's balance -= 30 (received)
            // Net: Alice 0, Bob -30, Charlie +30
            expect(result["person-a"]).toBe(0);
            expect(result["person-b"]).toBe(-30);
            expect(result["person-c"]).toBe(30);
        });
    });

    describe("circular debt scenarios", () => {
        it("should calculate net zero for circular debts", () => {
            const result = calculateNetBalances(people, circularDebtExpenses, emptySettlements);
            // A→B 100, B→C 100, C→A 100 should net to zero
            expect(result["person-a"]).toBe(0);
            expect(result["person-b"]).toBe(0);
            expect(result["person-c"]).toBe(0);
        });
    });

    describe("conservation of money", () => {
        it("should ensure total balances sum to zero (conservation)", () => {
            const result = calculateNetBalances(people, tripExpenses, emptySettlements);
            const totalBalance = Object.values(result).reduce((sum, bal) => sum + bal, 0);
            expect(totalBalance).toBeCloseTo(0, 2);
        });

        it("should maintain conservation after settlements", () => {
            const result = calculateNetBalances(people, tripExpenses, tripSettlements);
            const totalBalance = Object.values(result).reduce((sum, bal) => sum + bal, 0);
            expect(totalBalance).toBeCloseTo(0, 2);
        });
    });
});

// =============================================================================
// calculateSimplifiedTransactions TESTS
// =============================================================================

describe("calculateSimplifiedTransactions", () => {
    describe("empty and balanced scenarios", () => {
        it("should return empty array for no people", () => {
            const result = calculateSimplifiedTransactions(emptyPeople, [], emptySettlements);
            expect(result).toEqual([]);
        });

        it("should return empty array when all balanced", () => {
            const result = calculateSimplifiedTransactions(people, [], emptySettlements);
            expect(result).toEqual([]);
        });

        it("should return empty array after circular debts (net zero)", () => {
            const result = calculateSimplifiedTransactions(people, circularDebtExpenses, emptySettlements);
            expect(result).toEqual([]);
        });
    });

    describe("simple debt scenarios", () => {
        it("should create single transaction for simple debt", () => {
            const result = calculateSimplifiedTransactions(
                people,
                [simpleExpenseEqualSplit],
                emptySettlements
            );
            expect(result).toHaveLength(1);
            expect(result[0].from).toBe("person-b");
            expect(result[0].to).toBe("person-a");
            expect(result[0].amount).toBe(50);
        });

        it("should handle unequal amounts", () => {
            const result = calculateSimplifiedTransactions(
                people,
                [unequalSplitExpense],
                emptySettlements
            );
            expect(result).toHaveLength(1);
            expect(result[0].from).toBe("person-a");
            expect(result[0].to).toBe("person-b");
            expect(result[0].amount).toBe(100);
        });
    });

    describe("multi-party debt simplification", () => {
        it("should minimize transactions for multi-party debts", () => {
            const result = calculateSimplifiedTransactions(
                people,
                [multiPayerExpense],
                emptySettlements
            );
            // Charlie owes ~33.34, should pay to Alice (~26.67) and Bob (~6.67)
            // Simplified: 1-2 transactions instead of many
            expect(result.length).toBeLessThanOrEqual(2);

            // Total amount transferred should equal what Charlie owes
            const totalTransferred = result.reduce((sum, t) => sum + t.amount, 0);
            expect(totalTransferred).toBeCloseTo(33.34, 2);
        });
    });

    describe("threshold behavior", () => {
        it("should not create transactions for amounts below 0.01", () => {
            // Create a scenario where balance is exactly 0.005
            const tinyExpense = {
                ...simpleExpenseEqualSplit,
                total_amount: 0.01,
                paid_by: [{ personId: "person-a", amount: 0.01 }],
                shares: [
                    { personId: "person-a", amount: 0.005 },
                    { personId: "person-b", amount: 0.005 },
                ],
            };
            const result = calculateSimplifiedTransactions(people, [tinyExpense], emptySettlements);
            // Amount of 0.005 should be below threshold
            expect(result).toEqual([]);
        });
    });

    describe("manual overrides", () => {
        it("should apply active manual overrides", () => {
            // Setup: Charlie owes, Diana is owed
            const expenses = [
                {
                    ...simpleExpenseEqualSplit,
                    id: "test-exp",
                    paid_by: [{ personId: "person-d", amount: 200 }],
                    shares: [
                        { personId: "person-c", amount: 100 },
                        { personId: "person-d", amount: 100 },
                    ],
                },
            ];

            const result = calculateSimplifiedTransactions(
                people,
                expenses,
                emptySettlements,
                [activeManualOverride]
            );

            // Should have Charlie → Diana transaction
            const charlieToD = result.find(t => t.from === "person-c" && t.to === "person-d");
            expect(charlieToD).toBeDefined();
        });

        it("should ignore inactive manual overrides", () => {
            const result = calculateSimplifiedTransactions(
                people,
                [simpleExpenseEqualSplit],
                emptySettlements,
                [inactiveManualOverride]
            );

            // Should use normal calculation, not override
            expect(result).toHaveLength(1);
            expect(result[0].from).toBe("person-b");
            expect(result[0].to).toBe("person-a");
        });
    });

    describe("full settlement scenarios", () => {
        it("should return empty when expenses fully settled", () => {
            const result = calculateSimplifiedTransactions(
                people,
                [simpleExpenseEqualSplit],
                [settlementPayment1]
            );
            // Bob owed Alice 50, paid 50 - fully settled
            expect(result).toEqual([]);
        });

        it("should return remaining amount after partial settlement", () => {
            const partialPayment = { ...settlementPayment1, amount_settled: 25 };
            const result = calculateSimplifiedTransactions(
                people,
                [simpleExpenseEqualSplit],
                [partialPayment]
            );

            expect(result).toHaveLength(1);
            expect(result[0].from).toBe("person-b");
            expect(result[0].to).toBe("person-a");
            expect(result[0].amount).toBe(25);
        });
    });

    describe("complex scenarios", () => {
        it("should correctly simplify trip expenses", () => {
            const result = calculateSimplifiedTransactions(
                people,
                tripExpenses,
                emptySettlements
            );

            // Verify total debts equal total credits
            const totalAmount = result.reduce((sum, t) => sum + t.amount, 0);

            // Calculate expected total debt
            const balances = calculateNetBalances(people, tripExpenses, emptySettlements);
            const totalDebt = Object.values(balances)
                .filter(b => b < 0)
                .reduce((sum, b) => sum + Math.abs(b), 0);

            expect(totalAmount).toBeCloseTo(totalDebt, 2);
        });
    });
});

// =============================================================================
// calculatePairwiseTransactions TESTS
// =============================================================================

describe("calculatePairwiseTransactions", () => {
    describe("empty scenarios", () => {
        it("should return empty array for no expenses", () => {
            const result = calculatePairwiseTransactions(people, [], emptySettlements);
            expect(result).toEqual([]);
        });

        it("should return empty array for zero amount expense", () => {
            const result = calculatePairwiseTransactions(people, [zeroAmountExpense], emptySettlements);
            expect(result).toEqual([]);
        });

        it("should return empty array for expense with empty paid_by", () => {
            const result = calculatePairwiseTransactions(people, [expenseWithEmptyPaidBy], emptySettlements);
            expect(result).toEqual([]);
        });
    });

    describe("simple pairwise calculations", () => {
        it("should create correct pairwise transaction for simple expense", () => {
            const result = calculatePairwiseTransactions(
                people,
                [simpleExpenseEqualSplit],
                emptySettlements
            );

            // Bob owes Alice 50 directly
            expect(result).toHaveLength(1);
            expect(result[0].from).toBe("person-b");
            expect(result[0].to).toBe("person-a");
            expect(result[0].amount).toBe(50);
        });

        it("should track contributing expense IDs", () => {
            const result = calculatePairwiseTransactions(
                people,
                [simpleExpenseEqualSplit],
                emptySettlements
            );

            expect(result[0].contributingExpenseIds).toContain("exp-simple-1");
        });
    });

    describe("multi-payer pairwise calculations", () => {
        it("should distribute debts proportionally among multiple payers", () => {
            const result = calculatePairwiseTransactions(
                people,
                [multiPayerExpense],
                emptySettlements
            );

            // Charlie owes 33.34 total
            // Alice paid 60% (60/100), Bob paid 40% (40/100)
            // So Charlie → Alice: 33.34 * 0.6 = 20.004
            // And Charlie → Bob: 33.34 * 0.4 = 13.336

            const charlieToAlice = result.find(t => t.from === "person-c" && t.to === "person-a");
            const charlieToBob = result.find(t => t.from === "person-c" && t.to === "person-b");

            expect(charlieToAlice).toBeDefined();
            expect(charlieToBob).toBeDefined();
            expect(charlieToAlice!.amount).toBeCloseTo(20, 0);
            expect(charlieToBob!.amount).toBeCloseTo(13.34, 0);
        });
    });

    describe("celebration contribution pairwise", () => {
        it("should include celebration contributions in pairwise calculations", () => {
            const result = calculatePairwiseTransactions(
                people,
                [celebrationExpense],
                emptySettlements
            );

            // Bob and Charlie each owe Alice 50
            // Alice also has celebration contribution of 50 (debited from her)
            const bobToAlice = result.find(t => t.from === "person-b" && t.to === "person-a");
            const charlieToAlice = result.find(t => t.from === "person-c" && t.to === "person-a");

            expect(bobToAlice).toBeDefined();
            expect(charlieToAlice).toBeDefined();
            expect(bobToAlice!.amount).toBe(50);
            expect(charlieToAlice!.amount).toBe(50);
        });
    });

    describe("self-payment exclusion", () => {
        it("should not create transaction when payer is also the only sharer", () => {
            const selfPayExpense = {
                ...simpleExpenseEqualSplit,
                shares: [{ personId: "person-a", amount: 100 }], // Only Alice shares
            };

            const result = calculatePairwiseTransactions(
                people,
                [selfPayExpense],
                emptySettlements
            );

            // Alice paid and Alice shares - no transaction needed
            expect(result).toEqual([]);
        });
    });

    describe("itemwise expense pairwise", () => {
        it("should calculate pairwise correctly for itemwise expenses", () => {
            const result = calculatePairwiseTransactions(
                people,
                [itemwiseExpense],
                emptySettlements
            );

            // Bob owes Alice 150, Charlie owes Alice 50
            const bobToAlice = result.find(t => t.from === "person-b" && t.to === "person-a");
            const charlieToAlice = result.find(t => t.from === "person-c" && t.to === "person-a");

            expect(bobToAlice).toBeDefined();
            expect(charlieToAlice).toBeDefined();
            expect(bobToAlice!.amount).toBe(150);
            expect(charlieToAlice!.amount).toBe(50);
        });
    });

    describe("multiple expenses aggregation", () => {
        it("should aggregate debts across multiple expenses", () => {
            const expenses = [
                simpleExpenseEqualSplit, // Bob → Alice 50
                {
                    ...simpleExpenseEqualSplit,
                    id: "exp-2",
                    total_amount: 60,
                    paid_by: [{ personId: "person-a", amount: 60 }],
                    shares: [
                        { personId: "person-a", amount: 30 },
                        { personId: "person-b", amount: 30 },
                    ],
                }, // Bob → Alice 30 more
            ];

            const result = calculatePairwiseTransactions(people, expenses, emptySettlements);

            // Bob → Alice should be aggregated to 80
            const bobToAlice = result.find(t => t.from === "person-b" && t.to === "person-a");
            expect(bobToAlice).toBeDefined();
            expect(bobToAlice!.amount).toBe(80);
            expect(bobToAlice!.contributingExpenseIds).toHaveLength(2);
        });
    });

    describe("threshold behavior for pairwise", () => {
        it("should not include transactions below 0.01 threshold", () => {
            const result = calculatePairwiseTransactions(
                people,
                [tinyAmountExpense],
                emptySettlements
            );

            // 0.0005 is below threshold
            expect(result).toEqual([]);
        });
    });
});

// =============================================================================
// INTEGRATION / CONSISTENCY TESTS
// =============================================================================

describe("Settlement Calculation Consistency", () => {
    it("simplified transactions should fully settle net balances", () => {
        const balances = calculateNetBalances(people, tripExpenses, emptySettlements);
        const transactions = calculateSimplifiedTransactions(people, tripExpenses, emptySettlements);

        // Apply all transactions to balances
        const settledBalances = { ...balances };
        transactions.forEach(t => {
            settledBalances[t.from] += t.amount;
            settledBalances[t.to] -= t.amount;
        });

        // All balances should be zero (or very close)
        Object.values(settledBalances).forEach(balance => {
            expect(Math.abs(balance)).toBeLessThan(0.02);
        });
    });

    it("same inputs should produce deterministic outputs", () => {
        const result1 = calculateSimplifiedTransactions(people, tripExpenses, emptySettlements);
        const result2 = calculateSimplifiedTransactions(people, tripExpenses, emptySettlements);

        expect(result1).toEqual(result2);
    });

    it("net balances should be independent of expense order", () => {
        const balances1 = calculateNetBalances(people, tripExpenses, emptySettlements);
        const balances2 = calculateNetBalances(people, [...tripExpenses].reverse(), emptySettlements);

        Object.keys(balances1).forEach(personId => {
            expect(balances1[personId]).toBeCloseTo(balances2[personId], 2);
        });
    });
});
