const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=============================================================");
const title = "   SETTLEASE DYNAMIC EXCLUSION STRATEGIES VERIFICATION SUITE   ";
console.log(title);
console.log("=============================================================");

// 1. Transpile settlementCalculations.ts dynamically
const tsPath = path.join(__dirname, '../src/lib/settleease/settlementCalculations.ts');
const tsCode = fs.readFileSync(tsPath, 'utf8');

const jsCode = ts.transpileModule(tsCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

const tempFile = path.join(__dirname, 'temp-settlement-exclusion-strategies.js');
fs.writeFileSync(tempFile, jsCode);

let calculateNetBalances, calculateSimplifiedTransactions;

try {
  const engine = require(tempFile);
  calculateNetBalances = engine.calculateNetBalances;
  calculateSimplifiedTransactions = engine.calculateSimplifiedTransactions;
} catch (err) {
  console.error("Failed to load transpiled engine:", err);
  fs.unlinkSync(tempFile);
  process.exit(1);
}

// Define standard mock people
const people = [
  { id: "person-a", name: "Alice" },
  { id: "person-b", name: "Bob" },
  { id: "person-c", name: "Charlie" }
];

// Helper to assert Zero-Sum Invariant
function assertZeroSum(balances, scenarioName) {
  const sum = Object.values(balances).reduce((acc, val) => acc + val, 0);
  const roundedSum = Math.round(sum * 100) / 100;
  assert.strictEqual(roundedSum, 0.00, `[${scenarioName}] Zero-sum invariant violated: Sum is ${roundedSum} (expected 0.00)`);
  console.log(`  ✓ [Invariant 1 - Zero-Sum] Passed: Balance sum = 0.00`);
}

// Helper to assert Cash Conservation Invariant
function assertConservationOfCash(expense, scenarioName) {
  if (expense.exclude_from_settlement) return;
  const totalPaid = expense.paid_by.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalShares = expense.shares.reduce((sum, s) => sum + Number(s.amount), 0);
  const celebration = expense.celebration_contribution ? Number(expense.celebration_contribution.amount) : 0;
  const totalAllocated = Math.round((totalShares + celebration) * 100) / 100;
  assert.strictEqual(totalPaid, totalAllocated, `[${scenarioName}] Conservation of cash violated: Total Paid (${totalPaid}) !== Total Allocated (${totalAllocated})`);
  console.log(`  ✓ [Invariant 2 - Cash Conservation] Passed: Paid (${totalPaid}) == Allocated (${totalAllocated})`);
}

// Helper to assert Simplified Transaction Volume Matching
function assertTransactionVolume(netBalances, transactions, scenarioName) {
  const totalOwed = Object.values(netBalances)
    .filter(b => b > 0)
    .reduce((sum, b) => sum + b, 0);
  const totalSettled = transactions.reduce((sum, t) => sum + t.amount, 0);
  const roundedOwed = Math.round(totalOwed * 100) / 100;
  const roundedSettled = Math.round(totalSettled * 100) / 100;
  assert.strictEqual(roundedSettled, roundedOwed, `[${scenarioName}] Invariant 4 violated: Total settled in routing (${roundedSettled}) !== Total credit (${roundedOwed})`);
  console.log(`  ✓ [Invariant 4 - Volumetric Matching] Passed: Settled (${roundedSettled}) == Credit (${roundedOwed})`);
}

// Simulation of DB mutation helper for exclusion strategy execution
function executeExclusionStrategy(strategy, expenseToExclude, allExpenses, allSettlements) {
  // Deep copy so we don't mutate original mocks
  const expenses = JSON.parse(JSON.stringify(allExpenses));
  const settlements = JSON.parse(JSON.stringify(allSettlements));

  // Find the target expense
  const expIdx = expenses.findIndex(e => e.id === expenseToExclude.id);
  if (expIdx === -1) throw new Error("Expense not found");
  
  // Exclude it
  expenses[expIdx].exclude_from_settlement = true;

  const expenseDate = new Date(expenseToExclude.created_at || "2026-05-31T09:00:00Z").getTime();
  const expenseParticipantIds = new Set([
    ...(expenseToExclude.paid_by ?? []).map(p => p.personId),
    ...(expenseToExclude.shares ?? []).map(s => s.personId),
  ]);

  // Identify entangled settlements using SettleEase's rules:
  // 1. Explicit association: payment.associated_expense_id === expenseToExclude.id
  // 2. Legacy general: payment Date is within 60 seconds after expense Date AND debtor/creditor were participants
  const entangledSettlements = settlements.filter(payment => {
    const paymentDate = new Date(payment.settled_at).getTime();
    const isExplicitLink = payment.associated_expense_id === expenseToExclude.id;
    const isLegacyGeneral = !isExplicitLink &&
      expenseParticipantIds.has(payment.debtor_id) &&
      expenseParticipantIds.has(payment.creditor_id) &&
      paymentDate >= expenseDate - 60000;
    return isExplicitLink || isLegacyGeneral;
  });

  if (strategy === "unlink_and_archive") {
    entangledSettlements.forEach(payment => {
      payment.is_archived = true;
    });
  } else if (strategy === "pro_rata_adjust") {
    entangledSettlements.forEach(payment => {
      const totalAmount = expenseToExclude.total_amount;
      const entangledAmount = Math.round(Math.min(payment.amount_settled, totalAmount) * 100) / 100;
      const remainingAmount = Math.round((payment.amount_settled - entangledAmount) * 100) / 100;

      if (remainingAmount <= 0.01) {
        payment.amount_settled = 0;
        payment.is_archived = true;
      } else {
        payment.amount_settled = remainingAmount;
      }
    });
  } else if (strategy === "lock_and_carry") {
    // Keep settlements intact (default behavior, no mutation on settlements array)
  }

  return { expenses, settlements };
}

try {
  // =========================================================================
  console.log("\n--- SCENARIO 1: Lock & Carry Forward (Default Re-routing) ---");
  // Setup:
  // E1: Alice pays $90, split A, B, C equally ($30 each)
  // E2: Bob pays $60, split B, C equally ($30 each)
  const e1_s1 = {
    id: "e1",
    description: "Dinner",
    total_amount: 90,
    paid_by: [{ personId: "person-a", amount: 90 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 30 }, { personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    created_at: "2026-05-31T09:00:00Z"
  };
  const e2_s1 = {
    id: "e2",
    description: "Drinks",
    total_amount: 60,
    paid_by: [{ personId: "person-b", amount: 60 }],
    split_method: "equal",
    shares: [{ personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    created_at: "2026-05-31T09:05:00Z"
  };

  const initialExpenses_s1 = [e1_s1, e2_s1];
  const initialSettlements_s1 = [];

  // Exclude E2 with lock_and_carry
  const state_s1 = executeExclusionStrategy("lock_and_carry", e2_s1, initialExpenses_s1, initialSettlements_s1);
  const balances_s1 = calculateNetBalances(people, state_s1.expenses, state_s1.settlements);
  console.log("  Computed Balances under Lock & Carry:", balances_s1);

  // Expectation:
  // E2 excluded. Active: E1 only.
  // Alice: paid 90, split 30 -> +60
  // Bob: paid 0, split 30 -> -30
  // Charlie: paid 0, split 30 -> -30
  assert.strictEqual(balances_s1["person-a"], 60.00);
  assert.strictEqual(balances_s1["person-b"], -30.00);
  assert.strictEqual(balances_s1["person-c"], -30.00);
  assertZeroSum(balances_s1, "SCENARIO 1");

  const txs_s1 = calculateSimplifiedTransactions(people, state_s1.expenses, state_s1.settlements);
  console.log("  Simplified routing under Lock & Carry:", txs_s1);
  assert.strictEqual(txs_s1.length, 2);
  assertTransactionVolume(balances_s1, txs_s1, "SCENARIO 1");

  // =========================================================================
  console.log("\n--- SCENARIO 2: Pro-Rata Adjustment (Scale Down Overlay) ---");
  // Setup:
  // E1: Alice pays $90, split A, B, C equally ($30 each)
  // E2: Bob pays $60, split B, C equally ($30 each)
  // S1: Charlie pays Bob $30 (to settle drinks)
  const e1_s2 = { ...e1_s1 };
  const e2_s2 = { ...e2_s1 };
  const s1_s2 = {
    id: "s1",
    debtor_id: "person-c",
    creditor_id: "person-b",
    amount_settled: 30,
    settled_at: "2026-05-31T09:06:00Z", // entangled (Legacy General, within 60s of E2)
    marked_by_user_id: "user-admin"
  };

  const initialExpenses_s2 = [e1_s2, e2_s2];
  const initialSettlements_s2 = [s1_s2];

  // Exclude E2 with pro_rata_adjust
  const state_s2 = executeExclusionStrategy("pro_rata_adjust", e2_s2, initialExpenses_s2, initialSettlements_s2);
  
  // Verification of simulated DB state after pro_rata_adjust mutation:
  // E2 has total amount 60. Settlement S1 is 30.
  // entangledAmount = min(30, 60) = 30.
  // remainingAmount = 30 - 30 = 0.
  // S1 must be set to amount_settled: 0 and is_archived: true.
  const modifiedS1 = state_s2.settlements.find(s => s.id === "s1");
  assert.strictEqual(modifiedS1.amount_settled, 0);
  assert.strictEqual(modifiedS1.is_archived, true);
  console.log("  ✓ Settlement payment S1 scaled to 0 and archived successfully!");

  const balances_s2 = calculateNetBalances(people, state_s2.expenses, state_s2.settlements);
  console.log("  Computed Balances under Pro-Rata Adjust:", balances_s2);
  
  // E2 is excluded, S1 is archived. Only E1 remains.
  // Balances should be: A: +60, B: -30, C: -30
  assert.strictEqual(balances_s2["person-a"], 60.00);
  assert.strictEqual(balances_s2["person-b"], -30.00);
  assert.strictEqual(balances_s2["person-c"], -30.00);
  assertZeroSum(balances_s2, "SCENARIO 2");

  // =========================================================================
  console.log("\n--- SCENARIO 3: Pro-Rata Scale Down Partial Retention ---");
  // Setup:
  // E1: Alice pays $90, split A, B, C equally ($30 each)
  // E2: Bob pays $60, split B, C equally ($30 each)
  // S1: Charlie pays Bob $80 (entangled, pays E2 and some other stuff)
  const e1_s3 = { ...e1_s1 };
  const e2_s3 = { ...e2_s1 };
  const s1_s3 = {
    id: "s1",
    debtor_id: "person-c",
    creditor_id: "person-b",
    amount_settled: 80,
    settled_at: "2026-05-31T09:06:00Z", // within 60s of E2
    marked_by_user_id: "user-admin"
  };

  const initialExpenses_s3 = [e1_s3, e2_s3];
  const initialSettlements_s3 = [s1_s3];

  // Exclude E2 with pro_rata_adjust
  const state_s3 = executeExclusionStrategy("pro_rata_adjust", e2_s3, initialExpenses_s3, initialSettlements_s3);
  
  // Verification of simulated DB state:
  // E2 total amount = 60. S1 settled = 80.
  // entangledAmount = min(80, 60) = 60.
  // remainingAmount = 80 - 60 = 20.
  // S1 must be patched to amount_settled: 20 and not archived.
  const modifiedS1_s3 = state_s3.settlements.find(s => s.id === "s1");
  assert.strictEqual(modifiedS1_s3.amount_settled, 20.00);
  assert.strictEqual(modifiedS1_s3.is_archived || false, false);
  console.log("  ✓ Settlement payment S1 scaled down to remaining $20.00 and kept active!");

  const balances_s3 = calculateNetBalances(people, state_s3.expenses, state_s3.settlements);
  console.log("  Computed Balances under Pro-Rata Scale Down:", balances_s3);
  
  // Active: E1 (+60, -30, -30) and settlement of 20 from C to B.
  // Alice: +60
  // Bob: -30 + 20 = -10
  // Charlie: -30 - 20 = -50
  assert.strictEqual(balances_s3["person-a"], 60.00);
  assert.strictEqual(balances_s3["person-b"], -50.00);
  assert.strictEqual(balances_s3["person-c"], -10.00);
  assertZeroSum(balances_s3, "SCENARIO 3");

  const txs_s3 = calculateSimplifiedTransactions(people, state_s3.expenses, state_s3.settlements);
  console.log("  Simplified routing under Pro-Rata Scale Down:", txs_s3);
  assertTransactionVolume(balances_s3, txs_s3, "SCENARIO 3");

  // =========================================================================
  console.log("\n--- SCENARIO 4: Unlink & Archive (Voiding Past Payments) ---");
  // Setup: E2 is excluded, S1 (Charlie pays Bob $30) is entangled.
  // Unlink & Archive will archive S1 completely.
  const e1_s4 = { ...e1_s1 };
  const e2_s4 = { ...e2_s1 };
  const s1_s4 = { ...s1_s2 };

  const initialExpenses_s4 = [e1_s4, e2_s4];
  const initialSettlements_s4 = [s1_s4];

  // Exclude E2 with unlink_and_archive
  const state_s4 = executeExclusionStrategy("unlink_and_archive", e2_s4, initialExpenses_s4, initialSettlements_s4);
  
  // Verification:
  const modifiedS1_s4 = state_s4.settlements.find(s => s.id === "s1");
  assert.strictEqual(modifiedS1_s4.is_archived, true);
  console.log("  ✓ Settlement payment S1 completely archived successfully!");

  const balances_s4 = calculateNetBalances(people, state_s4.expenses, state_s4.settlements);
  console.log("  Computed Balances under Unlink & Archive:", balances_s4);
  assert.strictEqual(balances_s4["person-a"], 60.00);
  assert.strictEqual(balances_s4["person-b"], -30.00);
  assert.strictEqual(balances_s4["person-c"], -30.00);
  assertZeroSum(balances_s4, "SCENARIO 4");

  // =========================================================================
  console.log("\n--- SCENARIO 5: Edge Case - Partial Over-Settlement (Refund Alert) ---");
  // Setup:
  // E1: Alice pays $90, split A, B, C equally ($30 each).
  // S1: Bob pays Alice $40 (originally a $10 overpayment on E1).
  // E1 is excluded, but we keep S1 active (Lock & Carry style).
  // With E1 excluded, baseline balances are 0.
  // Settlement payment S1 of $40 from Bob to Alice makes Bob +40, Alice -40.
  // This verifies that the engine continues to process this logically, showing B's credit and A's debt correctly.
  const e1_s5 = { ...e1_s1 };
  const s1_s5 = {
    id: "s1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount_settled: 40,
    settled_at: "2026-05-31T09:05:00Z",
    marked_by_user_id: "user-admin"
  };

  const initialExpenses_s5 = [e1_s5];
  const initialSettlements_s5 = [s1_s5];

  const state_s5 = executeExclusionStrategy("lock_and_carry", e1_s5, initialExpenses_s5, initialSettlements_s5);
  const balances_s5 = calculateNetBalances(people, state_s5.expenses, state_s5.settlements);
  console.log("  Balances after E1 exclusion (Overpaid S1 kept active):", balances_s5);
  
  assert.strictEqual(balances_s5["person-a"], -40.00, "Alice should have a negative balance of -$40.00");
  assert.strictEqual(balances_s5["person-b"], 40.00, "Bob should have a positive balance of $40.00");
  assert.strictEqual(balances_s5["person-c"], 0.00);
  assertZeroSum(balances_s5, "SCENARIO 5");

  // Simplified transactions should show Alice paying Bob $40 back
  const txs_s5 = calculateSimplifiedTransactions(people, state_s5.expenses, state_s5.settlements);
  console.log("  Transactions after E1 exclusion:", txs_s5);
  assert.strictEqual(txs_s5.length, 1);
  assert.strictEqual(txs_s5[0].from, "person-a");
  assert.strictEqual(txs_s5[0].to, "person-b");
  assert.strictEqual(txs_s5[0].amount, 40.00);
  console.log("  ✓ Edge Case 1: Partial over-settlement is mathematically safe!");

  // =========================================================================
  console.log("\n--- SCENARIO 6: Edge Case - Penny Rounding Safety ---");
  // Setup:
  // Splitting $100.00 equally among 3 people.
  // Shares should be 33.33, 33.33, 33.34.
  // E1: Alice pays $100.00.
  const e1_s6 = {
    id: "e1",
    description: "Rounding Test Dinner",
    total_amount: 100,
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 33.33 }, { personId: "person-b", amount: 33.33 }, { personId: "person-c", amount: 33.34 }],
    created_at: "2026-05-31T09:00:00Z"
  };

  assertConservationOfCash(e1_s6, "SCENARIO 6");
  const balances_s6 = calculateNetBalances(people, [e1_s6], []);
  console.log("  Computed penny split balances:", balances_s6);
  assertZeroSum(balances_s6, "SCENARIO 6");

  // Exclude E1
  const state_s6 = executeExclusionStrategy("lock_and_carry", e1_s6, [e1_s6], []);
  const balances_s6_excluded = calculateNetBalances(people, state_s6.expenses, state_s6.settlements);
  console.log("  Balances after E1 exclusion:", balances_s6_excluded);
  assert.strictEqual(balances_s6_excluded["person-a"], 0.00);
  assert.strictEqual(balances_s6_excluded["person-b"], 0.00);
  assert.strictEqual(balances_s6_excluded["person-c"], 0.00);
  assertZeroSum(balances_s6_excluded, "SCENARIO 6 (Excluded)");
  console.log("  ✓ Edge Case 2: Penny-rounding checks passed perfectly!");

  // =========================================================================
  console.log("\n--- SCENARIO 7: Edge Case - Zero-Debt Exclusion ---");
  // Exclude a $0.00 expense.
  const e1_s7 = {
    id: "e1",
    description: "Free park entry",
    total_amount: 0,
    paid_by: [],
    split_method: "equal",
    shares: [],
    created_at: "2026-05-31T09:00:00Z"
  };
  
  const state_s7 = executeExclusionStrategy("lock_and_carry", e1_s7, [e1_s7], []);
  const balances_s7 = calculateNetBalances(people, state_s7.expenses, state_s7.settlements);
  console.log("  Balances after $0.00 exclusion:", balances_s7);
  assert.strictEqual(balances_s7["person-a"], 0.00);
  assertZeroSum(balances_s7, "SCENARIO 7");
  console.log("  ✓ Edge Case 3: Zero-debt exclusion operates cleanly!");

  console.log("\n=============================================================");
  console.log("   ALL DYNAMIC EXCLUSION STRATEGY SCENARIOS PASSED SECURELY! ");
  console.log("=============================================================");

} catch (err) {
  console.error("\n❌ TEST FAILURE DETECTED IN DYNAMIC EXCLUSION SUITE:");
  console.error(err);
  fs.unlinkSync(tempFile);
  process.exit(1);
}

fs.unlinkSync(tempFile);
process.exit(0);
