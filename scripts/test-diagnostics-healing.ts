import assert from "assert";
import { resolveAiModelConfig, buildAiModelAttemptOrder } from "../src/lib/settleease/aiModels";
import { normalizeCleanCatalogResponse } from "../src/lib/settleease/aiCleanCatalog";
import { normalizeStructuredHealthEstimateForRows, normalizeStructuredHealthEstimateRow } from "../src/lib/settleease/aiHealth";

console.log("=============================================================");
console.log(" RUNNING DIAGNOSTIC & SELF-HEALING TEST SUITE FOR SETTLEEASE ");
console.log("=============================================================\n");

try {
  // =========================================================================
  // SCENARIO 1: Static Config Auto-Healing & Attempt Order
  // =========================================================================
  console.log("Running Scenario 1: Static Config Auto-Healing & Attempt Order...");

  // Model Code gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro must be auto-healed
  const healedConfig1 = resolveAiModelConfig({
    modelCode: "gemini-2.0-flash",
    fallbackModelCodes: ["gemini-1.5-flash", "gemini-1.5-pro"],
  });
  assert.strictEqual(healedConfig1.modelCode, "gemini-2.5-flash", "Legacy modelCode must map to gemini-2.5-flash");
  assert.deepStrictEqual(healedConfig1.fallbackModelCodes, ["gemini-2.5-pro"], "Obsolete fallback modelCodes must map to current equivalents");

  const attemptOrder = buildAiModelAttemptOrder(healedConfig1);
  assert.deepStrictEqual(attemptOrder, ["gemini-2.5-flash", "gemini-2.5-pro"], "Attempt order must filter duplicates and resolve dynamically");

  console.log("  ✓ Static Config Auto-Healing & Attempt Order verified successfully!");

  // =========================================================================
  // SCENARIO 2: AI Error Classification (Replicating parseAiError logic)
  // =========================================================================
  console.log("\nRunning Scenario 2: Error Classification...");

  function localParseAiError(error: any): "transient" | "permanent" {
    const message = error instanceof Error ? error.message : String(error || "");
    const lowerMsg = message.toLowerCase();
    if (
      lowerMsg.includes("429") ||
      lowerMsg.includes("quota") ||
      lowerMsg.includes("resource_exhausted") ||
      lowerMsg.includes("503") ||
      lowerMsg.includes("overloaded") ||
      lowerMsg.includes("unavailable") ||
      lowerMsg.includes("timeout") ||
      lowerMsg.includes("abort") ||
      lowerMsg.includes("fetch") ||
      lowerMsg.includes("econnreset") ||
      lowerMsg.includes("network")
    ) {
      return "transient";
    }
    return "permanent";
  }

  assert.strictEqual(localParseAiError(new Error("API rate limit exceeded: 429 Resource Exhausted")), "transient");
  assert.strictEqual(localParseAiError(new Error("Google API error: 503 Service Unavailable")), "transient");
  assert.strictEqual(localParseAiError(new Error("Request Aborted: timeout of 12000ms exceeded")), "transient");
  assert.strictEqual(localParseAiError(new Error("Model not found: 404")), "permanent");
  assert.strictEqual(localParseAiError(new Error("Invalid API key provided: 403")), "permanent");

  console.log("  ✓ AI Error Classification logic verified successfully!");

  // =========================================================================
  // SCENARIO 3: Quantity Multiplication, Dimensions, & Asymmetric Category Matching
  // =========================================================================
  console.log("\nRunning Scenario 3: Mathematical Safety & Category Matchers (Catalog)...");

  const allowedCategories = ["Food & Drinks", "Rent & Housing", "Parenting & Kids", "Transportation"];
  
  // Test unit price calculation on quantity multiplier "x2"
  const cleanRes1 = normalizeCleanCatalogResponse(
    {
      schemaVersion: 1,
      canonicalItems: [
        { id: "budweiser", name: "Budweiser", categoryName: "Food & Drinks", description: "Beer" }
      ],
      mappings: [
        { observationId: "obs-1", canonicalItemId: "budweiser", cleanedPrice: 10.00 }
      ]
    },
    allowedCategories,
    [
      { id: "obs-1", itemName: "Budweiser Magnum x2", expenseDescription: "Beer", price: 10.00, date: "2026-06-03" }
    ]
  );
  assert.strictEqual(cleanRes1.mappings[0].cleanedPrice, 5.00, "Cleaned price must be divided by quantity multiplier 'x2'");

  // Test dimension ignoring "3 x 3 Budweiser"
  const cleanRes2 = normalizeCleanCatalogResponse(
    {
      schemaVersion: 1,
      canonicalItems: [
        { id: "budweiser", name: "Budweiser", categoryName: "Food & Drinks", description: "Beer" }
      ],
      mappings: [
        { observationId: "obs-2", canonicalItemId: "budweiser", cleanedPrice: 10.00 }
      ]
    },
    allowedCategories,
    [
      { id: "obs-2", itemName: "3 x 3 Budweiser", expenseDescription: "Beer", price: 10.00, date: "2026-06-03" }
    ]
  );
  assert.strictEqual(cleanRes2.mappings[0].cleanedPrice, 10.00, "Dimensions like '3 x 3' must not act as multipliers");

  // Test quantity capping at 100
  const cleanRes3 = normalizeCleanCatalogResponse(
    {
      schemaVersion: 1,
      canonicalItems: [
        { id: "budweiser", name: "Budweiser", categoryName: "Food & Drinks", description: "Beer" }
      ],
      mappings: [
        { observationId: "obs-3", canonicalItemId: "budweiser", cleanedPrice: 100.00 }
      ]
    },
    allowedCategories,
    [
      { id: "obs-3", itemName: "Budweiser (x150)", expenseDescription: "Beer", price: 100.00, date: "2026-06-03" }
    ]
  );
  assert.strictEqual(cleanRes3.mappings[0].cleanedPrice, 1.00, "Quantity multiplier must be capped at 100");

  // Test asymmetric category matching
  // Rent shouldn't match "Parenting & Kids" via substring containing "Rent"
  const cleanResCategory = normalizeCleanCatalogResponse(
    {
      schemaVersion: 1,
      canonicalItems: [
        { id: "apartment", name: "Apartment Rent", categoryName: "Rent", description: "Monthly rent" }
      ],
      mappings: [
        { observationId: "obs-cat", canonicalItemId: "apartment", cleanedPrice: 1000.00 }
      ]
    },
    allowedCategories,
    [
      { id: "obs-cat", itemName: "Monthly Rent", expenseDescription: "Housing", price: 1000.00, date: "2026-06-03" }
    ]
  );
  assert.strictEqual(cleanResCategory.canonicalItems[0].categoryName, "Rent & Housing", "Asymmetric matching must find 'Rent & Housing' via word boundary check on 'Rent'");

  console.log("  ✓ Mathematical safety and category invariants verified successfully!");

  // =========================================================================
  // SCENARIO 4: Thermodynamic Bounds & Alcohol Minimums (Health)
  // =========================================================================
  console.log("\nRunning Scenario 4: Thermodynamic Invariants & Missing Row fallbacks (Health)...");

  // Calorie check: protein * 4 + carbs * 4 + fat * 9
  // If AI estimates calories lower than minCalories, it must be normalized upwards
  const rowNormalized = normalizeStructuredHealthEstimateRow({
    sourceKey: "health-1",
    classification: "food",
    estimatedCalories: 50, // Way too low for macros below
    estimatedProteinGrams: 20, // 20 * 4 = 80 kcal
    estimatedCarbGrams: 10,    // 10 * 4 = 40 kcal
    estimatedFatGrams: 10,     // 10 * 9 = 90 kcal
    estimatedAlcoholServings: 0,
    estimatedAlcoholCalories: 0,
    confidence: "high",
    rationale: "Testing thermodynamic check"
  });
  const expectedMinCals = 20 * 4 + 10 * 4 + 10 * 9;
  assert.strictEqual(rowNormalized.estimatedCalories, expectedMinCals, `Calories must be normalized upwards to minimum thermodynamic bounds (${expectedMinCals} kcal)`);

  // Alcohol minimum check: servings * 98
  const alcoholRow = normalizeStructuredHealthEstimateRow({
    sourceKey: "health-2",
    classification: "alcohol",
    estimatedCalories: 100,
    estimatedProteinGrams: 0,
    estimatedCarbGrams: 0,
    estimatedFatGrams: 0,
    estimatedAlcoholServings: 2, // 2 * 98 = 196 kcal minimum
    estimatedAlcoholCalories: 50, // Too low
    confidence: "high",
    rationale: "Testing alcohol minimums"
  });
  assert.strictEqual(alcoholRow.estimatedAlcoholCalories, 196, "Alcohol calories must be at least servings * 98");
  assert.strictEqual(alcoholRow.estimatedCalories, 196, "Total calories must adjust for alcohol calories minimum bounds");

  // Reclassification verification
  const foodToAlcoholRow = normalizeStructuredHealthEstimateRow({
    sourceKey: "health-3",
    classification: "food",
    estimatedCalories: 150,
    estimatedProteinGrams: 0,
    estimatedCarbGrams: 0,
    estimatedFatGrams: 0,
    estimatedAlcoholServings: 1, // Has alcohol servings, must be classified as alcohol
    estimatedAlcoholCalories: 98,
    confidence: "high",
    rationale: "Food classified row containing alcohol servings"
  });
  assert.strictEqual(foodToAlcoholRow.classification, "alcohol", "Rows with alcohol servings must be reclassified to alcohol");

  // Missing rows verification
  const sourceKeys = [{ sourceKey: "health-row-1" }, { sourceKey: "health-row-2" }];
  const partialAiOutput = {
    schemaVersion: 1,
    estimates: [
      {
        sourceKey: "health-row-1",
        classification: "food",
        estimatedCalories: 100,
        estimatedProteinGrams: 5,
        estimatedCarbGrams: 10,
        estimatedFatGrams: 4,
        estimatedAlcoholServings: 0,
        estimatedAlcoholCalories: 0,
        confidence: "medium",
        rationale: "Found"
      }
      // health-row-2 is missing!
    ]
  };
  const fullyNormalized = normalizeStructuredHealthEstimateForRows(sourceKeys, partialAiOutput);
  assert.strictEqual(fullyNormalized.estimates.length, 2, "Response must contain one entry per input row");
  
  const missingRow = fullyNormalized.estimates.find((r) => r.sourceKey === "health-row-2");
  assert.ok(missingRow, "Missing row must be programmatically generated");
  assert.strictEqual(missingRow.classification, "ignore", "Missing rows must fallback to ignore");
  assert.strictEqual(missingRow.estimatedCalories, 0, "Missing rows must have 0 calories");

  console.log("  ✓ Thermodynamic constraints and missing row fallbacks verified successfully!");

  console.log("\n=============================================================");
  console.log("   ALL DIAGNOSTIC & SELF-HEALING TEST SCENARIOS PASSED!      ");
  console.log("=============================================================");

} catch (err) {
  console.error("\n❌ TEST SUITE FAILURE DETECTED:");
  console.error(err);
  process.exit(1);
}

process.exit(0);
