const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

console.log("=========================================");
console.log("   SETTLEASE DISCOUNT CALCULATION TESTS  ");
console.log("=========================================");

// 1. Transpile files dynamically
function transpileAndLoad(relativeFilePath) {
  const tsPath = path.join(__dirname, relativeFilePath);
  const tsCode = fs.readFileSync(tsPath, 'utf8');
  const jsCode = ts.transpileModule(tsCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const baseName = path.basename(relativeFilePath, '.ts');
  const tempFile = path.join(__dirname, `temp-${baseName}.js`);
  fs.writeFileSync(tempFile, jsCode);

  try {
    const loadedModule = require(tempFile);
    return { loadedModule, tempFile };
  } catch (err) {
    console.error(`Failed to load transpiled module for ${relativeFilePath}:`, err);
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    process.exit(1);
  }
}

const { loadedModule: settlementModule, tempFile: settlementTemp } = transpileAndLoad('../src/lib/settleease/settlementCalculations.ts');
const { loadedModule: itemwiseModule, tempFile: itemwiseTemp } = transpileAndLoad('../src/lib/settleease/itemwiseCalculations.ts');

const { calculateNetBalances, calculateSimplifiedTransactions, calculatePairwiseTransactions } = settlementModule;
const { calculateItemwiseSplit, getItemLineTotal } = itemwiseModule;

// Cleanup helper
function cleanup() {
  if (fs.existsSync(settlementTemp)) fs.unlinkSync(settlementTemp);
  if (fs.existsSync(itemwiseTemp)) fs.unlinkSync(itemwiseTemp);
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

// Run Test Cases
try {
  // ----------------------------------------------------
  console.log("\nScenario D-001: Equal Split with Discount");
  const exp1 = {
    id: "exp-1",
    description: "Dinner with 10% Discount",
    total_amount: 100,
    discount: 10,
    category: "Food",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 30 },
      { personId: "person-b", amount: 30 },
      { personId: "person-c", amount: 30 }
    ],
    exclude_from_settlement: false
  };

  const balances1 = calculateNetBalances(people, [exp1], []);
  console.log("  Computed net balances:", balances1);
  // Alice credit: 100 - 10 = 90
  // Alice net: 90 - 30 = 60
  // Bob net: -30
  // Charlie net: -30
  assert.strictEqual(balances1["person-a"], 60);
  assert.strictEqual(balances1["person-b"], -30);
  assert.strictEqual(balances1["person-c"], -30);
  assertZeroSum(balances1, "D-001");

  const txs1 = calculateSimplifiedTransactions(people, [exp1], []);
  console.log("  Simplified transactions:", txs1);
  assert.strictEqual(txs1.length, 2);
  assert.ok(txs1.some(t => t.from === "person-b" && t.to === "person-a" && t.amount === 30));
  assert.ok(txs1.some(t => t.from === "person-c" && t.to === "person-a" && t.amount === 30));

  // ----------------------------------------------------
  console.log("\nScenario D-002: Unequal Split with Discount");
  const exp2 = {
    id: "exp-2",
    description: "Concert tickets with $20 Discount",
    total_amount: 100,
    discount: 20,
    category: "Entertainment",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "unequal",
    shares: [
      { personId: "person-a", amount: 40 },
      { personId: "person-b", amount: 40 }
    ],
    exclude_from_settlement: false
  };

  const balances2 = calculateNetBalances(people, [exp2], []);
  console.log("  Computed net balances:", balances2);
  // Alice credit: 100 - 20 = 80
  // Alice net: 80 - 40 = 40
  // Bob net: -40
  assert.strictEqual(balances2["person-a"], 40);
  assert.strictEqual(balances2["person-b"], -40);
  assert.strictEqual(balances2["person-c"], 0);
  assertZeroSum(balances2, "D-002");

  const txs2 = calculateSimplifiedTransactions(people, [exp2], []);
  console.log("  Simplified transactions:", txs2);
  assert.strictEqual(txs2.length, 1);
  assert.strictEqual(txs2[0].from, "person-b");
  assert.strictEqual(txs2[0].to, "person-a");
  assert.strictEqual(txs2[0].amount, 40);

  // ----------------------------------------------------
  console.log("\nScenario D-003: Itemwise Split with Discount");
  const items = [
    { id: "item-pizza", name: "Pizza", price: 100, sharedBy: ["person-a", "person-b"], categoryName: "Food", quantity: 1 },
    { id: "item-drinks", name: "Drinks", price: 50, sharedBy: ["person-b", "person-c"], categoryName: "Food", quantity: 1 },
    { id: "discount-item", name: "Discount", price: -30, sharedBy: ["person-a", "person-b", "person-c"], categoryName: "Discount", quantity: 1 }
  ];

  // total_amount = 120 (150 regular items - 30 discount)
  const result = calculateItemwiseSplit(items, 120);
  console.log("  Itemwise shares calculated:", result.shares);
  console.log("  Alice breakdown entries:", result.personBreakdown["person-a"].items);

  // Assertions:
  // Alice regular: 50, Bob regular: 75, Charlie regular: 25.
  // Alice proportion: 50 / 150 = 1/3 => discount portion = -10 => net share = 40.
  // Bob proportion: 75 / 150 = 1/2 => discount portion = -15 => net share = 60.
  // Charlie proportion: 25 / 150 = 1/6 => discount portion = -5 => net share = 20.
  const shareA = result.shares.find(s => s.personId === "person-a");
  const shareB = result.shares.find(s => s.personId === "person-b");
  const shareC = result.shares.find(s => s.personId === "person-c");

  assert.strictEqual(shareA.amount, 40);
  assert.strictEqual(shareB.amount, 60);
  assert.strictEqual(shareC.amount, 20);

  // Check the presence and properties of the Discount item in Alice's breakdown
  const discountA = result.personBreakdown["person-a"].items.find(entry => entry.itemId === "discount-item");
  assert.ok(discountA);
  assert.strictEqual(discountA.shareForPerson, -10);
  assert.strictEqual(discountA.originalItemPrice, -10);
  assert.strictEqual(discountA.adjustedItemPriceForSplit, -10);

  // Check Bob's breakdown Discount item
  const discountB = result.personBreakdown["person-b"].items.find(entry => entry.itemId === "discount-item");
  assert.ok(discountB);
  assert.strictEqual(discountB.shareForPerson, -15);

  // Check Charlie's breakdown Discount item
  const discountC = result.personBreakdown["person-c"].items.find(entry => entry.itemId === "discount-item");
  assert.ok(discountC);
  assert.strictEqual(discountC.shareForPerson, -5);

  console.log("  ✓ Itemwise Split with Discount verified successfully!");

  // ----------------------------------------------------
  console.log("\nScenario D-004: Lahu Direct Transactions with Discount");
  const lahuExp = {
    id: "lahu-1",
    description: "Private Party with Discount",
    total_amount: 100,
    discount: 10,
    category: "Party",
    paid_by: [{ personId: "person-a", amount: 100 }],
    split_method: "equal",
    shares: [
      { personId: "person-a", amount: 30 },
      { personId: "person-b", amount: 30 },
      { personId: "person-c", amount: 30 }
    ],
    exclude_from_settlement: true,
    exclusion_strategy: "lahu_debt_settlement"
  };

  const balances4 = calculateNetBalances(people, [lahuExp], []);
  console.log("  Computed net balances (should be zero because excluded):", balances4);
  assert.strictEqual(balances4["person-a"], 0);
  assert.strictEqual(balances4["person-b"], 0);
  assert.strictEqual(balances4["person-c"], 0);
  assertZeroSum(balances4, "D-004");

  const txs4 = calculateSimplifiedTransactions(people, [lahuExp], []);
  console.log("  Lahu transactions computed:", txs4);
  assert.strictEqual(txs4.length, 2);
  assert.ok(txs4.some(t => t.from === "person-b" && t.to === "person-a" && t.amount === 30 && t.isDirect));
  assert.ok(txs4.some(t => t.from === "person-c" && t.to === "person-a" && t.amount === 30 && t.isDirect));

  console.log("  ✓ Lahu Direct Transactions with Discount verified successfully!");

  console.log("\n=========================================");
  console.log("   ALL DISCOUNT TESTS PASSED SUCCESSFULLY!");
  console.log("=========================================");
} catch (err) {
  console.error("\n❌ TEST FAILURE DETECTED:");
  console.error(err);
  cleanup();
  process.exit(1);
}

cleanup();
process.exit(0);
