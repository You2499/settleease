const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=====================================================");
console.log("   SETTLEASE EXPENSE EXCLUSION IMPACT VERIFICATION   ");
console.log("=====================================================");

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

// Mock People definition matching DTO shapes
const people = [
  { id: "person-a", name: "Alice" },
  { id: "person-b", name: "Bob" },
  { id: "person-c", name: "Charlie" }
];

// Helper to calculate impact of exclusion
function analyzeExpenseExclusionImpact(expenseToToggle, expensesList, settlementsList, overridesList) {
  // 1. Calculate Baseline Net Balances and Transactions
  const baselineBalances = calculateNetBalances(people, expensesList, settlementsList);
  const baselineTransactions = calculateSimplifiedTransactions(people, expensesList, settlementsList, overridesList);

  // 2. Formulate Prospective Expenses list
  const prospectiveExpensesList = expensesList.map(e => {
    if (e.id === expenseToToggle.id) {
      return { ...e, exclude_from_settlement: true };
    }
    return e;
  });

  // 3. Calculate Prospective Net Balances and Transactions
  const prospectiveBalances = calculateNetBalances(people, prospectiveExpensesList, settlementsList);
  const prospectiveTransactions = calculateSimplifiedTransactions(people, prospectiveExpensesList, settlementsList, overridesList);

  // 4. Calculate Deltas and Warnings
  const balanceImpacts = people.map(p => {
    const baseVal = baselineBalances[p.id] || 0;
    const prospectiveVal = prospectiveBalances[p.id] || 0;
    const delta = Math.round((prospectiveVal - baseVal) * 100) / 100;
    
    let effect = "no_change";
    if (baseVal > 0 && prospectiveVal < baseVal) effect = "reduces_credit";
    if (baseVal < 0 && prospectiveVal > baseVal) effect = "reduces_debt";
    if (baseVal === 0 && prospectiveVal > 0) effect = "creates_credit";
    if (baseVal === 0 && prospectiveVal < 0) effect = "creates_debt";
    if (baseVal > 0 && prospectiveVal < 0) effect = "owes_refund";
    if (baseVal < 0 && prospectiveVal > 0) effect = "creates_refund";

    return {
      personId: p.id,
      personName: p.name,
      baselineBalance: baseVal,
      prospectiveBalance: prospectiveVal,
      delta,
      effect
    };
  });

  // 5. Look for Over-Settlements
  const overSettlements = [];
  settlementsList.forEach(payment => {
    const debtorId = payment.debtor_id;
    const creditorId = payment.creditor_id;
    
    // Check active debt under prospective state (excluding E1)
    const baseProspectiveBalances = calculateNetBalances(people, prospectiveExpensesList, []);
    const activeDebt = Math.abs(baseProspectiveBalances[debtorId] || 0);

    if (payment.amount_settled > activeDebt) {
      const amountOverSettled = Math.round((payment.amount_settled - activeDebt) * 100) / 100;
      overSettlements.push({
        debtorId,
        debtorName: people.find(p => p.id === debtorId).name,
        creditorId,
        creditorName: people.find(p => p.id === creditorId).name,
        amountOverSettled
      });
    }
  });

  return {
    baselineBalances,
    baselineTransactions,
    prospectiveBalances,
    prospectiveTransactions,
    balanceImpacts,
    overSettlements
  };
}

try {
  // ----------------------------------------------------
  console.log("\nTesting Scenario TS-EXC-001 (Standard Settlement Exclusion)...");
  const e1 = {
    id: "e1",
    description: "Dinner",
    total_amount: 90,
    paid_by: [{ personId: "person-a", amount: 90 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 30 }, { personId: "person-b", amount: 30 }, { personId: "person-c", amount: 30 }],
    exclude_from_settlement: false
  };

  const impact1 = analyzeExpenseExclusionImpact(e1, [e1], [], []);
  
  assert.strictEqual(impact1.baselineBalances["person-a"], 60.00);
  assert.strictEqual(impact1.baselineBalances["person-b"], -30.00);
  assert.strictEqual(impact1.prospectiveBalances["person-a"], 0.00);
  assert.strictEqual(impact1.prospectiveBalances["person-b"], 0.00);
  assert.strictEqual(impact1.balanceImpacts.find(p => p.personId === "person-a").delta, -60.00);
  assert.strictEqual(impact1.balanceImpacts.find(p => p.personId === "person-b").delta, 30.00);
  console.log("  ✓ TS-EXC-001 Invariants and Deltas passed verification!");

  // ----------------------------------------------------
  console.log("\nTesting Scenario TS-EXC-002 (Exclusion with Pre-Existing Settlement)...");
  const e2 = {
    id: "e2",
    description: "Concert Tickets",
    total_amount: 120,
    paid_by: [{ personId: "person-a", amount: 120 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 40 }, { personId: "person-b", amount: 40 }, { personId: "person-c", amount: 40 }],
    exclude_from_settlement: false
  };
  const s2 = {
    id: "s2",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount_settled: 40,
    settled_at: "2026-05-31T09:00:00Z",
    marked_by_user_id: "user-admin"
  };

  const impact2 = analyzeExpenseExclusionImpact(e2, [e2], [s2], []);

  assert.strictEqual(impact2.baselineBalances["person-a"], 40.00);
  assert.strictEqual(impact2.baselineBalances["person-b"], 0.00);
  assert.strictEqual(impact2.prospectiveBalances["person-a"], -40.00);
  assert.strictEqual(impact2.prospectiveBalances["person-b"], 40.00);
  
  const refundWarning = impact2.overSettlements.find(o => o.debtorId === "person-b");
  assert.ok(refundWarning, "Refund alert was not triggered");
  assert.strictEqual(refundWarning.amountOverSettled, 40.00);
  console.log("  ✓ TS-EXC-002 Refund Warnings and Reverse Balances passed verification!");

  // ----------------------------------------------------
  console.log("\nTesting Scenario TS-EXC-003 (Multi-Payer / Unequal Split / Celebration)...");
  const e3 = {
    id: "e3",
    description: "Shared Airbnb & Birthday Dinner",
    total_amount: 300,
    paid_by: [{ personId: "person-a", amount: 200 }, { personId: "person-b", amount: 100 }],
    split_method: "unequal",
    shares: [{ personId: "person-a", amount: 90 }, { personId: "person-b", amount: 140 }, { personId: "person-c", amount: 50 }],
    celebration_contribution: { personId: "person-c", amount: 20 },
    exclude_from_settlement: false
  };

  const impact3 = analyzeExpenseExclusionImpact(e3, [e3], [], []);

  assert.strictEqual(impact3.baselineBalances["person-a"], 110.00);
  assert.strictEqual(impact3.baselineBalances["person-b"], -40.00);
  assert.strictEqual(impact3.baselineBalances["person-c"], -70.00);
  assert.strictEqual(impact3.prospectiveBalances["person-a"], 0.00);
  assert.strictEqual(impact3.balanceImpacts.find(p => p.personId === "person-c").delta, 70.00);
  console.log("  ✓ TS-EXC-003 Multi-Payer Compound Splits passed verification!");

  // ----------------------------------------------------
  console.log("\nTesting Scenario TS-EXC-004 (Exclusion with Active Manual Overrides)...");
  const e4 = {
    id: "e4",
    description: "Cabin Booking",
    total_amount: 300,
    paid_by: [{ personId: "person-a", amount: 300 }],
    split_method: "equal",
    shares: [{ personId: "person-a", amount: 100 }, { personId: "person-b", amount: 100 }, { personId: "person-c", amount: 100 }],
    exclude_from_settlement: false
  };
  const o4 = {
    id: "o4",
    debtor_id: "person-b",
    creditor_id: "person-a",
    amount: 60,
    is_active: true
  };

  const impact4 = analyzeExpenseExclusionImpact(e4, [e4], [], [o4]);

  assert.strictEqual(impact4.baselineTransactions.length, 3, "Baseline must have 3 transactions");
  assert.strictEqual(impact4.prospectiveTransactions.length, 0, "Prospective must have 0 transactions");
  console.log("  ✓ TS-EXC-004 Manual Override Bypass passed verification!");

  console.log("\n=====================================================");
  console.log("   ALL EXPENSE EXCLUSION IMPACT SCENARIOS PASSED!    ");
  console.log("=====================================================");
} catch (err) {
  console.error("\n❌ TEST FAILURE DETECTED:");
  console.error(err);
  fs.unlinkSync(tempFile);
  process.exit(1);
}

fs.unlinkSync(tempFile);
process.exit(0);
