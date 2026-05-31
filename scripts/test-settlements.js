const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=========================================");
console.log("   SETTLEASE SETTLEMENT ENGINE TESTS     ");
console.log("=========================================");

// 1. Transpile settlementCalculations.ts dynamically
const tsPath = path.join(__dirname, '../src/lib/settleease/settlementCalculations.ts');
const tsCode = fs.readFileSync(tsPath, 'utf8');

const jsCode = ts.transpileModule(tsCode, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

const tempFile = path.join(__dirname, 'temp-settlementCalculations.js');
fs.writeFileSync(tempFile, jsCode);

let calculateNetBalances, calculateSimplifiedTransactions, calculatePairwiseTransactions;

try {
  const engine = require(tempFile);
  calculateNetBalances = engine.calculateNetBalances;
  calculateSimplifiedTransactions = engine.calculateSimplifiedTransactions;
  calculatePairwiseTransactions = engine.calculatePairwiseTransactions;
} catch (err) {
  console.error("Failed to load transpiled engine:", err);
  fs.unlinkSync(tempFile);
  process.exit(1);
}

// 2. Define standard mock people
const people = [
  { id: "person-a", name: "Alice" },
  { id: "person-b", name: "Bob" },
  { id: "person-c", name: "Charlie" }
];

// Helper to assert Zero-Sum Invariant
function assertZeroSum(balances, scenarioName) {
  const sum = Object.values(balances).reduce((acc, val) => acc + val, 0);
  const roundedSum = Math.round(sum * 100) / 100;
  assert.strictEqual(roundedSum, 0.00, `[${scenarioName}] Zero-sum invariant violated: Sum of balances is ${roundedSum} (expected 0.00)`);
  console.log(`  ✓ [Invariant 1] Zero-Sum check passed (Sum = 0.00)`);
}

// Helper to assert Cash Conservation Invariant
function assertConservationOfCash(expense, scenarioName) {
  if (expense.exclude_from_settlement) return;
  const totalPaid = expense.paid_by.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalShares = expense.shares.reduce((sum, s) => sum + Number(s.amount), 0);
  const celebration = expense.celebration_contribution ? Number(expense.celebration_contribution.amount) : 0;
  const totalAllocated = Math.round((totalShares + celebration) * 100) / 100;
  assert.strictEqual(totalPaid, totalAllocated, `[${scenarioName}] Conservation of cash violated: Total Paid (${totalPaid}) !== Total Allocated (${totalAllocated})`);
  console.log(`  ✓ [Invariant 2] Conservation of Cash passed (${totalPaid} == ${totalAllocated})`);
}

// Helper to assert Simplified Transaction Volume Matching
function assertTransactionVolume(netBalances, transactions, scenarioName) {
  const totalOwed = Object.values(netBalances)
    .filter(b => b > 0)
    .reduce((sum, b) => sum + b, 0);
  const totalSettled = transactions.reduce((sum, t) => sum + t.amount, 0);
  const roundedOwed = Math.round(totalOwed * 100) / 100;
  const roundedSettled = Math.round(totalSettled * 100) / 100;
  assert.strictEqual(roundedSettled, roundedOwed, `[${scenarioName}] Invariant 4 violated: Total settled in simplified routing (${roundedSettled}) !== Total positive outstanding balance (${roundedOwed})`);
  console.log(`  ✓ [Invariant 4] Transaction Volume Matching passed (Total settled = ${roundedSettled})`);
}

// Run Test Cases
try {
  // ----------------------------------------------------
  console.log("\nScenario TS-001: 3-way Equal Split of a single expense");
  const exp1 = {
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
  };

  assertConservationOfCash(exp1, "TS-001");
  const balances1 = calculateNetBalances(people, [exp1], []);
  console.log("  Computed net balances:", balances1);
  assert.strictEqual(balances1["person-a"], 40);
  assert.strictEqual(balances1["person-b"], -20);
  assert.strictEqual(balances1["person-c"], -20);
  assertZeroSum(balances1, "TS-001");

  const txs1 = calculateSimplifiedTransactions(people, [exp1], []);
  console.log("  Simplified transactions:", txs1);
  assertTransactionVolume(balances1, txs1, "TS-001");

  // ----------------------------------------------------
  console.log("\nScenario TS-002: Unequal split with custom share amounts");
  const exp2 = {
    id: "exp-2",
    description: "Concert tickets",
    total_amount: 100,
    category: "Entertainment",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "unequal",
    shares: [
      { personId: "person-a", amount: 50 },
      { personId: "person-b", amount: 30 },
      { personId: "person-c", amount: 20 }
    ],
    exclude_from_settlement: false
  };

  assertConservationOfCash(exp2, "TS-002");
  const balances2 = calculateNetBalances(people, [exp2], []);
  console.log("  Computed net balances:", balances2);
  assert.strictEqual(balances2["person-a"], 50);
  assert.strictEqual(balances2["person-b"], -30);
  assert.strictEqual(balances2["person-c"], -20);
  assertZeroSum(balances2, "TS-002");

  const txs2 = calculateSimplifiedTransactions(people, [exp2], []);
  console.log("  Simplified transactions:", txs2);
  assertTransactionVolume(balances2, txs2, "TS-002");

  // ----------------------------------------------------
  console.log("\nScenario TS-003: Split with celebration contribution");
  const exp3 = {
    id: "exp-3",
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
  };

  assertConservationOfCash(exp3, "TS-003");
  const balances3 = calculateNetBalances(people, [exp3], []);
  console.log("  Computed net balances:", balances3);
  assert.strictEqual(balances3["person-a"], 55); // 100 - 45
  assert.strictEqual(balances3["person-b"], -55); // -45 - 10
  assertZeroSum(balances3, "TS-003");

  const txs3 = calculateSimplifiedTransactions(people, [exp3], []);
  console.log("  Simplified transactions:", txs3);
  assertTransactionVolume(balances3, txs3, "TS-003");

  // ----------------------------------------------------
  console.log("\nScenario TS-004: Expense marked as excluded from settlements");
  const exp4 = {
    id: "exp-4",
    description: "Private Gift",
    total_amount: 60,
    category: "Gift",
    paid_by: [{ personId: "person-a", amount: 60 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 20 },
      { personId: "person-b", amount: 20 },
      { personId: "person-c", amount: 20 }
    ],
    exclude_from_settlement: true
  };

  const balances4 = calculateNetBalances(people, [exp4], []);
  console.log("  Computed net balances (should be zero):", balances4);
  assert.strictEqual(balances4["person-a"], 0);
  assert.strictEqual(balances4["person-b"], 0);
  assert.strictEqual(balances4["person-c"], 0);
  assertZeroSum(balances4, "TS-004");

  // ----------------------------------------------------
  console.log("\nScenario TS-005: Excluded expense alongside pre-recorded settlement");
  // If a standard expense was settled, but then the expense was excluded:
  const settlement = {
    id: "settle-1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount_settled: 20,
    settled_at: "2026-05-31T09:00:00Z",
    marked_by_user_id: "user-admin"
  };

  const balances5 = calculateNetBalances(people, [exp4], [settlement]);
  console.log("  Computed net balances (settlement registered but expense excluded):", balances5);
  // Debtor (person-b) has paid 20. Creditor (person-a) has received 20.
  // Since expense is excluded, basic balance is 0.
  // After settlement adjustment: person-b: +20, person-a: -20.
  assert.strictEqual(balances5["person-b"], 20);
  assert.strictEqual(balances5["person-a"], -20);
  assert.strictEqual(balances5["person-c"], 0);
  assertZeroSum(balances5, "TS-005");

  // ----------------------------------------------------
  console.log("\nScenario TS-006: Active manual override on outstanding debts");
  const baseExpense = {
    id: "exp-base",
    description: "Trip lodging",
    total_amount: 150,
    category: "Rent",
    paid_by: [{ personId: "person-a", amount: 150 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 50 },
      { personId: "person-b", amount: 50 },
      { personId: "person-c", amount: 50 }
    ],
    exclude_from_settlement: false
  };

  const manualOverride = {
    id: "override-1",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount: 35, // Charlie owes A 50, B owes A 50. Override says B pays A 35.
    is_active: true
  };

  const balances6 = calculateNetBalances(people, [baseExpense], []);
  console.log("  Standard net balances:", balances6);

  const txs6 = calculateSimplifiedTransactions(people, [baseExpense], [], [manualOverride]);
  console.log("  Simplified transactions with active override:", txs6);
  
  // The first transaction should match the manual override of $35
  const overrideTx = txs6.find(t => t.from === "person-b" && t.to === "person-a");
  assert.ok(overrideTx, "Manual override transaction was not generated");
  assert.strictEqual(overrideTx.amount, 35, "Override amount should be capped at \$35.00");

  // The remaining $15 from Bob and $50 from Charlie should also be resolved
  const totalBobPaid = txs6.filter(t => t.from === "person-b").reduce((sum, t) => sum + t.amount, 0);
  assert.strictEqual(totalBobPaid, 50, "Bob should settle \$50.00 total");
  
  const totalCharliePaid = txs6.filter(t => t.from === "person-c").reduce((sum, t) => sum + t.amount, 0);
  assert.strictEqual(totalCharliePaid, 50, "Charlie should settle \$50.00 total");

  assertZeroSum(balances6, "TS-006");

  // ----------------------------------------------------
  console.log("\nScenario TS-007: Direct reciprocal netting between individuals");
  const e1 = {
    id: "e-1",
    description: "Paid by A for A & B",
    total_amount: 60,
    paid_by: [{ personId: "person-a", amount: 60 }],
    shares: [{ personId: "person-a", amount: 30 }, { personId: "person-b", amount: 30 }]
  };
  const e2 = {
    id: "e-2",
    description: "Paid by B for B & C",
    total_amount: 40,
    paid_by: [{ personId: "person-b", amount: 40 }],
    shares: [{ personId: "person-b", amount: 20 }, { personId: "person-c", amount: 20 }]
  };
  const e3 = {
    id: "e-3",
    description: "Paid by C for A & C",
    total_amount: 20,
    paid_by: [{ personId: "person-c", amount: 20 }],
    shares: [{ personId: "person-a", amount: 10 }, { personId: "person-c", amount: 10 }]
  };

  const pairwiseTxs = calculatePairwiseTransactions(people, [e1, e2, e3], []);
  console.log("  Pairwise transactions computed:", pairwiseTxs);

  // Bob owes A 30 (from e-1)
  // C owes B 20 (from e-2)
  // A owes C 10 (from e-3)
  // Assert direct relations
  const bToA = pairwiseTxs.find(t => t.from === "person-b" && t.to === "person-a");
  const cToB = pairwiseTxs.find(t => t.from === "person-c" && t.to === "person-b");
  const aToC = pairwiseTxs.find(t => t.from === "person-a" && t.to === "person-c");

  assert.ok(bToA && bToA.amount === 30, "Bob should owe Alice \$30.00 directly");
  assert.ok(cToB && cToB.amount === 20, "Charlie should owe Bob \$20.00 directly");
  assert.ok(aToC && aToC.amount === 10, "Alice should owe Charlie \$10.00 directly");

  // Invariant 6 Reciprocal Netting Balance check
  const calculatedBalances = calculateNetBalances(people, [e1, e2, e3], []);
  console.log("  Standard net balances for TS-007:", calculatedBalances);
  // Alice balance: +60 - 30 (e-1 share) - 10 (e-3 share) = +20.
  // Alice pairwise netting: -10 (owes C) + 30 (B owes A) = +20.
  assert.strictEqual(calculatedBalances["person-a"], 20);
  assert.strictEqual(calculatedBalances["person-b"], -10);
  assert.strictEqual(calculatedBalances["person-c"], -10);

  // Sum of net pairwise debts for C = -20 (owes B) - 10 (owes A from C owes A? C paid 20 for A & C, so A owes C 10. Thus C is owed 10 from A, and owes B 20. Net C balance: -20 + 10 = -10? Wait, let's look at net balances:
  // e-1: A paid 60, shares A:30, B:30.  --> A balance += 30, B balance -= 30.
  // e-2: B paid 40, shares B:20, C:20.  --> B balance += 20, C balance -= 20.
  // e-3: C paid 20, shares A:10, C:10.  --> C balance += 10, A balance -= 10.
  // Net:
  // Alice: +30 - 10 = +20
  // Bob: -30 + 20 = -10
  // Charlie: -20 + 10 = -10
  // Let's assert:
  assert.strictEqual(calculatedBalances["person-a"], 20, "Alice net balance should be +20");
  assert.strictEqual(calculatedBalances["person-b"], -10, "Bob net balance should be -10");
  assert.strictEqual(calculatedBalances["person-c"], -10, "Charlie net balance should be -10");

  console.log("  ✓ [Invariant 6] Reciprocal Pairwise Netting verified successfully");

  // ----------------------------------------------------
  console.log("\nScenario TS-008: Bob's Netting, Bob's Exclusion, Charlie's Payments, & Invariants");
  
  // 1. Setup the scenario
  // E1: Alice pays $90, split A, B, C equally ($30 each)
  const e1_ts8 = {
    id: "e1-ts8",
    description: "Dinner by Alice",
    total_amount: 90,
    paid_by: [{ personId: "person-a", amount: 90 }],
    shares: [
      { personId: "person-a", amount: 30 },
      { personId: "person-b", amount: 30 },
      { personId: "person-c", amount: 30 }
    ],
    exclude_from_settlement: false
  };

  // E2: Bob pays $60, split B, C equally ($30 each) - Bob's contributing-expense netting
  const e2_ts8 = {
    id: "e2-ts8",
    description: "Drinks by Bob",
    total_amount: 60,
    paid_by: [{ personId: "person-b", amount: 60 }],
    shares: [
      { personId: "person-b", amount: 30 },
      { personId: "person-c", amount: 30 }
    ],
    exclude_from_settlement: false
  };

  assertConservationOfCash(e1_ts8, "TS-008 (E1)");
  assertConservationOfCash(e2_ts8, "TS-008 (E2)");

  // Calculate base balances:
  // Alice: +90 - 30 = +60
  // Bob: -30 (from E1) + 60 - 30 (from E2) = 0
  // Charlie: -30 (from E1) - 30 (from E2) = -60
  const balances8_base = calculateNetBalances(people, [e1_ts8, e2_ts8], []);
  console.log("  Initial Net Balances (Bob's netting):", balances8_base);
  assert.strictEqual(balances8_base["person-a"], 60, "Alice should be owed $60.00");
  assert.strictEqual(balances8_base["person-b"], 0, "Bob should have exactly $0.00 balance");
  assert.strictEqual(balances8_base["person-c"], -60, "Charlie should owe $60.00");
  assertZeroSum(balances8_base, "TS-008 (Base)");

  // Check simplified transactions
  const txs8_base = calculateSimplifiedTransactions(people, [e1_ts8, e2_ts8], []);
  console.log("  Simplified transactions before settlement:", txs8_base);
  assert.strictEqual(txs8_base.length, 1, "There should be exactly one transaction");
  assert.strictEqual(txs8_base[0].from, "person-c", "Transaction should be from Charlie");
  assert.strictEqual(txs8_base[0].to, "person-a", "Transaction should be to Alice");
  assert.strictEqual(txs8_base[0].amount, 60, "Transaction should be for $60.00");
  assertTransactionVolume(balances8_base, txs8_base, "TS-008 (Base)");

  // 2. Charlie's payments: Charlie settles by paying Alice $60
  const settle8 = {
    id: "settle-ts8",
    debtor_id: "person-c",
    creditor_id: "person-a",
    amount_settled: 60,
    settled_at: "2026-05-31T09:30:00Z",
    marked_by_user_id: "user-admin"
  };

  const balances8_settled = calculateNetBalances(people, [e1_ts8, e2_ts8], [settle8]);
  console.log("  Net Balances after Charlie's payment:", balances8_settled);
  assert.strictEqual(balances8_settled["person-a"], 0, "Alice balance should be $0.00 after settlement");
  assert.strictEqual(balances8_settled["person-b"], 0, "Bob balance should be $0.00");
  assert.strictEqual(balances8_settled["person-c"], 0, "Charlie balance should be $0.00 after settlement");
  assertZeroSum(balances8_settled, "TS-008 (Settled)");

  // 3. Bob's debt exclusion: E2 is retroactively excluded from settlement (loose netting behavior)
  const e2_ts8_excluded = { ...e2_ts8, exclude_from_settlement: true };

  const balances8_excluded = calculateNetBalances(people, [e1_ts8, e2_ts8_excluded], [settle8]);
  console.log("  Net Balances after E2 exclusion (loose netting):", balances8_excluded);
  // With E2 excluded:
  // E1 is the only active expense.
  // Alice: +90 - 30 = +60 (before settlement). After settlement: +60 - 60 = 0.
  // Bob: -30 (from E1) (before settlement). After settlement: -30.
  // Charlie: -30 (from E1) (before settlement). After settlement: -30 + 60 = +30.
  // So: Alice = 0, Bob = -30, Charlie = +30.
  assert.strictEqual(balances8_excluded["person-a"], 0, "Alice should be at $0.00");
  assert.strictEqual(balances8_excluded["person-b"], -30, "Bob should now owe $30.00 due to exclusion shift");
  assert.strictEqual(balances8_excluded["person-c"], 30, "Charlie should be owed $30.00 (refund credit)");
  assertZeroSum(balances8_excluded, "TS-008 (Excluded)");

  // Output simplified transactions under loose netting:
  const txs8_excluded = calculateSimplifiedTransactions(people, [e1_ts8, e2_ts8_excluded], [settle8]);
  console.log("  Simplified transactions after exclusion (loose netting):", txs8_excluded);
  // Under simplified path: Bob owes Charlie $30 (phantom debt)
  assert.strictEqual(txs8_excluded.length, 1, "There should be exactly one transaction");
  assert.strictEqual(txs8_excluded[0].from, "person-b", "Debtor should be Bob");
  assert.strictEqual(txs8_excluded[0].to, "person-c", "Creditor should be Charlie");
  assert.strictEqual(txs8_excluded[0].amount, 30, "Transaction should be for $30.00");
  assertTransactionVolume(balances8_excluded, txs8_excluded, "TS-008 (Excluded)");

  // 4. Proposed Hard-Linked Model Verification
  // Under the proposed Option A (Direct Linking):
  // When E2 is excluded, its linked settlement portion is ignored.
  // Since E2 represented $30 of Charlie's $60 payment (the part that settled Bob's netting contribution),
  // excluding E2 reduces Charlie's settlement payment's active amount to $30 (linked only to E1).
  // Corrected active settlement amount: $30.
  const settle8_linked = { ...settle8, amount_settled: 30 }; // Simulated result of unlink
  const balances8_corrected = calculateNetBalances(people, [e1_ts8, e2_ts8_excluded], [settle8_linked]);
  console.log("  Net Balances after Hard-Linked Correction:", balances8_corrected);
  // Alice: +60 (from E1) - 30 (corrected settlement) = +30.
  // Bob: -30 (from E1) = -30.
  // Charlie: -30 (from E1) + 30 (corrected settlement) = 0.
  assert.strictEqual(balances8_corrected["person-a"], 30, "Alice should be owed $30.00");
  assert.strictEqual(balances8_corrected["person-b"], -30, "Bob should owe $30.00");
  assert.strictEqual(balances8_corrected["person-c"], 0, "Charlie should be fully settled at $0.00");
  assertZeroSum(balances8_corrected, "TS-008 (Corrected)");

  const txs8_corrected = calculateSimplifiedTransactions(people, [e1_ts8, e2_ts8_excluded], [settle8_linked]);
  console.log("  Simplified transactions after correction:", txs8_corrected);
  // Correct transaction: Bob pays Alice $30. No phantom debts or circular routes!
  assert.strictEqual(txs8_corrected.length, 1, "There should be exactly one transaction");
  assert.strictEqual(txs8_corrected[0].from, "person-b", "Bob should pay Alice");
  assert.strictEqual(txs8_corrected[0].to, "person-a", "Alice should receive");
  assert.strictEqual(txs8_corrected[0].amount, 30, "Transaction should be for $30.00");
  assertTransactionVolume(balances8_corrected, txs8_corrected, "TS-008 (Corrected)");

  console.log("  ✓ [TS-008] Complex Bob Netting & Exclusion Scenarios verified perfectly!");

  console.log("\n=========================================");
  console.log("   ALL TEST SCENARIOS PASSED SUCCESSFULLY!");
  console.log("=========================================");
} catch (err) {
  console.error("\n❌ TEST FAILURE DETECTED:");
  console.error(err);
  fs.unlinkSync(tempFile);
  process.exit(1);
}

fs.unlinkSync(tempFile);
process.exit(0);
