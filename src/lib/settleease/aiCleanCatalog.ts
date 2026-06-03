// src/lib/settleease/aiCleanCatalog.ts

export interface CatalogObservationInput {
  id: string;
  itemName: string;
  expenseDescription: string;
  price: number;
  date: string;
  categoryName?: string | null;
}

export interface CanonicalItemOutput {
  id: string;
  name: string;
  categoryName: string;
  decipheredVenue: string | null;
  description: string;
}

export interface CatalogMappingOutput {
  observationId: string;
  canonicalItemId: string;
  decipheredVenue: string | null;
  cleanedPrice: number;
}

export interface CleanCatalogResponse {
  schemaVersion: number;
  canonicalItems: CanonicalItemOutput[];
  mappings: CatalogMappingOutput[];
}

export const AI_CLEAN_CATALOG_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    schemaVersion: {
      type: "integer",
      description: "The catalog cleaning schema version. Use 1.",
    },
    canonicalItems: {
      type: "array",
      description: "List of consolidated canonical budget items.",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "A unique, URL-safe slug identifier for the canonical item, e.g. 'coca-cola', 'veg-burger'. Keep it lowercase, alphanumeric, and hyphenated.",
          },
          name: {
            type: "string",
            description: "Clean, standardized, and properly capitalized name of the item. E.g. 'Coca-Cola' instead of 'coke can' or 'coca-cola 330ml'.",
          },
          categoryName: {
            type: "string",
            description: "The best-fitting category name chosen from the allowed categories list.",
          },
          decipheredVenue: {
            type: "string",
            description: "The specific restaurant, venue, or merchant deciphered from the expense description or item context (e.g., 'McDonald's', 'Walmart'). Use an empty string '' if it is generic, ambiguous, or no specific venue is mentioned.",
          },
          description: {
            type: "string",
            description: "A very brief, one-sentence description of this canonical item and why items were grouped here.",
          },
        },
        required: ["id", "name", "categoryName", "decipheredVenue", "description"],
      },
    },
    mappings: {
      type: "array",
      description: "Mapping from each input observation ID to its corresponding canonical item.",
      items: {
        type: "object",
        properties: {
          observationId: {
            type: "string",
            description: "The exact ID of the input observation being mapped.",
          },
          canonicalItemId: {
            type: "string",
            description: "The ID of the canonical item this observation is mapped to (must match an ID in canonicalItems).",
          },
          decipheredVenue: {
            type: "string",
            description: "The specific restaurant or venue deciphered for this individual observation (e.g. 'McDonald's', 'Walmart'). Use an empty string '' if none could be deciphered.",
          },
          cleanedPrice: {
            type: "number",
            description: "The normalized individual unit price. IMPORTANT: If the raw item name includes a quantity multiplier (e.g., 'x2', 'x3', '2x', '3x') and the input price is the un-divided total price, you MUST divide the price by the quantity to calculate the true unit price. E.g., for Name 'Budweiser Magnum x2' with price 10.00, cleanedPrice MUST be 5.00. Round to exactly 2 decimal places.",
          },
        },
        required: ["observationId", "canonicalItemId", "decipheredVenue", "cleanedPrice"],
      },
    },
  },
  required: ["schemaVersion", "canonicalItems", "mappings"],
};

export const DEFAULT_AI_CLEAN_CATALOG_PROMPT = `You are SettleEase's expert financial catalog consolidation and cleaning AI.

Task:
Analyze a list of noisy item observations from historical expenses and consolidate them into a clean, canonical catalog of budget items, assigning each a standardized category name, and deciphering venue/restaurant names where possible.

Rules:
1. Canonical Item Consolidation:
   - Identify items that represent the exact same product or service and group them into a single canonical budget item.
   - AGGRESSIVELY normalize casings, typos, trailing punctuation, and OCR junk. Assign a clean, professional, and properly capitalized canonical name in standard Title Case (e.g., "Coca-Cola" instead of "coke can" or "COCA COLA 330ML", "Budweiser Magnum" instead of "BUDWEISER MAGNUM 650ML x2", "Veggie Burger" instead of "veg burger 2x").
   - Strip out quantity multipliers (like "x2", "x3", "x 4", "2x", "3x", "Qty: 2"), volume/weight markers (like "330ml", "500ml", "1L", "650ML", "750 ml", "500g", "1kg", "pack of 6"), container types ("can", "glass", "bottle", "pkg"), and descriptors of format.
   - Keep the generated canonical item ID short, lowercase, and URL-safe (e.g., "coca-cola", "budweiser-magnum", "veggie-burger").

2. Category Assignment:
   - Match each canonical item to the best-fitting category from the allowed categories list provided below.
   - Do NOT invent or use category names that are not in the allowed categories list. If none fit perfectly, use the best approximation or "Other".

3. Venue / Restaurant Deciphering:
   - Extract the specific merchant, restaurant, or venue name from the expense description or the item name itself (e.g., extracting "McDonald's" from "Dinner at McDonald's" or "McDonalds delivery", or "Starbucks" from "Starbucks coffee").
   - Use proper capitalization and spelling for venue names (e.g., "McDonald's" instead of "mcdonalds").
   - If the item is general, or no specific venue can be deciphered, return an empty string "" for "decipheredVenue".

4. Individual Mapping & Unit Price Normalization:
   - Map EVERY single input observation ID to its designated canonical item ID.
   - For each mapping, decipher the venue specifically for that observation. If none could be deciphered, return an empty string "".
   - Calculate the true UNIT PRICE for "cleanedPrice":
     - Check the raw input item name for quantity multipliers (e.g. "x2", "x3", "2x", "3x", "2 *", "qty 2").
     - If a quantity multiplier is found, and the input "price" represents the total price (un-divided total amount) for that row, you MUST divide the input "price" by that quantity to calculate the correct unit price.
     - E.g., if raw item Name is "Budweiser Magnum 650ML x2" and input price is "10.00", the unit price is "5.00".
     - E.g., if raw item Name is "Coca Cola x3" and input price is "9.00", the unit price is "3.00".
     - Output this calculated unit price as "cleanedPrice", rounded to exactly 2 decimal places.

5. Formatting Constraints:
   - Return ONLY valid JSON matching the schema.
   - Do not include explanations, Markdown, or code fences.

Allowed Categories:
{{ALLOWED_CATEGORIES}}

Input Observations to Consolidate:
{{OBSERVATIONS}}

Required JSON fields:
- schemaVersion: 1
- canonicalItems: array of consolidated canonical budget items (each containing: id, name, categoryName, decipheredVenue, description)
- mappings: array of mappings from input observations to canonical items (each containing: observationId, canonicalItemId, decipheredVenue, cleanedPrice)`;

export function injectCleanCatalogPrompt(
  promptTemplate: string,
  allowedCategories: string[],
  observations: CatalogObservationInput[]
): string {
  return promptTemplate
    .replace("{{ALLOWED_CATEGORIES}}", () => allowedCategories.join(", "))
    .replace("{{OBSERVATIONS}}", () => JSON.stringify(observations, null, 2));
}

export function parseCleanCatalogResponse(text: string): CleanCatalogResponse | null {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function extractQuantity(itemName: string): number {
  const cleanName = itemName.trim();
  const quantityPatterns = [
    /\s*[\(\[]\s*(?:[xX×]|qty\.?)\s*(\d{1,3})\s*[\)\]]\s*$/i, // matches " (x2)", " [qty 3]"
    /\s+[xX×]\s*(\d{1,3})\s*$/,                                // matches " x2", " X 3"
    /\s+qty\.?\s*(\d{1,3})\s*$/i,                              // matches " qty 2", " Qty. 3"
    /^\s*(\d{1,3})\s*[xX×]\s+(?!\d+(?:\s*(?:[xX×]|\b(?:in|inch|cm|mm|m)\b)|\b(?!\s*(?:ml|g|kg|l|oz|cl|dl|floz|lb|pcs|pack|pk|ct|cans|serving|servings|bottle|bottles|can|cans)\b)))/i, // matches "2x " but not "3 x 3" or "3 x 3 in"
  ];

  for (const pattern of quantityPatterns) {
    const match = cleanName.match(pattern);
    if (match) {
      const parsedQty = parseInt(match[1], 10);
      if (Number.isFinite(parsedQty) && parsedQty > 1) {
        return Math.min(100, parsedQty);
      }
      break;
    }
  }
  return 1;
}

export function normalizeCleanCatalogResponse(
  parsed: any,
  allowedCategories: string[],
  observations: CatalogObservationInput[]
): CleanCatalogResponse {
  const obsMap = new Map(observations.map((o) => [o.id, o]));

  // 1. Normalize Canonical Items and map categories safely
  const canonicalItems = Array.isArray(parsed?.canonicalItems)
    ? parsed.canonicalItems.map((item: any) => {
        const rawCategory = String(item?.categoryName || "Other").trim();
        
        // Find best match in allowed categories using cascading matcher
        const matchedCategory = allowedCategories.find(
          (c: string) => c.toLowerCase() === rawCategory.toLowerCase()
        ) || allowedCategories.find(
          (c: string) => {
            const escapedCategory = rawCategory.replace(/[.*+?^${}()|[\]\\]/g, (match) => '\\' + match);
            const pattern = new RegExp(`\\b${escapedCategory.toLowerCase()}\\b`, 'i');
            return pattern.test(c.toLowerCase());
          }
        ) || allowedCategories.find(
          (c: string) => c.toLowerCase().startsWith(rawCategory.toLowerCase())
        ) || "Other";

        return {
          id: String(item?.id || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generic-item",
          name: String(item?.name || "Generic Item").trim(),
          categoryName: matchedCategory,
          decipheredVenue: item?.decipheredVenue && String(item.decipheredVenue).trim() !== "" ? String(item.decipheredVenue).trim() : null,
          description: String(item?.description || "Consolidated budget item").trim(),
        };
      })
    : [];

  // Default fallback item if no canonical items were returned
  if (canonicalItems.length === 0) {
    canonicalItems.push({
      id: "generic-item",
      name: "Generic Consolidated Item",
      categoryName: allowedCategories[0] || "Other",
      decipheredVenue: null,
      description: "Default fallback canonical budget item.",
    });
  }

  const canonicalIds = new Set(canonicalItems.map((c: CanonicalItemOutput) => c.id));
  const fallbackCanonicalId = canonicalItems[0].id;

  // 2. Validate mappings and match IDs (with deterministic programmatic quantity & price parsing)
  const mappings: CatalogMappingOutput[] = Array.isArray(parsed?.mappings)
    ? parsed.mappings
        .map((m: any) => {
          const obsId = String(m?.observationId || "").trim();
          const obs = obsMap.get(obsId);
          if (!obs) return null; // Reject mapping for unknown observation

          let canonicalId = String(m?.canonicalItemId || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
          if (!canonicalIds.has(canonicalId)) {
            canonicalId = fallbackCanonicalId;
          }

          // --- Programmatic Quantity & Unit Price Resolution ---
          const quantity = extractQuantity(obs.itemName);

          let rawCleanedPrice = typeof m?.cleanedPrice === "number" && Number.isFinite(m.cleanedPrice)
            ? m.cleanedPrice
            : obs.price;

          if (quantity > 1 && Math.abs(rawCleanedPrice - obs.price) < 0.01) {
            rawCleanedPrice = obs.price / quantity;
          }

          if (!Number.isFinite(rawCleanedPrice)) {
            rawCleanedPrice = 0;
          }

          return {
            observationId: obsId,
            canonicalItemId: canonicalId,
            decipheredVenue: m?.decipheredVenue && String(m.decipheredVenue).trim() !== "" ? String(m.decipheredVenue).trim() : null,
            cleanedPrice: Math.round(rawCleanedPrice * 100) / 100,
          };
        })
        .filter((m: any): m is CatalogMappingOutput => m !== null)
    : [];

  // 3. Robust Mapping Check Guarantee: every input observation MUST be mapped
  const mappedObsIds = new Set(mappings.map((m) => m.observationId));
  
  observations.forEach((obs) => {
    if (!mappedObsIds.has(obs.id)) {
      const quantity = extractQuantity(obs.itemName);
      let rawCleanedPrice = obs.price / quantity;
      if (!Number.isFinite(rawCleanedPrice)) {
        rawCleanedPrice = 0;
      }

      mappings.push({
        observationId: obs.id,
        canonicalItemId: fallbackCanonicalId,
        decipheredVenue: null,
        cleanedPrice: Math.round(rawCleanedPrice * 100) / 100,
      });
    }
  });

  return {
    schemaVersion: Number(parsed?.schemaVersion) || 1,
    canonicalItems,
    mappings,
  };
}
