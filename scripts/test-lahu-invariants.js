const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=============================================================");
console.log("     SETTLEASE LAHU STRATEGY MATHEMATICAL INVARIANT TEST     ");
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

const tempFile = path.join(__dirname, 'temp-lahu-invariant-test.js');
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

// Global Invariant Checkers
function checkZeroSumInvariant(balances, context) {
  const sum = Object.values(balances).reduce((acc, val) => acc + val, 0);
  const roundedSum = Math.round(sum * 100) / 100;
  if (Math.abs(roundedSum) > 0.001) {
    console.error(`❌ [Zero-Sum Violation] in ${context}: Sum of balances is ${roundedSum} (expected 0.00)`);
    console.error("Balances:", balances);
    return false;
  }
  return true;
}

function checkCashConservation(expense, directTransactions, context) {
  // Calculates isolated net contributions for this specific expense
  const rawContributions = {};
  const paidMap = new Map((expense.paid_by || []).map(p => [p.personId, Number(p.amount)]));
  const shareMap = new Map((expense.shares || []).map(s => [s.personId, Number(s.amount)]));
  
  const participants = new Set([...paidMap.keys(), ...shareMap.keys()]);
  let totalDeficit = 0;
  let totalSurplus = 0;

  participants.forEach(pid => {
    const paid = paidMap.get(pid) || 0;
    let share = shareMap.get(pid) || 0;
    if (expense.celebration_contribution && expense.celebration_contribution.personId === pid) {
      share += Number(expense.celebration_contribution.amount);
    }
    const net = paid - share;
    rawContributions[pid] = net;
    if (net < -0.001) totalDeficit += Math.abs(net);
    if (net > 0.001) totalSurplus += net;
  });

  const sumDirectTxs = directTransactions
    .filter(tx => tx.isDirect && tx.contributingExpenseIds.includes(expense.id))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const roundedDeficit = Math.round(totalDeficit * 100) / 100;
  const roundedSurplus = Math.round(totalSurplus * 100) / 100;
  const roundedDirectTxs = Math.round(sumDirectTxs * 100) / 100;

  // Let's verify that the total deficit matches total surplus
  if (Math.abs(roundedDeficit - roundedSurplus) > 0.01) {
    console.error(`❌ [Math Inconsistency] in ${context}: Deficit (${roundedDeficit}) !== Surplus (${roundedSurplus})`);
    return false;
  }

  // Without any settlements, the sum of direct transactions MUST equal the total deficit
  if (Math.abs(roundedDirectTxs - roundedDeficit) > 0.001) {
    console.warn(`⚠️ [Penny Leak Detected] in ${context}: Sum of Lahu direct transactions (${roundedDirectTxs}) !== Total Deficit (${roundedDeficit})`);
    console.warn(`   Discrepancy: ${Math.round((roundedDeficit - roundedDirectTxs) * 100) / 100} USD`);
    return false; // Fail invariant check
  }

  return true;
}

try {
  const people = [
    { id: "person-a", name: "Alice" },
    { id: "person-b", name: "Bob" },
    { id: "person-c", name: "Charlie" },
    { id: "person-d", name: "David" }
  ];

  console.log("\n--- TEST SCENARIO A: Standard Rounding (Three-way Penny split) ---");
  // Alice pays $100.00, split between A, B, C.
  // Shares: A: 33.33, B: 33.33, C: 33.34
  const e1 = {
    id: "e1",
    description: "Dinner Split",
    total_amount: 100.00,
    paid_by: [{ personId: "person-a", amount: 100.00 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 33.33 },
      { personId: "person-b", amount: 33.33 },
      { personId: "person-c", amount: 33.34 }
    ],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement",
    created_at: "2026-05-31T09:00:00Z"
  };

  const netBalances = calculateNetBalances(people, [e1], []);
  assert.ok(checkZeroSumInvariant(netBalances, "Scenario A - General Balances"));

  const simplifiedTxs = calculateSimplifiedTransactions(people, [e1], []);
  console.log("  Calculated transactions:", simplifiedTxs);
  assert.ok(checkZeroSumInvariant(
    people.reduce((acc, p) => {
      // Calculate total balances combining general balances and direct transaction effects
      const gen = netBalances[p.id] || 0;
      const sent = simplifiedTxs.filter(tx => tx.from === p.id).reduce((sum, tx) => sum + tx.amount, 0);
      const rec = simplifiedTxs.filter(tx => tx.to === p.id).reduce((sum, tx) => sum + tx.amount, 0);
      acc[p.id] = Math.round((gen - sent + rec) * 100) / 100;
      return acc;
    }, {}),
    "Scenario A - Total Combined Balances"
  ));

  assert.ok(checkCashConservation(e1, simplifiedTxs, "Scenario A - Lahu Direct Transactions"));
  console.log("  ✓ Scenario A passed successfully!");

  console.log("\n--- TEST SCENARIO B: The Fuzz Rounding Failure Case ---");
  // Demonstrating the penny leak when dividing minor amounts across multiple people.
  // Suppose debtor Bob has a deficit of $0.01.
  // Creditors Alice, Charlie, and David have surpluses of $10.00, $10.00, $10.00.
  // totalSurplus = 30.00
  // Each creditor gets a proportion of 1/3.
  // grossOwed for each = Math.round((0.01 * (1/3)) * 100) / 100 = Math.round(0.00333 * 100) / 100 = 0.00.
  // Bob owes 0.00 to everyone! The $0.01 deficit vanishes.
  const eFuzz = {
    id: "e-fuzz",
    description: "Rounding Leak Demo",
    total_amount: 30.01,
    paid_by: [
      { personId: "person-a", amount: 10.00 },
      { personId: "person-c", amount: 10.00 },
      { personId: "person-d", amount: 10.01 }
    ],
    split_method: "exact",
    shares: [
      { personId: "person-a", amount: 0.00 },
      { personId: "person-b", amount: 30.01 }, // Bob consumes almost everything
      { personId: "person-c", amount: 0.00 },
      { personId: "person-d", amount: 0.00 }
    ],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement",
    created_at: "2026-05-31T09:00:00Z"
  };

  // Wait, let's look at the contributions for eFuzz:
  // Alice: paid 10.00, share 0.00 -> surplus 10.00
  // Charlie: paid 10.00, share 0.00 -> surplus 10.00
  // David: paid 10.01, share 0.00 -> surplus 10.01
  // Bob: paid 0.00, share 30.01 -> deficit -30.01
  // Wait, this is a large deficit! Let's scale it so that Bob's deficit is tiny, say $0.01, and others have surpluses of $10.00.
  // eFuzz:
  // Alice paid 10.00, share 9.997 (let's say 10.00)
  // Let's create an expense with total_amount: 30.01.
  // Alice pays 10.01. Bob pays 10.00. Charlie pays 10.00.
  // Shares:
  // Alice consumes 10.00 (deficit 0.01)
  // Bob consumes 10.00 (deficit 0.00)
  // Charlie consumes 10.00 (deficit 0.00)
  // David consumes 0.01 (deficit 0.01) - wait.
  // Let's set it up precisely:
  // Alice surplus: 10.00
  // Charlie surplus: 10.00
  // David surplus: 10.00
  // Bob deficit: 30.00 (this will split into 10, 10, 10 - no leak).
  
  // What about:
  // Alice surplus: 1.00
  // Charlie surplus: 1.00
  // David surplus: 1.00
  // Bob deficit: 0.01 (Bob pays 0, shares 0.01. Alice pays 1.00, shares 0. Charlie pays 1.00, shares 0. David pays 1.00, shares 0. Wait, totalPaid must equal totalShares!)
  // Ah! Yes, totalPaid must equal totalShares!
  // Let's design a consistent $3.01 expense:
  // Paid by:
  // Alice: $1.00
  // Charlie: $1.00
  // David: $1.01
  // Total Paid = $3.01
  // Shares:
  // Alice: $1.00 (net = 0.00)
  // Charlie: $1.00 (net = 0.00)
  // David: $1.00 (net = +0.01 surplus)
  // Bob: $0.01 (net = -0.01 deficit)
  // Total Shares = $3.01
  // Let's trace this!
  // Surplus: David (+0.01). Total Surplus = 0.01.
  // Deficit: Bob (-0.01). Total Deficit = 0.01.
  // Proportions: David gets 1.0. grossOwed = Math.round((0.01 * 1.0) * 100) / 100 = 0.01.
  // This will also not leak because there's only 1 creditor.

  // How do we get multiple creditors and a tiny deficit to show a leak?
  // We need at least two creditors and a deficit that, when divided, rounds to zero for both.
  // Let's say:
  // Total Paid = $20.02
  // Paid by:
  // Alice: $10.01
  // Charlie: $10.01
  // Total Paid = $20.02
  // Shares:
  // Alice: $10.00 (net = +0.01 surplus)
  // Charlie: $10.00 (net = +0.01 surplus)
  // Bob: $0.02 (net = -0.02 deficit)
  // Total Shares = $20.02
  // Let's trace:
  // Creditors: Alice (+0.01), Charlie (+0.01). Total surplus = 0.02.
  // Deficit: Bob (-0.02). Total deficit = 0.02.
  // Proportions: Alice has 0.01 / 0.02 = 0.5. Charlie has 0.01 / 0.02 = 0.5.
  // For Alice: grossOwed = Math.round((0.02 * 0.5) * 100) / 100 = 0.01.
  // For Charlie: grossOwed = 0.01.
  // This rounds to 0.01 for both, sum = 0.02. It matches!

  // Let's try:
  // Creditors: Alice (+0.01), Charlie (+0.01). Total surplus = 0.02.
  // Deficit: Bob (-0.01), David (-0.01). Total deficit = 0.02.
  // This also matches.

  // Let's try:
  // Creditors: Alice (+0.01), Charlie (+0.01), David (+0.01). Total surplus = 0.03.
  // Deficit: Bob (-0.02). Total deficit = 0.02.
  // Proportions: Alice (1/3), Charlie (1/3), David (1/3).
  // For Alice: grossOwed = Math.round((0.02 * (1/3)) * 100) / 100 = Math.round(0.00666 * 100) / 100 = 0.01.
  // For Charlie: grossOwed = 0.01.
  // For David: grossOwed = 0.01.
  // Sum = 0.01 + 0.01 + 0.01 = 0.03!
  // BUT the total deficit of Bob was only 0.02!
  // This is an OVER-ALLOCATION! Bob is charged 0.03 instead of 0.02!
  // Let's construct this exact expense:
  // Total Amount = $30.03
  // Paid by:
  // Alice: $10.01
  // Charlie: $10.01
  // David: $10.01
  // Total Paid = $30.03
  // Shares:
  // Alice: $10.00 (net = +0.01)
  // Charlie: $10.00 (net = +0.01)
  // David: $10.00 (net = +0.01)
  // Bob: $0.02 (net = -0.02)
  // Total Shares = $30.02 (wait, total shares must be 30.03! So one share must be increased by 0.01. Let's make Charlie's share $10.01, so Charlie net is 0. Then we have only 2 creditors, Alice and David.)
  // Let's adjust:
  // Total Amount = $30.03
  // Paid by:
  // Alice: $10.01
  // Charlie: $10.01
  // David: $10.01
  // Total Paid = $30.03
  // Shares:
  // Alice: $10.00 (net = +0.01)
  // Charlie: $10.00 (net = +0.01)
  // David: $10.00 (net = +0.01)
  // Bob: $0.02
  // Person-X: $0.01 (net = -0.01)
  // Total Shares = $30.03
  // Let's trace!
  // Creditors: Alice (+0.01), Charlie (+0.01), David (+0.01). Total surplus = 0.03.
  // Debtors: Bob (-0.02), Person-X (-0.01). Total deficit = 0.03.
  // Let's calculate Lahu transactions for Bob:
  // Bob's deficit = 0.02.
  // Creditor proportions: Alice (1/3), Charlie (1/3), David (1/3).
  // grossOwed from Bob to Alice = Math.round((0.02 * (1/3)) * 100) / 100 = 0.01.
  // grossOwed from Bob to Charlie = 0.01.
  // grossOwed from Bob to David = 0.01.
  // Bob owes a total of $0.03!
  // Now let's calculate for Person-X:
  // Person-X deficit = 0.01.
  // grossOwed from X to Alice = Math.round((0.01 * (1/3)) * 100) / 100 = 0.00.
  // grossOwed from X to Charlie = 0.00.
  // grossOwed from X to David = 0.00.
  // Person-X owes $0.00 to everyone!
  // So the direct transactions generated are:
  // - Bob pays Alice $0.01
  // - Bob pays Charlie $0.01
  // - Bob pays David $0.01
  // Total direct transactions sum = $0.03.
  // Total deficit of debtors = Bob (0.02) + Person-X (0.01) = 0.03.
  // Wait, the total direct transactions sum is 0.03, which matches the total deficit!
  // BUT look at the individual distributions:
  // Bob owes 0.03 (which is 0.01 too much, since his deficit was 0.02).
  // Person-X owes 0.00 (which is 0.01 too little, since his deficit was 0.01).
  // This is a major structural violation of individual cash conservation: a participant is paying more/less than their consumption deficit! Bob is losing $0.01 and Person-X is gaining $0.01!
  // Let's write this case and test it!

  const eFuzz2 = {
    id: "e-fuzz-2",
    description: "Proportional Deficit Leak",
    total_amount: 30.03,
    paid_by: [
      { personId: "person-a", amount: 10.01 },
      { personId: "person-c", amount: 10.01 },
      { personId: "person-d", amount: 10.01 }
    ],
    split_method: "exact",
    shares: [
      { personId: "person-a", amount: 10.00 }, // net = +0.01
      { personId: "person-b", amount: 0.02 },  // net = -0.02 (Debtor Bob)
      { personId: "person-c", amount: 10.00 }, // net = +0.01
      { personId: "person-d", amount: 10.00 }, // net = +0.01
      { id: "person-e", name: "Emily" } // Wait, let's add Emily to the people array or mock her share.
    ],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement",
    created_at: "2026-05-31T09:00:00Z"
  };

  // Let's add Emily to people first
  const extendedPeople = [
    ...people,
    { id: "person-e", name: "Emily" }
  ];
  // Add Emily's share:
  eFuzz2.shares.push({ personId: "person-e", amount: 0.01 }); // net = -0.01 (Debtor Emily)

  const netBalancesFuzz = calculateNetBalances(extendedPeople, [eFuzz2], []);
  const txsFuzz = calculateSimplifiedTransactions(extendedPeople, [eFuzz2], []);

  console.log("  Calculated transactions for Fuzz Case:", txsFuzz);

  // Let's audit the transactions:
  const bobTxs = txsFuzz.filter(tx => tx.from === "person-b");
  const bobTotal = bobTxs.reduce((sum, tx) => sum + tx.amount, 0);
  console.log(`  Bob's calculated direct debt: $${bobTotal} (Actual Deficit: $0.02)`);

  const emilyTxs = txsFuzz.filter(tx => tx.from === "person-e");
  const emilyTotal = emilyTxs.reduce((sum, tx) => sum + tx.amount, 0);
  console.log(`  Emily's calculated direct debt: $${emilyTotal} (Actual Deficit: $0.01)`);

  // Let's assert individual cash conservation:
  console.log("  Checking Individual Cash Conservation...");
  let invariantViolated = false;
  if (Math.abs(bobTotal - 0.02) > 0.001) {
    console.warn(`  ⚠️ Bob's debt of $${bobTotal} does not match his consumption deficit of $0.02!`);
    invariantViolated = true;
  }
  if (Math.abs(emilyTotal - 0.01) > 0.001) {
    console.warn(`  ⚠️ Emily's debt of $${emilyTotal} does not match her consumption deficit of $0.01!`);
    invariantViolated = true;
  }

  if (invariantViolated) {
    console.log("  ❌ [Mathematical Invariant Violation] Individual Cash Conservation is violated under independent rounding!");
  } else {
    console.log("  ✓ [Mathematical Invariant Passed] Individual Cash Conservation satisfied.");
  }

  // Check overall cash conservation
  const overallPassed = checkCashConservation(eFuzz2, txsFuzz, "Scenario B - Fuzz");
  if (!overallPassed) {
    console.log("  ❌ [Mathematical Invariant Violation] Overall Cash Conservation failed!");
  } else {
    console.log("  ✓ Overall Cash Conservation satisfied.");
  }

} catch (err) {
  console.error("Test execution error:", err);
} finally {
  fs.unlinkSync(tempFile);
}
