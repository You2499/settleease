const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=============================================================");
console.log("     SETTLEASE REBALANCED LAHU STRATEGY COMPARISON SUITE     ");
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

const tempFile = path.join(__dirname, 'temp-lahu-rebalanced-test.js');
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

// 2. Implement the mathematically correct Rebalanced Lahu Strategy
function calculateLahuRebalancedDirectTransactions(people, expenses, settlementPayments) {
  const directTransactions = [];

  // Filter for expenses that are excluded under the Lahu Debt Settlement strategy
  const lahuExpenses = expenses.filter(
    (e) => e.exclude_from_settlement && e.exclusion_strategy === "lahu_debt_settlement"
  );

  if (lahuExpenses.length === 0) {
    return directTransactions;
  }

  lahuExpenses.forEach((expense) => {
    // 1. Calculate net contributions specifically for this Lahu expense
    const rawContributions = {};
    const expenseParticipantIds = new Set();

    people.forEach((p) => {
      const paidObj = expense.paid_by?.find((pb) => pb.personId === p.id);
      const paid = paidObj ? Number(paidObj.amount) : 0;

      const shareObj = expense.shares?.find((s) => s.personId === p.id);
      let share = shareObj ? Number(shareObj.amount) : 0;

      if (
        expense.celebration_contribution &&
        expense.celebration_contribution.personId === p.id
      ) {
        share += Number(expense.celebration_contribution.amount);
      }

      rawContributions[p.id] = paid - share;
      if (paid > 0 || share > 0) {
        expenseParticipantIds.add(p.id);
      }
    });

    // 2. Identify surplus (creditors) and deficit (debtors) contributors
    const creditors = Object.entries(rawContributions)
      .filter(([_, contrib]) => contrib > 0.001)
      .map(([id, contrib]) => ({ id, surplus: contrib }));

    const debtors = Object.entries(rawContributions)
      .filter(([_, contrib]) => contrib < -0.001)
      .map(([id, contrib]) => ({ id, deficit: Math.abs(contrib) }));

    const totalSurplus = creditors.reduce((sum, c) => sum + c.surplus, 0);

    if (totalSurplus > 0.001) {
      // 3. For each debtor, distribute their deficit to creditors using Largest Remainder Method
      debtors.forEach((debtor) => {
        const debtorId = debtor.id;
        const debtorDeficit = debtor.deficit;

        // Calculate exact target gross obligation for each creditor
        const targetObligations = creditors.map((creditor) => {
          const proportion = creditor.surplus / totalSurplus;
          const exactGross = debtorDeficit * proportion;
          return {
            creditorId: creditor.id,
            exactGross,
            floorGross: Math.floor(exactGross * 100) / 100,
            remainder: (exactGross * 100) - Math.floor(exactGross * 100)
          };
        });

        // Sum of floor rounded values
        const floorSum = targetObligations.reduce((sum, o) => sum + o.floorGross, 0);
        let remainingPennies = Math.round((debtorDeficit - floorSum) * 100);

        // Sort targetObligations by remainder descending to distribute remaining pennies
        // We use stable sort or deterministic fallback by ID to avoid flaky behavior when remainders are equal
        targetObligations.sort((a, b) => {
          if (Math.abs(b.remainder - a.remainder) > 0.0001) {
            return b.remainder - a.remainder;
          }
          return a.creditorId.localeCompare(b.creditorId);
        });

        // Distribute remaining pennies
        const finalGrossOwed = {};
        targetObligations.forEach((o, index) => {
          let extra = 0;
          if (index < remainingPennies) {
            extra = 0.01;
          }
          finalGrossOwed[o.creditorId] = Math.round((o.floorGross + extra) * 100) / 100;
        });

        // 4. Subtract any active (non-archived) settlement payments explicitly or legacy-general entangled with this expense
        creditors.forEach((creditor) => {
          const creditorId = creditor.id;
          const grossOwed = finalGrossOwed[creditorId] || 0;
          if (grossOwed < 0.001) return;

          const expenseDate = new Date(expense.created_at || 0).getTime();
          const specificSettled = settlementPayments
            .filter((sp) => {
              if (
                sp.is_archived ||
                sp.debtor_id !== debtorId ||
                sp.creditor_id !== creditorId
              ) {
                return false;
              }
              const paymentDate = new Date(sp.settled_at).getTime();
              const isExplicitLink = sp.associated_expense_id === expense.id;
              const isLegacyGeneral =
                !isExplicitLink &&
                expenseParticipantIds.has(sp.debtor_id) &&
                expenseParticipantIds.has(sp.creditor_id) &&
                paymentDate >= expenseDate - 60000;
              return isExplicitLink || isLegacyGeneral;
            })
            .reduce((sum, sp) => {
              const entangledAmount = Math.min(Number(sp.amount_settled), Number(expense.total_amount));
              return sum + entangledAmount;
            }, 0);

          const unpaidShare = Math.max(0, Math.round((grossOwed - specificSettled) * 100) / 100);

          if (unpaidShare >= 0.01) {
            directTransactions.push({
              from: debtorId,
              to: creditorId,
              amount: unpaidShare,
              contributingExpenseIds: [expense.id],
              isDirect: true,
            });
          }
        });
      });
    }
  });

  return directTransactions;
}

// Custom calculateSimplifiedTransactions using rebalanced Lahu strategy
function calculateRebalancedSimplifiedTransactions(people, expenses, settlementPayments) {
  // We compute net balances (which excludes Lahu-excluded expenses and legacy-general entangled settlements)
  const netBalances = calculateNetBalances(people, expenses, settlementPayments);

  const transactions = [];
  const debtors = Object.entries(netBalances)
    .filter(([_, balance]) => balance <= -0.01)
    .map(([id, balance]) => ({ id, amount: Math.abs(balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(netBalances)
    .filter(([_, balance]) => balance >= 0.01)
    .map(([id, balance]) => ({ id, amount: balance }))
    .sort((a, b) => b.amount - a.amount);

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const settlementAmount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100;

    if (settlementAmount >= 0.01) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: settlementAmount,
      });

      debtor.amount = Math.round((debtor.amount - settlementAmount) * 100) / 100;
      creditor.amount = Math.round((creditor.amount - settlementAmount) * 100) / 100;
    }

    if (debtor.amount < 0.01 || settlementAmount < 0.01) debtorIndex++;
    if (creditor.amount < 0.01 || settlementAmount < 0.01) creditorIndex++;
  }

  const lahuTransactions = calculateLahuRebalancedDirectTransactions(people, expenses, settlementPayments);
  return [...transactions, ...lahuTransactions];
}

try {
  const people = [
    { id: "person-a", name: "Alice" },
    { id: "person-b", name: "Bob" },
    { id: "person-c", name: "Charlie" },
    { id: "person-d", name: "David" },
    { id: "person-e", name: "Emily" }
  ];

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
      { personId: "person-b", amount: 0.02 },  // net = -0.02
      { personId: "person-c", amount: 10.00 }, // net = +0.01
      { personId: "person-d", amount: 10.00 }, // net = +0.01
      { personId: "person-e", amount: 0.01 }   // net = -0.01
    ],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement",
    created_at: "2026-05-31T09:00:00Z"
  };

  console.log("\n--- EXECUTING CURRENT (BUGGED) LAHU IMPLEMENTATION ---");
  const currentTxs = calculateSimplifiedTransactions(people, [eFuzz2], []);
  console.log("  Transactions:", currentTxs);
  const currentBobTotal = currentTxs.filter(tx => tx.from === "person-b").reduce((sum, tx) => sum + tx.amount, 0);
  const currentEmilyTotal = currentTxs.filter(tx => tx.from === "person-e").reduce((sum, tx) => sum + tx.amount, 0);
  console.log(`  Bob Pays: $${currentBobTotal} (Expected: $0.02) -> ${currentBobTotal === 0.02 ? 'PASSED' : 'FAILED (Overpaid!)'}`);
  console.log(`  Emily Pays: $${currentEmilyTotal} (Expected: $0.01) -> ${currentEmilyTotal === 0.01 ? 'PASSED' : 'FAILED (Leaked!)'}`);

  console.log("\n--- EXECUTING REBALANCED LAHU IMPLEMENTATION ---");
  const rebalancedTxs = calculateRebalancedSimplifiedTransactions(people, [eFuzz2], []);
  console.log("  Transactions:", rebalancedTxs);
  const rebalancedBobTotal = rebalancedTxs.filter(tx => tx.from === "person-b").reduce((sum, tx) => sum + tx.amount, 0);
  const rebalancedEmilyTotal = rebalancedTxs.filter(tx => tx.from === "person-e").reduce((sum, tx) => sum + tx.amount, 0);
  console.log(`  Bob Pays: $${rebalancedBobTotal} (Expected: $0.02) -> ${rebalancedBobTotal === 0.02 ? 'PASSED' : 'FAILED'}`);
  console.log(`  Emily Pays: $${rebalancedEmilyTotal} (Expected: $0.01) -> ${rebalancedEmilyTotal === 0.01 ? 'PASSED' : 'FAILED'}`);

  // Asserting the invariants for the rebalanced solution
  assert.strictEqual(rebalancedBobTotal, 0.02, "Bob must pay exactly $0.02!");
  assert.strictEqual(rebalancedEmilyTotal, 0.01, "Emily must pay exactly $0.01!");

  const sumRebalanced = rebalancedTxs.reduce((sum, tx) => sum + tx.amount, 0);
  assert.strictEqual(Math.round(sumRebalanced * 100) / 100, 0.03, "Total settled amount must be exactly $0.03!");

  console.log("\n=============================================================");
  console.log("     ✓ REBALANCED LAHU STRATEGY PERFECTLY SOLVED THE BUG!    ");
  console.log("=============================================================");

} catch (err) {
  console.error("Test execution error:", err);
} finally {
  fs.unlinkSync(tempFile);
}
