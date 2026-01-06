/**
 * Test Fixtures for Settlement Calculations
 * 
 * Comprehensive test data covering:
 * - Basic scenarios (simple expenses, single payer)
 * - Complex scenarios (multi-payer, itemwise splits)
 * - Edge cases (empty data, zero amounts, circular debts)
 * - Settlement payments and manual overrides
 */

import type {
    Person,
    Expense,
    SettlementPayment,
    ManualSettlementOverride,
    PayerShare,
} from "../types";

// =============================================================================
// PEOPLE FIXTURES
// =============================================================================

export const people: Person[] = [
    { id: "person-a", name: "Alice" },
    { id: "person-b", name: "Bob" },
    { id: "person-c", name: "Charlie" },
    { id: "person-d", name: "Diana" },
];

export const singlePerson: Person[] = [
    { id: "person-a", name: "Alice" },
];

export const emptyPeople: Person[] = [];

// =============================================================================
// SIMPLE EXPENSE FIXTURES
// =============================================================================

/**
 * Simple expense: Alice pays ₹100, split equally between Alice and Bob
 * Expected: Alice +50, Bob -50
 */
export const simpleExpenseEqualSplit: Expense = {
    id: "exp-simple-1",
    description: "Simple dinner",
    total_amount: 100,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 50 },
        { personId: "person-b", amount: 50 },
    ],
};

/**
 * Unequal split expense: Bob pays ₹150, split unequally
 * Alice owes ₹100, Bob owes ₹50
 * Expected: Bob pays 150 - owes 50 = +100, Alice owes 100 = -100
 */
export const unequalSplitExpense: Expense = {
    id: "exp-unequal-1",
    description: "Shopping spree",
    total_amount: 150,
    category: "Shopping",
    paid_by: [{ personId: "person-b", amount: 150 }],
    split_method: "unequal",
    shares: [
        { personId: "person-a", amount: 100 },
        { personId: "person-b", amount: 50 },
    ],
};

// =============================================================================
// MULTI-PAYER EXPENSE FIXTURES
// =============================================================================

/**
 * Multi-payer expense: Alice pays ₹60, Bob pays ₹40, total ₹100
 * Split equally among Alice, Bob, Charlie (₹33.33 each)
 * Expected:
 *   Alice: paid 60 - owes 33.33 = +26.67
 *   Bob: paid 40 - owes 33.33 = +6.67
 *   Charlie: paid 0 - owes 33.33 = -33.33
 */
export const multiPayerExpense: Expense = {
    id: "exp-multi-payer-1",
    description: "Group taxi",
    total_amount: 100,
    category: "Transport",
    paid_by: [
        { personId: "person-a", amount: 60 },
        { personId: "person-b", amount: 40 },
    ],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 33.33 },
        { personId: "person-b", amount: 33.33 },
        { personId: "person-c", amount: 33.34 },
    ],
};

// =============================================================================
// CELEBRATION CONTRIBUTION FIXTURES
// =============================================================================

/**
 * Expense with celebration contribution:
 * Alice pays ₹200 for dinner, Bob is the birthday person
 * Total expense ₹200, but Alice contributes ₹50 as celebration
 * Net share for others: ₹150 / 3 = ₹50 each
 * 
 * Expected:
 *   Alice: paid 200 - owes 50 (share) - celebration 50 = +100
 *   Bob: paid 0 - owes 50 = -50
 *   Charlie: paid 0 - owes 50 = -50
 */
export const celebrationExpense: Expense = {
    id: "exp-celebration-1",
    description: "Birthday dinner for Bob",
    total_amount: 200,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 200 }],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 50 },
        { personId: "person-b", amount: 50 },
        { personId: "person-c", amount: 50 },
    ],
    celebration_contribution: {
        personId: "person-a",
        amount: 50,
    },
};

// =============================================================================
// EXCLUDE FROM SETTLEMENT FIXTURES
// =============================================================================

/**
 * Expense excluded from settlement calculations
 * This should NOT affect balances
 */
export const excludedExpense: Expense = {
    id: "exp-excluded-1",
    description: "Personal purchase (tracked but excluded)",
    total_amount: 500,
    category: "Personal",
    paid_by: [{ personId: "person-a", amount: 500 }],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 250 },
        { personId: "person-b", amount: 250 },
    ],
    exclude_from_settlement: true,
};

// =============================================================================
// ITEMWISE EXPENSE FIXTURES
// =============================================================================

/**
 * Itemwise expense: Different people share different items
 * Item 1: Pizza ₹200 (shared by Alice, Bob)
 * Item 2: Drinks ₹100 (shared by Bob, Charlie)
 * Alice pays full ₹300
 * 
 * Expected:
 *   Alice: paid 300 - owes 100 (pizza half) = +200
 *   Bob: paid 0 - owes 100 (pizza half) - owes 50 (drinks half) = -150
 *   Charlie: paid 0 - owes 50 (drinks half) = -50
 */
export const itemwiseExpense: Expense = {
    id: "exp-itemwise-1",
    description: "Restaurant bill",
    total_amount: 300,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 300 }],
    split_method: "itemwise",
    shares: [
        { personId: "person-a", amount: 100 },
        { personId: "person-b", amount: 150 },
        { personId: "person-c", amount: 50 },
    ],
    items: [
        { id: "item-1", name: "Pizza", price: 200, sharedBy: ["person-a", "person-b"] },
        { id: "item-2", name: "Drinks", price: 100, sharedBy: ["person-b", "person-c"] },
    ],
};

// =============================================================================
// SETTLEMENT PAYMENT FIXTURES
// =============================================================================

/**
 * Settlement payment: Bob paid Alice ₹50
 * This should adjust balances: Bob +50, Alice -50
 */
export const settlementPayment1: SettlementPayment = {
    id: "settle-1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount_settled: 50,
    settled_at: "2026-01-01T10:00:00Z",
    marked_by_user_id: "user-1",
    notes: "Cash payment",
};

/**
 * Settlement payment: Charlie paid Bob ₹30
 */
export const settlementPayment2: SettlementPayment = {
    id: "settle-2",
    debtor_id: "person-c",
    creditor_id: "person-b",
    amount_settled: 30,
    settled_at: "2026-01-02T10:00:00Z",
    marked_by_user_id: "user-1",
};

export const emptySettlements: SettlementPayment[] = [];

// =============================================================================
// MANUAL OVERRIDE FIXTURES
// =============================================================================

/**
 * Active manual override: Forces Charlie to pay Diana ₹100
 */
export const activeManualOverride: ManualSettlementOverride = {
    id: "override-1",
    debtor_id: "person-c",
    creditor_id: "person-d",
    amount: 100,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

/**
 * Inactive manual override (should be ignored)
 */
export const inactiveManualOverride: ManualSettlementOverride = {
    id: "override-2",
    debtor_id: "person-a",
    creditor_id: "person-b",
    amount: 200,
    is_active: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
};

// =============================================================================
// CIRCULAR DEBT FIXTURES
// =============================================================================

/**
 * Circular debt scenario:
 * Alice pays for Bob's share: Alice → Bob ₹100
 * Bob pays for Charlie's share: Bob → Charlie ₹100
 * Charlie pays for Alice's share: Charlie → Alice ₹100
 * 
 * Net result should be zero for everyone
 */
export const circularDebtExpenses: Expense[] = [
    {
        id: "exp-circular-1",
        description: "Alice pays for Bob",
        total_amount: 100,
        category: "Food",
        paid_by: [{ personId: "person-a", amount: 100 }],
        split_method: "equal",
        shares: [{ personId: "person-b", amount: 100 }],
    },
    {
        id: "exp-circular-2",
        description: "Bob pays for Charlie",
        total_amount: 100,
        category: "Food",
        paid_by: [{ personId: "person-b", amount: 100 }],
        split_method: "equal",
        shares: [{ personId: "person-c", amount: 100 }],
    },
    {
        id: "exp-circular-3",
        description: "Charlie pays for Alice",
        total_amount: 100,
        category: "Food",
        paid_by: [{ personId: "person-c", amount: 100 }],
        split_method: "equal",
        shares: [{ personId: "person-a", amount: 100 }],
    },
];

// =============================================================================
// EDGE CASE FIXTURES
// =============================================================================

/**
 * Zero amount expense
 */
export const zeroAmountExpense: Expense = {
    id: "exp-zero-1",
    description: "Free item",
    total_amount: 0,
    category: "Other",
    paid_by: [{ personId: "person-a", amount: 0 }],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 0 },
        { personId: "person-b", amount: 0 },
    ],
};

/**
 * Expense with missing paid_by array
 */
export const expenseWithEmptyPaidBy: Expense = {
    id: "exp-empty-paid-1",
    description: "Missing payers",
    total_amount: 100,
    category: "Other",
    paid_by: [],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 50 },
        { personId: "person-b", amount: 50 },
    ],
};

/**
 * Expense with missing shares array
 */
export const expenseWithEmptyShares: Expense = {
    id: "exp-empty-shares-1",
    description: "Missing shares",
    total_amount: 100,
    category: "Other",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "equal",
    shares: [],
};

/**
 * Very small amounts (testing threshold behavior)
 */
export const tinyAmountExpense: Expense = {
    id: "exp-tiny-1",
    description: "Tiny amount",
    total_amount: 0.001,
    category: "Other",
    paid_by: [{ personId: "person-a", amount: 0.001 }],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 0.0005 },
        { personId: "person-b", amount: 0.0005 },
    ],
};

/**
 * Large amount expense (testing precision)
 */
export const largeAmountExpense: Expense = {
    id: "exp-large-1",
    description: "Large purchase",
    total_amount: 999999.99,
    category: "Shopping",
    paid_by: [{ personId: "person-a", amount: 999999.99 }],
    split_method: "equal",
    shares: [
        { personId: "person-a", amount: 333333.33 },
        { personId: "person-b", amount: 333333.33 },
        { personId: "person-c", amount: 333333.33 },
    ],
};

// =============================================================================
// COMPLEX SCENARIO FIXTURES
// =============================================================================

/**
 * Complex realistic scenario with multiple expenses
 * Simulates a trip with various expense types
 */
export const tripExpenses: Expense[] = [
    // Hotel: Alice pays ₹3000, split among all 4
    {
        id: "trip-hotel",
        description: "Hotel booking",
        total_amount: 3000,
        category: "Accommodation",
        paid_by: [{ personId: "person-a", amount: 3000 }],
        split_method: "equal",
        shares: [
            { personId: "person-a", amount: 750 },
            { personId: "person-b", amount: 750 },
            { personId: "person-c", amount: 750 },
            { personId: "person-d", amount: 750 },
        ],
    },
    // Fuel: Bob and Charlie split paying, all 4 share
    {
        id: "trip-fuel",
        description: "Fuel",
        total_amount: 500,
        category: "Transport",
        paid_by: [
            { personId: "person-b", amount: 300 },
            { personId: "person-c", amount: 200 },
        ],
        split_method: "equal",
        shares: [
            { personId: "person-a", amount: 125 },
            { personId: "person-b", amount: 125 },
            { personId: "person-c", amount: 125 },
            { personId: "person-d", amount: 125 },
        ],
    },
    // Dinner: Diana pays, Diana is celebrating
    {
        id: "trip-dinner",
        description: "Celebration dinner",
        total_amount: 1000,
        category: "Food",
        paid_by: [{ personId: "person-d", amount: 1000 }],
        split_method: "equal",
        shares: [
            { personId: "person-a", amount: 200 },
            { personId: "person-b", amount: 200 },
            { personId: "person-c", amount: 200 },
            { personId: "person-d", amount: 200 },
        ],
        celebration_contribution: {
            personId: "person-d",
            amount: 200,
        },
    },
];

export const tripSettlements: SettlementPayment[] = [
    {
        id: "trip-settle-1",
        debtor_id: "person-b",
        creditor_id: "person-a",
        amount_settled: 500,
        settled_at: "2026-01-05T10:00:00Z",
        marked_by_user_id: "user-1",
    },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function createPeopleMap(peopleList: Person[]): Record<string, string> {
    const map: Record<string, string> = {};
    peopleList.forEach(p => {
        map[p.id] = p.name;
    });
    return map;
}
