import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use Gemini 1.5 Flash for fast, cost-effective vision processing
// Alternative: 'gemini-1.5-pro' for higher accuracy but slower/more expensive
const MODEL_NAME = 'gemini-1.5-flash';

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
      "category_hint": "food" | "drinks" | "alcohol" | "other"
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
2. Include ALL tax lines individually (CGST, SGST, VAT, service charge, GST, etc.) in the "taxes" array
3. "total_amount" must be the FINAL grand total printed on the receipt (the amount the customer pays)
4. Dates in DD/MM/YY or DD/MM/YYYY format must be converted to YYYY-MM-DD. Assume 2000s for 2-digit years
5. Round all amounts to exactly 2 decimal places
6. If a field genuinely cannot be determined from the image, use null for strings or omit the entry
7. "subtotals" should capture intermediate totals like "Food Total", "Liquor Total", "Sub Total" etc.
8. "additional_charges" captures rounding amounts, packaging, delivery fees, tips, etc.
9. For quantity and unit_price: if only a total is visible (no qty/rate columns), set quantity=1 and unit_price=total_price
10. Do NOT include tax lines or subtotal lines in the "items" array — they go in their own arrays
11. Be intelligent about item categorization - use context clues from the restaurant type and item names`;

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

    const { image, mimeType } = await request.json();

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

    // Check size (base64 string length approximates bytes)
    const estimatedSize = (image.length * 3) / 4; // More accurate base64 size calculation
    if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
      clearTimeout(timeoutId);
      return Response.json(
        { error: 'Image is too large. Please use an image under 4MB.' },
        { status: 400 }
      );
    }

    console.log(`✅ Image received (${Math.round(estimatedSize / 1024)}KB), calling Gemini ${MODEL_NAME}...`);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent, deterministic parsing
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048, // Sufficient for receipt data
      },
    });

    const result = await model.generateContent([
      RECEIPT_PARSE_PROMPT,
      {
        inlineData: {
          mimeType,
          data: image,
        },
      },
    ]);

    clearTimeout(timeoutId);

    const response = result.response;
    const text = response.text();

    console.log('✅ Gemini response received, parsing JSON...');

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

    // Validate required fields
    if (!parsedData.items || !Array.isArray(parsedData.items)) {
      throw new Error('AI response missing required "items" array');
    }

    if (typeof parsedData.total_amount !== 'number') {
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

    if (error.message?.includes('Could not extract valid JSON')) {
      userMessage = 'Could not read the receipt clearly. Please try with a clearer, well-lit image.';
      statusCode = 422;
    } else if (error.message?.includes('API key')) {
      userMessage = 'AI service configuration error. Please contact support.';
      statusCode = 500;
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      userMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message?.includes('overloaded') || error.message?.includes('503')) {
      userMessage = 'AI service is currently busy. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
      userMessage = 'Image content was blocked by safety filters. Please try a different image.';
      statusCode = 400;
    } else if (error.message?.includes('invalid') || error.message?.includes('format')) {
      userMessage = 'Invalid image format. Please use JPEG, PNG, or WebP.';
      statusCode = 400;
    }

    return Response.json(
      {
        error: userMessage,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
        retryable: statusCode !== 400, // Indicate if retry might help
      },
      { status: statusCode }
    );
  }
}
