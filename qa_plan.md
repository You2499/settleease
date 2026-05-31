# Settlement Engine: Comprehensive Verification Strategy & QA Plan

This document outlines a robust quality assurance plan and verification strategy for the SettleEase settlement engine (`src/lib/settleease/settlementCalculations.ts`). It covers standard splits, itemwise divisions, celebration contributions, exclusion rules, manual settlement overrides, mathematical safety invariants, automated test commands, mock data shapes, and manual UI verification scripts.

---

## 1. Executive Summary & Quality Gates

The SettleEase backend and frontend utilize localized and server-synced settlement models to compute net outstanding debts, pairwise splits, and optimal transaction routings. Because these calculations directly affect user finances, the settlement engine must satisfy a **Zero-Defect Financial Integrity standard**. 

### Quality Gates for Releases:
1. **Mathematical Invariant Conformance**: Every state transition (adding expenses, deleting items, settling balances, configuring overrides) must satisfy structural mathematical invariants.
2. **Floating-Point Rounding Stability**: All rounding must be consistently executed using a 2-decimal-place scale ($0.01$ precision) to avoid penny-splitting leakages.
3. **Double-Entry Balance Verification**: The sum of all net balances in a group must strictly equal $0.00$ at all times.
4. **Idempotency & Reconcilability**: Re-importing or recalculating a sequence of historical events must produce identical net balance states regardless of state generation pathways.

---

## 2. Mathematical Invariants (Core Safety Properties)

These safety properties form the core of the automated test assertions and database constraints. If any invariant is violated, the settlement engine is considered broken.

### Invariant 1: The Zero-Sum Balance Rule
For any set of people $P$, expenses $E$, and settlement payments $S$, the sum of all net balances in a group must always equal exactly $0.00$.
$$\sum_{p \in P} \text{NetBalance}(p) = 0.00$$
This must hold true before and after toggling expense exclusions, before and after manual overrides, and after recording settlement payments.

### Invariant 2: Conservation of Expense Cash (Double-Entry Verification)
For any single expense entry $E_i$ that is included in the settlement:
$$\sum_{p \in \text{paid\_by}} \text{payment.amount} = \sum_{s \in \text{shares}} \text{share.amount} + \left( \text{celebration\_contribution.amount} \text{ [if present]} \right)$$
*Example:* If A pays \$100, the sum of all individual split shares plus any celebration contributions must equal exactly \$100.00.

### Invariant 3: Conservation of Settlements (Reconciliability)
Recording a settlement payment of amount $A_{settled}$ from Debtor $D$ to Creditor $C$ must adjust their balances as follows:
- $\text{NetBalance}_{\text{new}}(D) = \text{NetBalance}_{\text{old}}(D) + A_{settled}$
- $\text{NetBalance}_{\text{new}}(C) = \text{NetBalance}_{\text{old}}(C) - A_{settled}$

This reduces $D$'s debt (moving the negative balance closer to 0) and reduces $C$'s credit (moving the positive balance closer to 0) while keeping the aggregate group balance zero-sum.

### Invariant 4: Simplified Transaction Volume Matching
The total sum of recommended transaction amounts in the simplified settlement routing must exactly equal the sum of all outstanding positive net balances (or absolute negative balances) in the group:
$$\sum_{t \in \text{Transactions}} \text{t.amount} = \sum_{p \in P, \text{NetBalance}(p) > 0} \text{NetBalance}(p)$$
*Exception:* If active manual overrides are applied, they might not match standard greedy paths, but the sum of remaining balances being settled in subsequent greedy paths + the manual overrides must still equal the total positive outstanding balances.

### Invariant 5: Override Feasibility Bound
A manual override of amount $O$ from Debtor $D$ to Creditor $C$ can only settle up to the minimum of the override amount, the debtor's actual remaining debt, and the creditor's actual remaining credit:
$$\text{settledAmount} = \min(| \text{NetBalance}(D) |, \text{NetBalance}(C), O)$$
This ensures that manual overrides never over-settle beyond actual debts or create artificial negative balances.

### Invariant 6: Reciprocal Netwise Integrity
For any two individuals $A$ and $B$, the net pairwise debt is:
$$\text{NetDebt}(A, B) = \text{Debt}(A \to B) - \text{Debt}(B \to A)$$
The sum of all net pairwise debts of any individual $A$ with all other members of the group must be exactly equal to $A$'s standard net balance:
$$\text{NetBalance}(A) = \sum_{B \in P, B \neq A} \text{NetDebt}(B, A)$$

---

## 3. Concrete Test Scenarios

### Tabular Test Suite Overview
| ID | Category | Description | Mock Inputs | Expected Outputs | Invariants Checked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TS-001** | Standard Equal | 3-way equal split of a single expense | A pays \$60, shared by A, B, C | A: +\$40.00, B: -\$20.00, C: -\$20.00 | Invariant 1, 2 |
| **TS-002** | Unequal Split | Unequal split with custom share amounts | A pays \$100. Shares: A(\$50), B(\$30), C(\$20) | A: +\$50.00, B: -\$30.00, C: -\$20.00 | Invariant 1, 2 |
| **TS-003** | Celebration | Split with celebration contribution | A pays \$100. Shares: A(\$45), B(\$45). B contributes \$10 to celebration. | A: +\$55.00, B: -\$55.00 | Invariant 1, 2 |
| **TS-004** | Excluded Basic | Expense marked as excluded from settlements | A pays \$60, shared by A, B, C. `exclude_from_settlement: true` | A: \$0.00, B: \$0.00, C: \$0.00 | Invariant 1 |
| **TS-005** | Excluded + Settlement | Excluded expense alongside pre-recorded settlement | E1 (\$60 equal) is excluded. Settlement payment: B pays A \$20. | A: -\$20.00, B: +\$20.00, C: \$0.00 | Invariant 1, 3 |
| **TS-006** | Manual Override | Active override on outstanding debts | Balances: A(+\$50), B(-\$30), C(-\$20). Override: B pays A \$25. | Transactions: B $\to$ A (\$25.00), B $\to$ A (\$5.00), C $\to$ A (\$20.00) | Invariant 4, 5 |
| **TS-007** | Pairwise Netting | Direct reciprocal netting between individuals | E1: A pays \$60 (split A, B). E2: B pays \$40 (split B, C). E3: C pays \$20 (split A, C). | Pairwise Debts:<br>B owes A \$30<br>C owes B \$20<br>A owes C \$10 | Invariant 6 |

---

## 4. Mock Data Configurations (TypeScript Shapes)

The mock data configurations must conform to the database schema defined in `convex/schema.ts` and the interface mappings in `src/lib/settleease/types.ts`.

### Person Object Configuration
```typescript
interface Person {
  id: string;
  name: string;
  created_at?: string;
}

const mockPeople: Person[] = [
  { id: "person-a", name: "Alice" },
  { id: "person-b", name: "Bob" },
  { id: "person-c", name: "Charlie" }
];
```

### Expense Object Configuration (Including Celebration & Exclusion Flags)
```typescript
interface Expense {
  id: string;
  description: string;
  total_amount: number;
  category: string;
  paid_by: { personId: string; amount: number }[];
  split_method: "equal" | "unequal" | "itemwise";
  shares: { personId: string; amount: number }[];
  celebration_contribution?: { personId: string; amount: number } | null;
  exclude_from_settlement?: boolean;
  created_at?: string;
}

const mockExpenses: Expense[] = [
  // TS-001: Standard Equal
  {
    id: "exp-1",
    description: "Dinner",
    total_amount: 60,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 60 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 20 },
      { personId: "person-b", amount: 20 },
      { personId: "person-c", amount: 20 }
    ],
    exclude_from_settlement: false
  },
  // TS-003: Celebration Contribution
  {
    id: "exp-2",
    description: "Birthday Drinks",
    total_amount: 100,
    category: "Entertainment",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "unequal",
    shares: [
      { personId: "person-a", amount: 45 },
      { personId: "person-b", amount: 45 }
    ],
    celebration_contribution: { personId: "person-b", amount: 10 },
    exclude_from_settlement: false
  }
];
```

### Settlement Payment Shape
```typescript
interface SettlementPayment {
  id: string;
  debtor_id: string;
  creditor_id: string;
  amount_settled: number;
  settled_at: string;
  marked_by_user_id: string;
  notes?: string;
}

const mockSettlements: SettlementPayment[] = [
  {
    id: "settle-1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount_settled: 20,
    settled_at: "2026-05-31T09:00:00Z",
    marked_by_user_id: "user-admin"
  }
];
```

### Manual Settlement Override Shape
```typescript
interface ManualSettlementOverride {
  id: string;
  debtor_id: string;
  creditor_id: string;
  amount: number;
  is_active: boolean;
  notes?: string;
}

const mockOverrides: ManualSettlementOverride[] = [
  {
    id: "override-1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount: 25,
    is_active: true
  }
];
```

---

## 5. Automated Verification Plan & Custom Test Suite

To guarantee total reliability, a lightweight TypeScript/JavaScript test script has been implemented in the workspace at `/Users/gmgupta/Downloads/settleease/scripts/test-settlements.js`. This script tests all scenarios and mathematical invariants directly against the codebase files.

### Test Runner Command:
Run the following terminal command from the project root directory:
```bash
node scripts/test-settlements.js
```

### Script Implementation Logic:
The test runner parses the pure analytical outputs of the settlement functions and validates them against core invariants:
1. It initializes the `people`, `expenses`, and `settlements` datasets.
2. It executes `calculateNetBalances` and verifies that the sum of all elements in the returned dictionary is strictly `0.00`.
3. It toggles exclusions and checks if the deleted expenses are completely removed from calculations.
4. It registers manual overrides and asserts that priority transactions are executed first up to their maximum allowed bounds.
5. It runs a reciprocal netting test on pairwise records, proving that standard balances match the pairwise sum totals.

---

## 6. Manual Verification & UI Validation Steps

To ensure that the frontend displays these values correctly, QA engineers and developers must execute the following manual testing steps:

### Scenario A: Standard Split Verification
1. **Navigate** to `Add Expense` tab (`?view=addExpense`).
2. **Add Person** "Alice", "Bob", and "Charlie" under `Manage People` if not present.
3. **Create Expense**:
   - Description: `Weekend Getaway`
   - Total Amount: `\$300`
   - Paid By: Alice pays `\$300`
   - Split Method: `Equal` (Alice, Bob, Charlie checked)
4. **Save** the expense.
5. **Verify UI**:
   - Navigate to `Dashboard` (`?view=dashboard`).
   - Alice's net balance must show `+\$200.00`.
   - Bob's net balance must show `-\$100.00`.
   - Charlie's net balance must show `-\$100.00`.
   - The "Simplified Payments" section must show two transactions: `Bob owes Alice \$100.00` and `Charlie owes Alice \$100.00`.

### Scenario B: Celebration Contribution Verification
1. **Create Expense**:
   - Description: `Shared Dinner with Cake`
   - Total Amount: `\$120`
   - Paid By: Alice pays `\$120`
   - Split Method: `Unequal`
   - Custom Shares: Alice `\$50`, Bob `\$50`.
   - Celebration Contribution: Bob contributes `\$20`.
2. **Save** the expense.
3. **Verify UI**:
   - Alice's net balance must increase by `+\$70.00` (`+\$120` paid minus `\$50` share).
   - Bob's net balance must decrease by `-\$70.00` (`-\$50` share minus `\$20` celebration).
   - Alice's Dashboard card should read `Alice is owed \$70.00` and Bob's should read `Bob owes \$70.00`.

### Scenario C: Exclusion and Settlement Interplay
1. **Navigate** to the `Edit Expenses` tab.
2. **Locate** the `Weekend Getaway` (\$300) expense.
3. **Click** "Exclude from Settlements" checkbox.
4. **Verify UI Immediate Update**:
   - The Dashboard balances must immediately recalculate: Alice's balance should revert to `\$0.00` (assuming no other expenses), and Bob and Charlie's should also be `\$0.00`.
5. **Navigate** to `Manage Settlements` (`?view=manageSettlements`).
6. **Record Settlement**:
   - Debtor: Bob
   - Creditor: Alice
   - Amount: `\$50.00`
7. **Verify UI**:
   - Alice's balance must show `-\$50.00` (Alice has received \$50 over her due share).
   - Bob's balance must show `+\$50.00` (Bob has paid \$50 more than his due share).
   - This "over-settled" scenario is mathematically sound and proves the system isolates exclusions perfectly without breaking transactional histories.

### Scenario D: Manual Settlement Overrides
1. **Navigate** to `Settings` (`?view=settings`) or the bottom of `Manage Settlements`.
2. **Under "Manual Settlement Overrides"**:
   - Add a manual override: `Charlie pays Alice \$30.00`.
   - Mark it as `Active`.
3. **Navigate** to `Dashboard`.
4. **Verify UI**:
   - Under "Simplified Payments", the first recommended transaction MUST be `Charlie owes Alice \$30.00`.
   - The remainder of Charlie's debt and other debts must be optimized greedily around this override.
   - Deactivate the override and verify that the transaction recommendations immediately revert to the greedy baseline model.
