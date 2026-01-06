/**
 * Comprehensive Test Scenarios
 * 
 * These are designed to EXPOSE BUGS, not just validate happy paths.
 * Each scenario includes:
 * - Input data
 * - EXPECTED results (calculated manually)
 * - The formula used to calculate expected results
 * 
 * Tests should FAIL if the engine produces different results.
 */

import type { Person, Expense, SettlementPayment, ManualSettlementOverride } from "@/lib/settleease/types";

// =============================================================================
// TEST PEOPLE
// =============================================================================

export const testPeople: Person[] = [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
    { id: "charlie", name: "Charlie" },
    { id: "diana", name: "Diana" },
];

export const testPeopleMap: Record<string, string> = {
    alice: "Alice",
    bob: "Bob",
    charlie: "Charlie",
    diana: "Diana",
};

// =============================================================================
// SCENARIO 1: Simple 50/50 Split
// This is the most basic case - if this fails, something is fundamentally broken
// =============================================================================

export const scenario1 = {
    name: "Simple 50/50 Split",
    description: "Alice pays $100 for dinner, split equally with Bob",

    expenses: [
        {
            id: "s1-exp1",
            description: "Dinner",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "alice", amount: 100 }],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "bob", amount: 50 },
            ],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    // EXPECTED RESULTS - calculated by hand
    expected: {
        balances: {
            alice: 50,   // Paid $100, owes $50 = +$50
            bob: -50,    // Paid $0, owes $50 = -$50
        },
        simplifiedTransactions: [
            { from: "bob", to: "alice", amount: 50 },
        ],
        formula: "Alice: $100 (paid) - $50 (share) = +$50 | Bob: $0 (paid) - $50 (share) = -$50",
    },
};

// =============================================================================
// SCENARIO 2: Multi-Payer Expense
// Two people split the bill payment
// =============================================================================

export const scenario2 = {
    name: "Multi-Payer Expense",
    description: "Alice pays $60, Bob pays $40 for a $100 dinner split 3 ways",

    expenses: [
        {
            id: "s2-exp1",
            description: "Dinner - Multi Payer",
            total_amount: 100,
            category: "Food",
            paid_by: [
                { personId: "alice", amount: 60 },
                { personId: "bob", amount: 40 },
            ],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 33.33 },
                { personId: "bob", amount: 33.33 },
                { personId: "charlie", amount: 33.34 },
            ],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    expected: {
        balances: {
            alice: 26.67,    // Paid $60, owes $33.33 = +$26.67
            bob: 6.67,       // Paid $40, owes $33.33 = +$6.67
            charlie: -33.34, // Paid $0, owes $33.34 = -$33.34
        },
        // Charlie should pay the creditors
        simplifiedTransactions: [
            // Charlie owes $33.34 total, should pay Alice $26.67 and Bob $6.67
            { from: "charlie", to: "alice", amount: 26.67 },
            { from: "charlie", to: "bob", amount: 6.67 },
        ],
        formula: `
      Alice: $60 (paid) - $33.33 (share) = +$26.67
      Bob: $40 (paid) - $33.33 (share) = +$6.67
      Charlie: $0 (paid) - $33.34 (share) = -$33.34
      Sum check: $26.67 + $6.67 - $33.34 = $0 ✓
    `,
    },
};

// =============================================================================
// SCENARIO 3: Celebration Contribution
// One person's birthday - they get a discount on their share
// =============================================================================

export const scenario3 = {
    name: "Celebration with Birthday Contribution",
    description: "Alice pays $200 for Charlie's birthday dinner. Charlie gets $50 off, rest split between Alice and Bob",

    expenses: [
        {
            id: "s3-exp1",
            description: "Charlie's Birthday Dinner",
            total_amount: 200,
            category: "Food",
            paid_by: [{ personId: "alice", amount: 200 }],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "bob", amount: 50 },
                { personId: "charlie", amount: 50 },
            ],
            celebration_contribution: {
                personId: "charlie",
                amount: 50, // Charlie's share is covered by this contribution
            },
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    expected: {
        balances: {
            // Alice: paid $200, share $50 = +$150
            // But wait - how does celebration work?
            // Total = $200 = shares ($150) + celebration ($50)
            // Charlie owes: $50 (share) + $50 (celebration) = $100
            alice: 150,   // Paid $200, owes $50 = +$150
            bob: -50,     // Paid $0, owes $50 = -$50
            charlie: -100, // Paid $0, owes $50 (share) + $50 (celebration) = -$100
        },
        simplifiedTransactions: [
            { from: "charlie", to: "alice", amount: 100 },
            { from: "bob", to: "alice", amount: 50 },
        ],
        formula: `
      Total $200 = Shares ($50+$50+$50=$150) + Celebration ($50)
      Alice: $200 (paid) - $50 (share) = +$150
      Bob: $0 (paid) - $50 (share) = -$50
      Charlie: $0 (paid) - $50 (share) - $50 (celebration) = -$100
      Sum: +$150 - $50 - $100 = $0 ✓
    `,
    },
};

// =============================================================================
// SCENARIO 4: Itemwise Split
// Different items consumed by different people
// =============================================================================

export const scenario4 = {
    name: "Itemwise Split",
    description: "Alice pays $100 restaurant bill. Items: Pizza $40 (Bob), Steak $50 (Alice & Charlie), Drinks $10 (all)",

    expenses: [
        {
            id: "s4-exp1",
            description: "Restaurant Itemwise",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "alice", amount: 100 }],
            split_method: "itemwise" as const,
            items: [
                {
                    id: "item1",
                    name: "Pizza",
                    price: 40,
                    sharedBy: ["bob"],
                    categoryName: "Food"
                },
                {
                    id: "item2",
                    name: "Steak",
                    price: 50,
                    sharedBy: ["alice", "charlie"],
                    categoryName: "Food"
                },
                {
                    id: "item3",
                    name: "Drinks",
                    price: 10,
                    sharedBy: ["alice", "bob", "charlie"],
                    categoryName: "Drinks"
                },
            ],
            shares: [
                // Pizza: Bob $40
                // Steak: Alice $25, Charlie $25
                // Drinks: Alice $3.33, Bob $3.33, Charlie $3.34
                { personId: "alice", amount: 28.33 },  // $25 + $3.33
                { personId: "bob", amount: 43.33 },    // $40 + $3.33
                { personId: "charlie", amount: 28.34 }, // $25 + $3.34
            ],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    expected: {
        balances: {
            alice: 71.67,    // Paid $100, owes $28.33 = +$71.67
            bob: -43.33,     // Paid $0, owes $43.33 = -$43.33
            charlie: -28.34, // Paid $0, owes $28.34 = -$28.34
        },
        simplifiedTransactions: [
            { from: "bob", to: "alice", amount: 43.33 },
            { from: "charlie", to: "alice", amount: 28.34 },
        ],
        formula: `
      Item breakdown:
      - Pizza $40: Bob
      - Steak $50: Alice ($25) + Charlie ($25)
      - Drinks $10: Alice ($3.33) + Bob ($3.33) + Charlie ($3.34)
      
      Alice: $100 (paid) - $28.33 (share) = +$71.67
      Bob: $0 (paid) - $43.33 (share) = -$43.33
      Charlie: $0 (paid) - $28.34 (share) = -$28.34
      Sum: +$71.67 - $43.33 - $28.34 = $0 ✓
    `,
    },
};

// =============================================================================
// SCENARIO 5: Partial Settlement
// Some payments have been made
// =============================================================================

export const scenario5 = {
    name: "After Partial Settlement",
    description: "After scenario 1, Bob pays Alice $25 (half)",

    expenses: scenario1.expenses,

    settlements: [
        {
            id: "s5-settle1",
            debtor_id: "bob",
            creditor_id: "alice",
            amount_settled: 25,
            settled_at: "2026-01-02T12:00:00Z",
            marked_by_user_id: "user1",
        },
    ] as SettlementPayment[],

    expected: {
        balances: {
            // Original: Alice +$50, Bob -$50
            // Settlement adjusts: debtor += amount, creditor -= amount
            alice: 25,  // +$50 - $25 (received) = +$25
            bob: -25,   // -$50 + $25 (paid) = -$25
        },
        simplifiedTransactions: [
            { from: "bob", to: "alice", amount: 25 },
        ],
        formula: `
      Original balances: Alice +$50, Bob -$50
      Settlement: Bob pays Alice $25
      Adjusted: Alice = +$50 - $25 = +$25
                Bob = -$50 + $25 = -$25
    `,
    },
};

// =============================================================================
// SCENARIO 6: Excluded Expense
// An expense marked as "exclude from settlement"
// =============================================================================

export const scenario6 = {
    name: "Excluded Expense",
    description: "Two expenses: one normal ($100), one excluded ($500). Only normal should count.",

    expenses: [
        {
            id: "s6-exp1",
            description: "Normal Expense",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "alice", amount: 100 }],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "bob", amount: 50 },
            ],
            exclude_from_settlement: false,
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
        {
            id: "s6-exp2",
            description: "Excluded Expense (should NOT count)",
            total_amount: 500,
            category: "Excluded",
            paid_by: [{ personId: "bob", amount: 500 }],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 250 },
                { personId: "bob", amount: 250 },
            ],
            exclude_from_settlement: true,
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    expected: {
        balances: {
            // ONLY the $100 expense should count
            alice: 50,  // From normal expense
            bob: -50,   // From normal expense
            // NOT: alice -200, bob +200 (which would happen if excluded expense counted)
        },
        simplifiedTransactions: [
            { from: "bob", to: "alice", amount: 50 },
        ],
        formula: `
      Normal expense: Alice +$50, Bob -$50
      Excluded expense: IGNORED
      Final: Alice +$50, Bob -$50
    `,
    },
};

// =============================================================================
// SCENARIO 7: Circular Debt
// A → B → C → A (should net to zero)
// =============================================================================

export const scenario7 = {
    name: "Circular Debt Resolution",
    description: "Alice pays for Bob ($100), Bob pays for Charlie ($100), Charlie pays for Alice ($100)",

    expenses: [
        {
            id: "s7-exp1",
            description: "Alice pays for Bob",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "alice", amount: 100 }],
            split_method: "equal" as const,
            shares: [{ personId: "bob", amount: 100 }],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
        {
            id: "s7-exp2",
            description: "Bob pays for Charlie",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "bob", amount: 100 }],
            split_method: "equal" as const,
            shares: [{ personId: "charlie", amount: 100 }],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
        {
            id: "s7-exp3",
            description: "Charlie pays for Alice",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "charlie", amount: 100 }],
            split_method: "equal" as const,
            shares: [{ personId: "alice", amount: 100 }],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    expected: {
        balances: {
            // Each person: paid $100, owes $100 = net $0
            alice: 0,
            bob: 0,
            charlie: 0,
        },
        simplifiedTransactions: [], // No transactions needed!
        formula: `
      Alice: +$100 (paid for Bob) - $100 (owes Charlie) = $0
      Bob: +$100 (paid for Charlie) - $100 (owes Alice) = $0
      Charlie: +$100 (paid for Alice) - $100 (owes Bob) = $0
      All balanced - no transactions needed!
    `,
    },
};

// =============================================================================
// SCENARIO 8: Complex Trip (Multiple Expenses, Multiple Payers)
// =============================================================================

export const scenario8 = {
    name: "Complex Trip Scenario",
    description: "4-person trip with hotel, food, activities",

    expenses: [
        {
            id: "s8-exp1",
            description: "Hotel - 2 nights",
            total_amount: 400,
            category: "Accommodation",
            paid_by: [{ personId: "alice", amount: 400 }],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 100 },
                { personId: "bob", amount: 100 },
                { personId: "charlie", amount: 100 },
                { personId: "diana", amount: 100 },
            ],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
        {
            id: "s8-exp2",
            description: "Group Dinner",
            total_amount: 200,
            category: "Food",
            paid_by: [
                { personId: "bob", amount: 120 },
                { personId: "charlie", amount: 80 },
            ],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "bob", amount: 50 },
                { personId: "charlie", amount: 50 },
                { personId: "diana", amount: 50 },
            ],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
        {
            id: "s8-exp3",
            description: "Activity - Only 3 people",
            total_amount: 150,
            category: "Activities",
            paid_by: [{ personId: "diana", amount: 150 }],
            split_method: "equal" as const,
            shares: [
                { personId: "alice", amount: 50 },
                { personId: "bob", amount: 50 },
                { personId: "diana", amount: 50 },
            ],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    expected: {
        balances: {
            // Expense 1 (Hotel): Alice +300, Bob -100, Charlie -100, Diana -100
            // Expense 2 (Dinner): Alice -50, Bob +70, Charlie +30, Diana -50
            // Expense 3 (Activity): Alice -50, Bob -50, Diana +100
            // TOTALS:
            alice: 200,    // +300 -50 -50 = +200
            bob: -80,      // -100 +70 -50 = -80
            charlie: -70,  // -100 +30 = -70
            diana: -50,    // -100 -50 +100 = -50
        },
        simplifiedTransactions: [
            // Algorithm should minimize transactions
            // Bob, Charlie, Diana all owe Alice
            { from: "bob", to: "alice", amount: 80 },
            { from: "charlie", to: "alice", amount: 70 },
            { from: "diana", to: "alice", amount: 50 },
        ],
        formula: `
      Hotel ($400 by Alice, 4-way split):
        Alice: +$400 - $100 = +$300
        Bob: -$100, Charlie: -$100, Diana: -$100
      
      Dinner ($200 by Bob+Charlie, 4-way split):
        Alice: -$50, Diana: -$50
        Bob: +$120 - $50 = +$70
        Charlie: +$80 - $50 = +$30
      
      Activity ($150 by Diana, 3-way split):
        Alice: -$50, Bob: -$50
        Diana: +$150 - $50 = +$100
      
      TOTALS:
        Alice: +$300 - $50 - $50 = +$200
        Bob: -$100 + $70 - $50 = -$80
        Charlie: -$100 + $30 = -$70
        Diana: -$100 - $50 + $100 = -$50
      
      Sum check: +$200 - $80 - $70 - $50 = $0 ✓
    `,
    },
};

// =============================================================================
// SCENARIO 9: Manual Settlement Override
// =============================================================================

export const scenario9 = {
    name: "Manual Settlement Override",
    description: "Charlie owes Diana $100, but manual override forces Charlie→Bob payment",

    expenses: [
        {
            id: "s9-exp1",
            description: "Diana pays for Charlie",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "diana", amount: 100 }],
            split_method: "equal" as const,
            shares: [{ personId: "charlie", amount: 100 }],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
        {
            id: "s9-exp2",
            description: "Bob pays for Alice",
            total_amount: 100,
            category: "Food",
            paid_by: [{ personId: "bob", amount: 100 }],
            split_method: "equal" as const,
            shares: [{ personId: "alice", amount: 100 }],
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as Expense[],

    settlements: [] as SettlementPayment[],

    manualOverrides: [
        {
            id: "override1",
            debtor_id: "charlie",  // Charlie owes
            creditor_id: "bob",    // But override says pay Bob
            amount: 50,
            is_active: true,
            created_at: "2026-01-01T12:00:00Z",
            updated_at: "2026-01-01T12:00:00Z",
        },
    ] as ManualSettlementOverride[],

    expected: {
        balances: {
            alice: -100,   // Owes Bob $100
            bob: 100,      // Is owed $100 by Alice
            charlie: -100, // Owes Diana $100
            diana: 100,    // Is owed $100 by Charlie
        },
        // With override: Charlie should pay Bob $50 first (if Bob is owed)
        // But Bob is owed by ALICE, not Charlie... so override may not apply
        // This tests the override logic edge cases
        simplifiedTransactions: [
            { from: "alice", to: "bob", amount: 100 },
            { from: "charlie", to: "diana", amount: 100 },
        ],
        formula: `
      Without override:
        Alice owes Bob $100
        Charlie owes Diana $100
      
      With override (Charlie→Bob $50):
        Override only applies if Charlie owes && Bob is owed
        Charlie DOES owe (-$100), but Bob is NOT owed by Charlie
        So override may not apply directly...
    `,
    },
};

// =============================================================================
// ALL SCENARIOS - for running all tests
// =============================================================================

export const allScenarios = [
    scenario1,
    scenario2,
    scenario3,
    scenario4,
    scenario5,
    scenario6,
    scenario7,
    scenario8,
    scenario9,
];

// =============================================================================
// TEST VERIFICATION FUNCTIONS
// =============================================================================

export interface TestVerificationResult {
    scenarioName: string;
    passed: boolean;
    details: {
        balances: {
            expected: Record<string, number>;
            actual: Record<string, number>;
            matches: boolean;
            differences: string[];
        };
        transactions: {
            expectedCount: number;
            actualCount: number;
            matches: boolean;
            differences: string[];
        };
        conservationCheck: {
            balanceSum: number;
            passes: boolean;
        };
    };
    formula: string;
}

/**
 * Compares actual calculation results with expected results
 * Returns detailed differences for debugging
 */
export function verifyScenario(
    scenario: typeof scenario1,
    actualBalances: Record<string, number>,
    actualTransactions: { from: string; to: string; amount: number }[]
): TestVerificationResult {
    const balanceDiffs: string[] = [];
    let balancesMatch = true;

    // Check balances
    for (const [personId, expected] of Object.entries(scenario.expected.balances)) {
        const actual = actualBalances[personId] || 0;
        const diff = Math.abs(expected - actual);

        if (diff > 0.02) { // Allow 2 cent tolerance for rounding
            balancesMatch = false;
            balanceDiffs.push(
                `${personId}: expected ${expected.toFixed(2)}, got ${actual.toFixed(2)} (diff: ${diff.toFixed(2)})`
            );
        }
    }

    // Check transaction count
    const txnCountMatch = actualTransactions.length === scenario.expected.simplifiedTransactions.length;
    const txnDiffs: string[] = [];

    if (!txnCountMatch) {
        txnDiffs.push(
            `Expected ${scenario.expected.simplifiedTransactions.length} transactions, got ${actualTransactions.length}`
        );
    }

    // Check conservation (sum should be 0)
    const balanceSum = Object.values(actualBalances).reduce((sum, b) => sum + b, 0);
    const conservationPasses = Math.abs(balanceSum) < 0.01;

    return {
        scenarioName: scenario.name,
        passed: balancesMatch && txnCountMatch && conservationPasses,
        details: {
            balances: {
                expected: scenario.expected.balances,
                actual: actualBalances,
                matches: balancesMatch,
                differences: balanceDiffs,
            },
            transactions: {
                expectedCount: scenario.expected.simplifiedTransactions.length,
                actualCount: actualTransactions.length,
                matches: txnCountMatch,
                differences: txnDiffs,
            },
            conservationCheck: {
                balanceSum,
                passes: conservationPasses,
            },
        },
        formula: scenario.expected.formula,
    };
}
