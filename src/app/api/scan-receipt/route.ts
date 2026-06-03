import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchAiModelAttemptOrder } from '@/lib/settleease/aiModelConfigServer';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Request timeout: 30 seconds
const REQUEST_TIMEOUT_MS = 30000;

// Maximum image size: 4MB in base64
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

const RECEIPT_PARSE_PROMPT = `You are an expert receipt/invoice parser. Parse this receipt image with extreme precision.

CRITICAL RULES FOR MULTI-LINE ITEMS:
- Items that span multiple lines MUST be merged into a single item
- Example: "PERI PERI FRIES WITH" on line 1 + "CHEESE SAUCE" on line 2 = ONE item "PERI PERI FRIES WITH CHEESE SAUCE"
- Look for items without prices on the first line - they continue on the next line
- Common patterns: descriptions split across 2-3 lines, modifiers on separate lines

Return ONLY valid JSON (no markdown fences, no explanation, no extra text) matching this exact schema:
{
  "restaurant_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price": 0.00,
      "total_price": 0.00,
      "category_hint": "food" | "drinks" | "alcohol" | "other",
      "category_name": "one allowed app category name or null"
    }
  ],
  "subtotals": [
    { "label": "string", "amount": 0.00 }
  ],
  "taxes": [
    { "label": "string", "amount": 0.00 }
  ],
  "total_amount": 0.00,
  "currency": "INR",
  "additional_charges": [
    { "label": "string", "amount": 0.00 }
  ]
}

Category hints (MUST be one of these):
- "alcohol": Beer, wine, spirits, cocktails, liquor, alcoholic beverages
- "drinks": Water, juice, soda, tea, coffee, soft drinks, non-alcoholic beverages
- "food": All meals, snacks, starters, mains, desserts, appetizers, sides
- "other": Service charge, packaging, delivery, tips, miscellaneous

Parsing rules:
1. Merge multi-line item names into single items - this is CRITICAL
2. Include ALL tax lines individually (CGST, SGST, IGST, VAT, GST, etc.) in the "taxes" array
3. "total_amount" must be the FINAL grand total printed on the receipt (the amount the customer pays)
4. Dates in DD/MM/YY or DD/MM/YYYY format must be converted to YYYY-MM-DD. Assume 2000s for 2-digit years
5. Round all amounts to exactly 2 decimal places
6. If a field genuinely cannot be determined from the image, use null for strings or omit the entry
7. "subtotals" should capture intermediate totals like "Food Total", "Liquor Total", "Sub Total" etc.
8. "additional_charges" captures service charge, rounding amounts, packaging, delivery fees, tips, etc.
9. For quantity and unit_price: if only a total is visible (no qty/rate columns), set quantity=1 and unit_price=total_price
10. Do NOT include tax lines or subtotal lines in the "items" array — they go in their own arrays
11. Be intelligent about item categorization - use context clues from item names, not only the venue type
12. Packaged water, mineral water, bottled water, soda, juice, tea, coffee, and soft drinks are "drinks", not hotel/restaurant/food by default
13. If an item name includes a quantity marker such as "(x2)", "(2)", "x 2", or "2 x", remove it from "name" and put the count in "quantity"
14. If you are not confident which allowed app category fits an item, set "category_name" to null`;

type AllowedCategory = {
  name: string;
  icon_name?: string | null;
};

const VALID_CATEGORY_HINTS = new Set(["food", "drinks", "alcohol", "other"]);

function toAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

function normalizeText(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeLookup(value: string): string {
  return normalizeText(value).toLowerCase();
}

function normalizeQuantity(value: unknown): number {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) return 1;
  return Math.max(1, Math.floor(quantity));
}

function buildReceiptPrompt(categories: AllowedCategory[]) {
  const categoryNames = categories
    .map((category) => category.name)
    .filter(Boolean)
    .join(", ");

  return `${RECEIPT_PARSE_PROMPT}

Allowed app categories for "category_name":
${categoryNames || "No app categories were provided."}

Rules for "category_name":
- Use exactly one of the allowed app category names above, preserving spelling and casing.
- Use "Tax" or an equivalent allowed tax category only for tax rows, but tax rows must still be in "taxes", not "items".
- Do not use broad venue categories such as Hotel/Restaurant for packaged water or tax lines unless the item itself is truly that category.
- If no allowed category clearly fits, return null for "category_name".`;
}

function sanitizeCategories(value: unknown): AllowedCategory[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const name = normalizeText((entry as any).name);
      if (!name) return null;
      const normalized = normalizeLookup(name);
      if (seen.has(normalized)) return null;
      seen.add(normalized);
      return {
        name,
        icon_name: normalizeText((entry as any).icon_name) || null,
      };
    })
    .filter(Boolean) as AllowedCategory[];
}

function findAllowedCategoryByName(name: unknown, categories: AllowedCategory[]): string | null {
  const normalized = normalizeLookup(String(name || ""));
  if (!normalized) return null;
  return categories.find((category) => normalizeLookup(category.name) === normalized)?.name || null;
}

function findAllowedCategoryByKeywords(keywords: string[], categories: AllowedCategory[]): string | null {
  for (const category of categories) {
    const normalizedName = normalizeLookup(category.name);
    if (keywords.some((keyword) => normalizedName.includes(keyword) || keyword.includes(normalizedName))) {
      return category.name;
    }
  }

  return null;
}

function isWaterLikeItem(name: string) {
  return /(packaged|mineral|bottled|sparkling)\s+water|water\s*(bottle|glass|can)?/.test(name.toLowerCase());
}

function isTaxLikeLabel(label: string) {
  return /\b(cgst|sgst|igst|utgst|gst|vat|tax|taxes|cess)\b/i.test(label);
}

function isSubtotalLikeLabel(label: string) {
  return /\b(sub\s*total|subtotal|grand\s*total|total\s*amount|net\s*amount|amount\s*due|balance\s*due)\b/i.test(label);
}

function isChargeLikeLabel(label: string) {
  return /\b(service\s*charge|packing|packaging|delivery|tip|tips|round\s*off|rounding|convenience|charge|fee)\b/i.test(label);
}

function extractQuantityFromName(name: string, providedQuantity: number) {
  let cleanName = normalizeText(name);
  let quantity = providedQuantity;

  const patterns = [
    /\s*[\(\[]\s*[xX×]?\s*(\d{1,3})\s*[\)\]]\s*$/,
    /\s+[xX×]\s*(\d{1,3})\s*$/,
    /\s+qty\.?\s*(\d{1,3})\s*$/i,
    /^\s*(\d{1,3})\s*[xX×]\s+/,
  ];

  for (const pattern of patterns) {
    const match = cleanName.match(pattern);
    if (!match) continue;
    const parsedQuantity = normalizeQuantity(match[1]);
    if (quantity <= 1 && parsedQuantity > 1) {
      quantity = parsedQuantity;
    }
    cleanName = normalizeText(cleanName.replace(pattern, ""));
    break;
  }

  return { name: cleanName, quantity };
}

function normalizeCategoryNameForItem(item: any, categories: AllowedCategory[]): string | null {
  const direct = findAllowedCategoryByName(item.category_name, categories);
  const itemName = normalizeText(item.name);

  if (isWaterLikeItem(itemName)) {
    return findAllowedCategoryByKeywords(["water", "drink", "drinks", "beverage", "beverages"], categories);
  }

  if (direct) return direct;

  const hint = normalizeLookup(item.category_hint);
  const keywordMap: Record<string, string[]> = {
    food: ["food", "meal", "dinner", "lunch", "breakfast", "restaurant", "dining", "eat"],
    drinks: ["drink", "drinks", "beverage", "beverages", "water", "juice", "coffee", "tea", "soda"],
    alcohol: ["alcohol", "bar", "liquor", "beer", "wine", "spirit", "cocktail"],
    other: ["other", "misc", "miscellaneous", "general"],
  };

  return findAllowedCategoryByKeywords(keywordMap[hint] || [], categories);
}

function normalizeParsedReceiptData(parsedData: any, categories: AllowedCategory[]) {
  const taxes = Array.isArray(parsedData.taxes) ? [...parsedData.taxes] : [];
  const subtotals = Array.isArray(parsedData.subtotals) ? [...parsedData.subtotals] : [];
  const additionalCharges = Array.isArray(parsedData.additional_charges)
    ? [...parsedData.additional_charges]
    : [];
  const items = Array.isArray(parsedData.items) ? parsedData.items : [];

  const normalizedItems = items.flatMap((rawItem: any) => {
    const rawName = normalizeText(rawItem?.name);
    const quantityFromModel = normalizeQuantity(rawItem?.quantity);
    const unitPriceFromModel = toAmount(rawItem?.unit_price);
    const rawTotal =
      toAmount(rawItem?.total_price ?? rawItem?.price) ||
      toAmount(unitPriceFromModel * quantityFromModel);
    if (!rawName || rawTotal <= 0) return [];

    if (isSubtotalLikeLabel(rawName)) {
      subtotals.push({ label: rawName, amount: rawTotal });
      return [];
    }

    if (isTaxLikeLabel(rawName)) {
      taxes.push({ label: rawName, amount: rawTotal });
      return [];
    }

    if (isChargeLikeLabel(rawName)) {
      additionalCharges.push({ label: rawName, amount: rawTotal });
      return [];
    }

    const cleaned = extractQuantityFromName(rawName, quantityFromModel);
    const unitPrice =
      unitPriceFromModel > 0 &&
      Math.abs(unitPriceFromModel * cleaned.quantity - rawTotal) <= 0.05
        ? unitPriceFromModel
        : toAmount(rawTotal / cleaned.quantity);
    const categoryHint = VALID_CATEGORY_HINTS.has(rawItem?.category_hint)
      ? rawItem.category_hint
      : isWaterLikeItem(cleaned.name)
        ? "drinks"
        : "other";

    return [{
      name: cleaned.name,
      quantity: cleaned.quantity,
      unit_price: unitPrice,
      total_price: rawTotal,
      category_hint: categoryHint,
      category_name: normalizeCategoryNameForItem(
        { ...rawItem, name: cleaned.name, category_hint: categoryHint },
        categories
      ),
    }];
  });

  const normalizedTaxes = taxes
    .map((tax: any) => ({
      label: normalizeText(tax?.label),
      amount: toAmount(tax?.amount),
    }))
    .filter((tax: any) => tax.label && Math.abs(tax.amount) > 0.01);

  const normalizedCharges = additionalCharges
    .map((charge: any) => ({
      label: normalizeText(charge?.label),
      amount: toAmount(charge?.amount),
    }))
    .filter((charge: any) => charge.label && Math.abs(charge.amount) > 0.01);

  const normalizedSubtotals = subtotals
    .map((subtotal: any) => ({
      label: normalizeText(subtotal?.label),
      amount: toAmount(subtotal?.amount),
    }))
    .filter((subtotal: any) => subtotal.label && Math.abs(subtotal.amount) > 0.01);

  return {
    restaurant_name: parsedData.restaurant_name ?? null,
    date: parsedData.date ?? null,
    items: mergeSplitItems(normalizedItems),
    subtotals: normalizedSubtotals,
    taxes: normalizedTaxes,
    total_amount: toAmount(parsedData.total_amount),
    currency: parsedData.currency || "INR",
    additional_charges: normalizedCharges,
  };
}

/**
 * 2. Programmatic multi-line item merging logic
 * Merges split items that the LLM failed to merge or split across multiple lines.
 */
function mergeSplitItems(items: any[]): any[] {
  if (items.length <= 1) return items;

  const merged: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const current = items[i];

    if (merged.length > 0) {
      const prev = merged[merged.length - 1];

      const currentName = current.name;
      const prevName = prev.name;

      // Indicators that 'current' is a continuation of 'prev':
      // 1. prevName ends with a connector/dangling word or symbol
      const endsWithConnector = /(?:\b(with|and|add|extra|for|w\/|or)|[+\-&])\s*$/i.test(prevName);

      // 2. currentName starts with a modifier or continuation prefix
      const startsWithModifier = /^\s*([+\-•*]|with|add|extra|no|side|w\/)\b/i.test(currentName) || /^\s*[+&•*-]/i.test(currentName);

      // 3. prev item has no price (free or LLM parsing omission for a line split)
      const prevHasNoPrice = prev.total_price === 0 || prev.unit_price === 0;

      // 4. current item has no price (like a comment or free modifier)
      const currentHasNoPrice = current.total_price === 0 || current.unit_price === 0;

      let shouldMerge = false;

      if (endsWithConnector) {
        shouldMerge = true;
      } else if (startsWithModifier) {
        shouldMerge = true;
      } else if (prevHasNoPrice && !currentHasNoPrice) {
        shouldMerge = true;
      } else if (currentHasNoPrice && !prevHasNoPrice) {
        shouldMerge = true;
      }

      if (shouldMerge) {
        // Merge current into prev
        prev.name = normalizeText(`${prev.name} ${current.name}`);

        if (prevHasNoPrice && !currentHasNoPrice) {
          prev.unit_price = current.unit_price;
          prev.total_price = current.total_price;
          prev.quantity = current.quantity;
        } else if (!prevHasNoPrice && currentHasNoPrice) {
          // Keep prev prices
        } else {
          // Both have price, combine them
          prev.total_price = toAmount(prev.total_price + current.total_price);
          prev.quantity = Math.max(prev.quantity, current.quantity);
          prev.unit_price = toAmount(prev.total_price / prev.quantity);
        }

        // Keep the more specific category if one is other/null
        if ((prev.category_hint === 'other' || !prev.category_name) && current.category_name) {
          prev.category_hint = current.category_hint;
          prev.category_name = current.category_name;
        }

        continue; // Skip adding 'current' to the merged list since it is merged
      }
    }

    merged.push(current);
  }

  return merged;
}

/**
 * 1. Safety validation helpers
 */
function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    );
  }

  if (mimeType === 'image/webp') {
    const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  const isIhdr = buffer.toString('utf8', 12, 16) === 'IHDR';
  if (!isIhdr) return null;
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let i = 2; // Skip SOI (FF D8)
  while (i < buffer.length) {
    if (buffer[i] !== 0xFF) return null;
    while (buffer[i] === 0xFF && i < buffer.length) {
      i++;
    }
    if (i >= buffer.length) return null;
    const marker = buffer[i];
    i++;

    if (marker === 0xDA || marker === 0xD9) return null; // SOS or EOI

    if (i + 1 >= buffer.length) return null;
    const length = buffer.readUInt16BE(i);

    const isSOF = (marker >= 0xC0 && marker <= 0xC3) ||
                  (marker >= 0xC5 && marker <= 0xC7) ||
                  (marker >= 0xC9 && marker <= 0xCB) ||
                  (marker >= 0xCD && marker <= 0xCF);

    if (isSOF) {
      if (i + 2 + 5 >= buffer.length) return null;
      const height = buffer.readUInt16BE(i + 3);
      const width = buffer.readUInt16BE(i + 5);
      return { width, height };
    }

    i += length;
  }
  return null;
}

function getWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null;
  const type = buffer.toString('utf8', 12, 16);
  if (type === 'VP8X') {
    const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
    const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
    return { width, height };
  }
  if (type === 'VP8 ') {
    if (buffer[23] === 0x9D && buffer[24] === 0x01 && buffer[25] === 0x2A) {
      const width = (buffer[26] | (buffer[27] << 8)) & 0x3FFF;
      const height = (buffer[28] | (buffer[29] << 8)) & 0x3FFF;
      return { width, height };
    }
  }
  if (type === 'VP8L') {
    if (buffer[20] === 0x2F) {
      const val = buffer[21] | (buffer[22] << 8) | (buffer[23] << 16) | (buffer[24] << 24);
      const width = (val & 0x3FFF) + 1;
      const height = ((val >> 14) & 0x3FFF) + 1;
      return { width, height };
    }
  }
  return null;
}

function getImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } | null {
  if (mimeType === 'image/jpeg') return getJpegDimensions(buffer);
  if (mimeType === 'image/png') return getPngDimensions(buffer);
  if (mimeType === 'image/webp') return getWebpDimensions(buffer);
  return null;
}

/**
 * 3. Failover handling and retry loops helper
 */
async function generateContentWithRetry(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string,
  image: string,
  mimeType: string,
  globalSignal: AbortSignal,
  maxRetries = 2
): Promise<any> {
  let attempt = 0;
  while (true) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 3072,
          },
        },
        { timeout: 12000 } // 12 seconds per-attempt timeout
      );

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: image,
          },
        },
      ]);
      return result;
    } catch (error: any) {
      if (globalSignal.aborted) {
        throw error;
      }

      const errorMsg = error?.message || '';
      const errorStr = JSON.stringify(error);
      
      const is429 = errorMsg.includes('429') || errorMsg.includes('quota') || errorStr.includes('RESOURCE_EXHAUSTED');
      const is503 = errorMsg.includes('503') || errorMsg.includes('overloaded') || errorStr.includes('UNAVAILABLE');
      const isTimeout = error.name === 'AbortError' || errorMsg.includes('timeout') || errorMsg.includes('deadline');
      
      const isRetryable = is429 || is503 || isTimeout;

      if (isRetryable && attempt < maxRetries) {
        attempt++;
        const delay = attempt * 1000; // 1s, then 2s
        console.warn(`⚠️ Model ${modelName} failed with retryable error (${errorMsg || 'Timeout'}). Retrying attempt ${attempt}/${maxRetries} in ${delay}ms...`);
        
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(resolve, delay);
          globalSignal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Request aborted during backoff'));
          });
        });
        continue;
      }
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.log('📸 Scan Receipt API called');

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set');
      clearTimeout(timeoutId);
      return Response.json(
        { error: 'AI service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    const { image, mimeType, categories } = await request.json();
    const allowedCategories = sanitizeCategories(categories);

    if (!image || !mimeType) {
      clearTimeout(timeoutId);
      return Response.json(
        { error: 'Image data and MIME type are required.' },
        { status: 400 }
      );
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      clearTimeout(timeoutId);
      return Response.json(
        { error: `Unsupported image type. Use JPEG, PNG, or WebP.` },
        { status: 400 }
      );
    }

    // Handle data URI scheme if present
    let base64Data = image;
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        base64Data = match[2];
      }
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Validate signature / magic bytes to prevent executable uploads masquerading as images
    if (!verifyMagicBytes(buffer, mimeType)) {
      clearTimeout(timeoutId);
      return Response.json(
        { error: 'File signature does not match the specified image type. Executable or corrupted files are not allowed.' },
        { status: 400 }
      );
    }

    // Validate size using actual byte buffer length (more secure than base64 string length estimation)
    const actualSizeBytes = buffer.length;
    if (actualSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      clearTimeout(timeoutId);
      return Response.json(
        { error: 'Image is too large. Please use an image under 4MB.' },
        { status: 400 }
      );
    }

    // Validate image dimensions (bounds 40px to 10000px)
    const dimensions = getImageDimensions(buffer, mimeType);
    if (dimensions) {
      const { width, height } = dimensions;
      if (width < 40 || width > 10000 || height < 40 || height > 10000) {
        clearTimeout(timeoutId);
        return Response.json(
          { error: `Image dimensions (${width}x${height}) are out of bounds. Dimensions must be between 40px and 10000px.` },
          { status: 400 }
        );
      }
    }

    const modelAttemptOrder = await fetchAiModelAttemptOrder();

    console.log(`✅ Image received (${Math.round(actualSizeBytes / 1024)}KB), calling Gemini ${modelAttemptOrder[0]}...`);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    let result;
    let successfulModel = '';
    const modelErrors: string[] = [];

    for (const modelName of modelAttemptOrder) {
      try {
        result = await generateContentWithRetry(
          genAI,
          modelName,
          buildReceiptPrompt(allowedCategories),
          base64Data,
          mimeType,
          controller.signal
        );
        successfulModel = modelName;
        console.log(`✅ Successfully scanned receipt with ${modelName}`);
        break;
      } catch (modelError: any) {
        const message = modelError?.message || 'Unknown model error';
        console.warn(`⚠️ Model ${modelName} failed: ${message}`);
        modelErrors.push(`${modelName}: ${message}`);
      }
    }

    if (!result || !successfulModel) {
      throw new Error(`Could not initialize any Gemini model. Errors: ${modelErrors.join('; ')}`);
    }

    clearTimeout(timeoutId);

    const response = result.response;
    
    // Check if response was blocked
    if (!response || !response.candidates || response.candidates.length === 0) {
      console.error('❌ No candidates in response:', JSON.stringify(response));
      throw new Error('AI could not process the image. Please try a different image.');
    }

    // Check for safety blocks
    const candidate = response.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      console.error('❌ Response blocked by safety filters');
      throw new Error('SAFETY: Image was blocked by content filters');
    }

    const text = response.text();
    console.log(`✅ Gemini response received from ${successfulModel}, parsing JSON...`);
    console.log('Response preview:', text.substring(0, 200));

    // Try to extract JSON from the response (handle cases where model wraps in markdown)
    let parsedData;
    try {
      // First try direct parse
      parsedData = JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find JSON object in the text
        const braceStart = text.indexOf('{');
        const braceEnd = text.lastIndexOf('}');
        if (braceStart !== -1 && braceEnd !== -1) {
          parsedData = JSON.parse(text.substring(braceStart, braceEnd + 1));
        } else {
          throw new Error('Could not extract valid JSON from AI response');
        }
      }
    }

    parsedData = normalizeParsedReceiptData(parsedData, allowedCategories);

    // Validate required fields
    if (!parsedData.items || !Array.isArray(parsedData.items)) {
      throw new Error('AI response missing required "items" array');
    }

    if (typeof parsedData.total_amount !== 'number' || parsedData.total_amount <= 0) {
      // Try to infer total from items + taxes
      const itemsTotal = parsedData.items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
      const taxesTotal = (parsedData.taxes || []).reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
      const chargesTotal = (parsedData.additional_charges || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      parsedData.total_amount = Math.round((itemsTotal + taxesTotal + chargesTotal) * 100) / 100;
    }

    // Ensure defaults
    parsedData.taxes = parsedData.taxes || [];
    parsedData.subtotals = parsedData.subtotals || [];
    parsedData.additional_charges = parsedData.additional_charges || [];
    parsedData.currency = parsedData.currency || 'INR';

    console.log(`✅ Parsed ${parsedData.items.length} items, total: ${parsedData.total_amount}`);

    return Response.json(parsedData, { status: 200 });

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('❌ Scan Receipt Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));

    // Handle abort/timeout
    if (error.name === 'AbortError' || controller.signal.aborted) {
      return Response.json(
        { error: 'Request timed out after 30 seconds. Please try again with a clearer image.' },
        { status: 408 }
      );
    }

    // Determine user-friendly error message
    let userMessage = 'Failed to scan receipt. Please try again.';
    let statusCode = 500;

    const errorMsg = error.message || '';
    const errorStr = JSON.stringify(error);

    if (errorMsg.includes('Could not extract valid JSON')) {
      userMessage = 'Could not read the receipt clearly. Please try with a clearer, well-lit image.';
      statusCode = 422;
    } else if (errorMsg.includes('No candidates') || errorMsg.includes('could not process')) {
      userMessage = 'AI could not process the image. Please try a clearer photo with better lighting.';
      statusCode = 422;
    } else if (errorMsg.includes('API key') || errorStr.includes('API_KEY')) {
      userMessage = 'AI service configuration error. Please contact support.';
      statusCode = 500;
    } else if (errorMsg.includes('quota') || errorMsg.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      userMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (errorMsg.includes('overloaded') || errorMsg.includes('503') || errorStr.includes('UNAVAILABLE')) {
      userMessage = 'AI service is currently busy. Please try again in a moment.';
      statusCode = 503;
    } else if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked')) {
      userMessage = 'Image content was blocked by safety filters. Please try a different image.';
      statusCode = 400;
    } else if (errorMsg.includes('invalid') || errorMsg.includes('format') || errorStr.includes('INVALID_ARGUMENT')) {
      userMessage = 'Invalid image format or data. Please try a different image.';
      statusCode = 400;
    } else if (errorStr.includes('NOT_FOUND') || errorMsg.includes('not found')) {
      userMessage = 'AI model not available. Please contact support.';
      statusCode = 503;
    } else if (errorStr.includes('PERMISSION_DENIED')) {
      userMessage = 'API key does not have permission. Please contact support.';
      statusCode = 403;
    }

    return Response.json(
      {
        error: userMessage,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
        retryable: statusCode !== 400 && statusCode !== 403,
      },
      { status: statusCode }
    );
  }
}
