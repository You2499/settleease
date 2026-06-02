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
            description: "The specific restaurant, venue, or merchant deciphered from the expense description or item context (e.g., 'McDonald's', 'Walmart'). Use null if it is generic, ambiguous, or no specific venue is mentioned.",
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
            description: "The specific restaurant or venue deciphered for this individual observation (e.g. 'McDonald's', 'Walmart'). Use null if none could be deciphered.",
          },
          cleanedPrice: {
            type: "number",
            description: "The cleaned unit price for this individual observation, rounding to exactly 2 decimal places. Typically matches the input price.",
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
   - Identify items that represent the exact same product or service (e.g., "coca-cola 330ml", "coke can", "coca cola") and group them into a single canonical budget item.
   - Assign a clean, professional, and properly capitalized canonical name (e.g., "Coca-Cola" instead of "coke can", "Veggie Burger" instead of "veg burger 2x").
   - Strip out quantity, package sizes, or volume markers (like "330ml", "500ml", "1L", "pack of 6", "x2") from the canonical item name.
   - Keep the generated canonical item ID short, lowercase, and URL-safe (e.g., "coca-cola", "veggie-burger").

2. Category Assignment:
   - Match each canonical item to the best-fitting category from the allowed categories list provided below.
   - Do NOT invent or use category names that are not in the allowed categories list. If none fit perfectly, use the best approximation or "Other".

3. Venue / Restaurant Deciphering:
   - Extract the specific merchant, restaurant, or venue name from the expense description or the item name itself (e.g., extracting "McDonald's" from "Dinner at McDonald's" or "McDonalds delivery", or "Starbucks" from "Starbucks coffee").
   - Use proper capitalization and spelling for venue names (e.g., "McDonald's" instead of "mcdonalds").
   - If the item is general, or no specific venue can be deciphered, return null for "decipheredVenue".

4. Individual Mapping:
   - Map EVERY single input observation ID to its designated canonical item ID.
   - For each mapping, decipher the venue specifically for that observation, and output its cleaned price (rounded to 2 decimal places).

Allowed Categories:
{{ALLOWED_CATEGORIES}}

Input Observations to Consolidate:
{{OBSERVATIONS}}

Return ONLY valid JSON matching the required response schema. No markdown code fences, no leading/trailing explanation text.`;

export function injectCleanCatalogPrompt(
  promptTemplate: string,
  allowedCategories: string[],
  observations: CatalogObservationInput[]
): string {
  return promptTemplate
    .replace("{{ALLOWED_CATEGORIES}}", allowedCategories.join(", "))
    .replace("{{OBSERVATIONS}}", JSON.stringify(observations, null, 2));
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
        
        // Find best match in allowed categories
        const matchedCategory = allowedCategories.find(
          (c: string) => c.toLowerCase() === rawCategory.toLowerCase()
        ) || allowedCategories.find(
          (c: string) => c.toLowerCase().includes(rawCategory.toLowerCase()) || rawCategory.toLowerCase().includes(c.toLowerCase())
        ) || "Other";

        return {
          id: String(item?.id || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "generic-item",
          name: String(item?.name || "Generic Item").trim(),
          categoryName: matchedCategory,
          decipheredVenue: item?.decipheredVenue ? String(item.decipheredVenue).trim() : null,
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

  // 2. Validate mappings and match IDs
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

          return {
            observationId: obsId,
            canonicalItemId: canonicalId,
            decipheredVenue: m?.decipheredVenue ? String(m.decipheredVenue).trim() : null,
            cleanedPrice: typeof m?.cleanedPrice === "number" && Number.isFinite(m.cleanedPrice)
              ? Math.round(m.cleanedPrice * 100) / 100
              : Math.round(obs.price * 100) / 100,
          };
        })
        .filter((m: any): m is CatalogMappingOutput => m !== null)
    : [];

  // 3. Robust Mapping Check Guarantee: every input observation MUST be mapped
  const mappedObsIds = new Set(mappings.map((m) => m.observationId));
  
  observations.forEach((obs) => {
    if (!mappedObsIds.has(obs.id)) {
      mappings.push({
        observationId: obs.id,
        canonicalItemId: fallbackCanonicalId,
        decipheredVenue: null,
        cleanedPrice: Math.round(obs.price * 100) / 100,
      });
    }
  });

  return {
    schemaVersion: Number(parsed?.schemaVersion) || 1,
    canonicalItems,
    mappings,
  };
}
