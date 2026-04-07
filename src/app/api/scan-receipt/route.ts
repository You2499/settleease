import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const RECEIPT_PARSE_PROMPT = `You are an expert receipt/invoice parser. Parse this receipt image with extreme precision.

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
      "category_hint": "food"
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

Parsing rules:
1. Multi-line item names (e.g. "PERI PERI FRIES WITH" followed by "CHEESE SAUCE" on the next line) MUST be merged into a single item name.
2. category_hint must be one of: "food", "drinks", "alcohol", "other".
   - Beer, wine, spirits, cocktails, liquor = "alcohol"
   - Water, juice, soda, tea, coffee = "drinks"
   - All meals, snacks, starters, mains, desserts = "food"
   - Service charge, packaging, delivery = "other"
3. Include ALL tax lines individually (CGST, SGST, VAT, service charge, GST, etc.) in the "taxes" array.
4. "total_amount" must be the FINAL grand total printed on the receipt (the amount the customer pays).
5. Dates in DD/MM/YY or DD/MM/YYYY format must be converted to YYYY-MM-DD. Assume 2000s for 2-digit years.
6. Round all amounts to exactly 2 decimal places.
7. If a field genuinely cannot be determined from the image, use null for strings or omit the entry.
8. "subtotals" should capture intermediate totals like "Food Total", "Liquor Total", "Sub Total" etc.
9. "additional_charges" captures rounding amounts, packaging, delivery fees, tips, etc.
10. For quantity and unit_price: if only a total is visible (no qty/rate columns), set quantity=1 and unit_price=total_price.
11. Do NOT include tax lines or subtotal lines in the "items" array — they go in their own arrays.`;

// Maximum image size: 4MB in base64
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Scan Receipt API called');

    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured. Please contact administrator.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { image, mimeType } = await request.json();

    if (!image || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Image data and MIME type are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: `Unsupported image type: ${mimeType}. Use JPEG, PNG, or WebP.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check size (base64 string length approximates bytes)
    if (image.length > MAX_IMAGE_SIZE_BYTES * 1.37) { // base64 overhead ~37%
      return new Response(
        JSON.stringify({ error: 'Image is too large. Please use an image under 4MB.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Image received, calling Gemma 4 vision...');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemma-4-31b-it' });

    const result = await model.generateContent([
      RECEIPT_PARSE_PROMPT,
      {
        inlineData: {
          mimeType,
          data: image,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    console.log('✅ Gemma 4 response received, parsing JSON...');

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

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Scan Receipt Error:', error);

    let userMessage = 'Failed to scan receipt. Please try again.';
    if (error.message?.includes('Could not extract valid JSON')) {
      userMessage = 'Could not read the receipt clearly. Please try with a clearer image.';
    } else if (error.message?.includes('overloaded') || error.message?.includes('503')) {
      userMessage = 'AI service is currently busy. Please try again in a moment.';
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      userMessage = 'API quota exceeded. Please try again later.';
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
