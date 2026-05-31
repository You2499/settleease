const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=============================================================");
const title = "       SETTLEASE LAHU DEBT SETTLEMENT VERIFICATION SUITE     ";
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

const tempFile = path.join(__dirname, 'temp-lahu-test.js');
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

// Setup standard mock people
const people = [
  { id: "person-a", name: "Alice" },
  { id: "person-b", name: "Bob" },
  { id: "person-c", name: "Charlie" }
];

try {
  console.log("\n--- SCENARIO 1: E1/E2 Bob-Netting-Exclusion under Lahu (Explicit Settlement) ---");
  // Setup:
  // E1 (Dinner): Alice pays $90, split A, B, C equally ($30 each)
  // E2 (Taxi): Bob pays $60, split B, C equally ($30 each)
  // S1: Charlie pays Alice $30 (associated with E1)
  
  const e1 = {
    id: "e1",
    description: "Dinner",
    total_amount: 90,
    paid_by: [{ personId: "person-a", amount: 90 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 30 }, { personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement",
    created_at: "2026-05-31T09:00:00Z"
  };

  const e2 = {
    id: "e2",
    description: "Taxi",
    total_amount: 60,
    paid_by: [{ personId: "person-b", amount: 60 }],
    split_method: "equal",
    shares: [{ personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    created_at: "2026-05-31T09:05:00Z"
  };

  const s1 = {
    id: "s1",
    debtor_id: "person-c",
    creditor_id: "person-a",
    amount_settled: 30,
    settled_at: "2026-05-31T09:06:00Z",
    associated_expense_id: "e1",
    marked_by_user_id: "user-admin"
  };

  const expenses = [e1, e2];
  const settlements = [s1];

  // 1. Verify general balances calculations
  const generalBalances = calculateNetBalances(people, expenses, settlements);
  console.log("  Computed General Balances (bypassing Lahu):", generalBalances);
  
  assert.strictEqual(generalBalances["person-a"], 0.00);
  assert.strictEqual(generalBalances["person-b"], 30.00);
  assert.strictEqual(generalBalances["person-c"], -30.00);
  console.log("  ✓ [Balances] General balances correctly isolate the Lahu expense!");

  // 2. Verify simplified transactions calculation
  const simplifiedTxs = calculateSimplifiedTransactions(people, expenses, settlements);
  console.log("  Calculated Simplified Transactions:", simplifiedTxs);

  assert.strictEqual(simplifiedTxs.length, 2);
  
  const directTx = simplifiedTxs.find(tx => tx.isDirect === true);
  const netTx = simplifiedTxs.find(tx => !tx.isDirect);

  assert.ok(directTx, "Outstanding Lahu debt must be appended as a direct transaction");
  assert.strictEqual(directTx.from, "person-b", "Bob must be the debtor for the direct E1 dinner share");
  assert.strictEqual(directTx.to, "person-a", "Alice must be the creditor for the direct E1 dinner share");
  assert.strictEqual(directTx.amount, 30.00, "Direct amount must be exactly Bob's dinner share ($30)");

  assert.ok(netTx, "Standard active expenses must produce normal simplified transactions");
  assert.strictEqual(netTx.from, "person-c");
  assert.strictEqual(netTx.to, "person-b");
  assert.strictEqual(netTx.amount, 30.00);

  console.log("  ✓ [Simplified Routing] Direct and global netting transactions are beautifully isolated and tagged!");

  // =========================================================================
  console.log("\n--- SCENARIO 2: Lahu Strategy with Legacy General (Unlinked 60s Window) Settlement ---");
  // Setup:
  // E1 (Dinner): Alice pays $90, split A, B, C equally ($30 each)
  // E2 (Taxi): Bob pays $60, split B, C equally ($30 each)
  // S1: Charlie pays Alice $30 (legacy general, not associated with E1 explicitly, but settled 60s after E1)
  
  const e1_s2 = {
    id: "e1",
    description: "Dinner",
    total_amount: 90,
    paid_by: [{ personId: "person-a", amount: 90 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 30 }, { personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement",
    created_at: "2026-05-31T09:00:00Z"
  };

  const e2_s2 = {
    id: "e2",
    description: "Taxi",
    total_amount: 60,
    paid_by: [{ personId: "person-b", amount: 60 }],
    split_method: "equal",
    shares: [{ personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    created_at: "2026-05-31T09:05:00Z"
  };

  const s1_s2 = {
    id: "s1",
    debtor_id: "person-c",
    creditor_id: "person-a",
    amount_settled: 30,
    settled_at: "2026-05-31T09:00:30Z", // within 60s window of E1
    associated_expense_id: null,        // UNLINKED legacy general!
    marked_by_user_id: "user-admin"
  };

  const expenses_s2 = [e1_s2, e2_s2];
  const settlements_s2 = [s1_s2];

  const simplifiedTxs_s2 = calculateSimplifiedTransactions(people, expenses_s2, settlements_s2);
  console.log("  Calculated Simplified Transactions (Legacy General):", simplifiedTxs_s2);

  // Expecting 2 transactions:
  // - Charlie pays Bob $30 (global simplified netting of E2)
  // - Bob pays Alice $30 (direct isolated unpaid share of E1, isDirect = true)
  // Charlie's $30 legacy general payment must be successfully matched and reduce his E1 unpaid share to $0!
  assert.strictEqual(simplifiedTxs_s2.length, 2);
  
  const directTx_s2 = simplifiedTxs_s2.find(tx => tx.isDirect === true);
  assert.ok(directTx_s2, "Outstanding Lahu debt must be appended");
  assert.strictEqual(directTx_s2.from, "person-b");
  assert.strictEqual(directTx_s2.to, "person-a");
  assert.strictEqual(directTx_s2.amount, 30.00);

  const charlieTx = simplifiedTxs_s2.find(tx => tx.from === "person-c" && tx.to === "person-a");
  assert.ok(!charlieTx, "Charlie's unlinked general settlement must be matched to E1, so Charlie owes Alice $0");

  console.log("  ✓ [Legacy Netting Bypass] Legacy general settlements are perfectly matched in Lahu calculations!");

  console.log("\n=============================================================");
  console.log("      LAHU DEBT SETTLEMENT STRATEGY FULLY VERIFIED! PASS!     ");
  console.log("=============================================================");

} catch (err) {
  console.error("\n❌ TEST FAILURE DETECTED IN LAHU STRATEGY TEST:");
  console.error(err);
  fs.unlinkSync(tempFile);
  process.exit(1);
}

fs.unlinkSync(tempFile);
process.exit(0);
