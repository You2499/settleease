import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// List of models to try in order of preference (fastest to most capable)
const MODEL_FALLBACK_ORDER = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-preview-09-2025',
  'gemini-2.5-flash-lite-preview-09-2025',
  'gemini-2.5-pro',
];

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Summarize API called');
    const { jsonData, hash } = await request.json();

    if (!jsonData) {
      console.error('❌ No JSON data provided');
      return new Response(JSON.stringify({ error: 'JSON data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ JSON data received, hash:', hash);

    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'AI service is not configured. Please contact administrator.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ API key found, initializing Gemini...');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Create enhanced prompt for detailed Donald Trump style summarization with Indian context
    const prompt = `You are Donald Trump analyzing this group's financial settlement data. Be DETAILED, ACCURATE, and SPECIFIC using the actual data provided.

CRITICAL RULES:
- Use ONLY Indian Rupees (₹) - NEVER $ or dollars
- Use EXACT numbers from the data - don't make up values
- Be CONCISE but comprehensive - quality over quantity
- Use Donald Trump's style: bold, direct, confident
- Use **double asterisks** for emphasis (e.g., **tremendous**, **₹5,000**)
- ALWAYS show actual values, not placeholders like "Total Paid: **₹26,074.43**" - fill in ALL details

FORMATTING:
- ## for main sections, ### for subsections
- Use - for bullets, 1. 2. 3. for numbered lists
- Indent sub-bullets with 2 spaces
- **bold** for names, amounts, emphasis
- Keep it compact - no excessive spacing

SECTIONS TO INCLUDE (ONLY these, nothing more):

## 1. THE BIG PICTURE
Total spent, number of people, expenses, date range

## 2. WHO OWES WHO
### Creditors (Getting Paid)
For EACH person owed money:
- **Name**: Paid **₹X** | Owed **₹Y** | Net **+₹Z**

### Debtors (Owing Money)  
For EACH person owing money:
- **Name**: Paid **₹X** | Owed **₹Y** | Net **-₹Z**

### Balanced
Anyone at ₹0

## 3. EXPENSE BREAKDOWN BY CATEGORY
For EACH category:
- **Category**: **₹X** total (**N** expenses)
- Biggest: **Description** (**₹Y**)

## 4. TOP 5 BIGGEST EXPENSES
1. **Description** - **₹X** (Category, paid by **Name**)

## 5. SETTLEMENT PLAN (Simplified)
List ALL transactions:
- **Name** pays **Name**: **₹X**

## 6. THE BOTTOM LINE
Quick summary of settlement status

DO NOT INCLUDE:
- Person-by-person detailed analysis
- Pairwise transaction details
- Payment patterns section
- Itemized expense deep dives (unless very notable)

TRUMP STYLE:
Use phrases like: "**tremendous**", "**big league**", "**smart move**", "**winning**", "believe me"
Keep it confident and direct, but ALWAYS use real data - no vague statements!

CRITICAL: 
- ALWAYS fill in actual values - never leave placeholders
- Be accurate with numbers from the JSON
- Be comprehensive but concise
- Every bullet point must have complete information

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Now provide an EXTREMELY DETAILED and COMPREHENSIVE analysis in Donald Trump's voice. Use ALL the data available - expenses, people, categories, itemized details, settlements, transactions, and balances. Make it engaging, specific, and thorough!`;

    // Try models in fallback order until one succeeds
    let result;
    let successfulModel = null;
    const errors: string[] = [];

    for (const modelName of MODEL_FALLBACK_ORDER) {
      try {
        console.log(`🔄 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContentStream(prompt);
        successfulModel = modelName;
        console.log(`✅ Successfully using model: ${modelName}`);
        break;
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.warn(`⚠️ Model ${modelName} failed: ${errorMsg}`);
        errors.push(`${modelName}: ${errorMsg}`);
        
        // If this is the last model, throw the error
        if (modelName === MODEL_FALLBACK_ORDER[MODEL_FALLBACK_ORDER.length - 1]) {
          console.error('❌ All models failed');
          throw new Error(
            `All AI models are currently unavailable. Please try again later. Errors: ${errors.join('; ')}`
          );
        }
        // Otherwise, continue to next model
        continue;
      }
    }

    if (!result || !successfulModel) {
      throw new Error('Failed to generate content with any available model');
    }

    console.log('✅ Stream created, starting to send chunks...');

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0;
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              chunkCount++;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`));
            }
          }
          console.log(`✅ Streaming complete. Sent ${chunkCount} chunks`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, hash })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('❌ Streaming error:', error);
          console.error('Error details:', error.message, error.stack);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message || 'Streaming failed' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('❌ API Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Provide user-friendly error messages
    let userMessage = 'Failed to generate summary. Please try again.';
    
    if (error.message?.includes('overloaded') || error.message?.includes('503')) {
      userMessage = 'AI service is currently busy. Please try again in a moment.';
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      userMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message?.includes('API key')) {
      userMessage = 'AI service configuration error. Please contact administrator.';
    } else if (error.message?.includes('All AI models')) {
      userMessage = error.message; // Use the detailed message from fallback
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

