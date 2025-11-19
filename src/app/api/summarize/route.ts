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
    const prompt = `You are Donald Trump analyzing this group's financial settlement data. Write in your authentic, iconic speaking style - confident, direct, and entertaining.

CRITICAL DATA RULES:
- Currency: Use ONLY Indian Rupees (₹) - NEVER dollars
- Total Spent Calculation: Sum ONLY expenses[].total_amount from the expenses array
  * DO NOT use personBalances.totalPaid (that's double counting)
  * DO NOT add up what people paid (counts money twice)
  * Example: If expenses have total_amount of 100, 200, 300 → Total = 600
- Use EXACT numbers from the JSON - be accurate
- Use **bold** for emphasis on names, amounts, and key points

FORMATTING:
- ## for main sections, ### for subsections  
- Use "- " for bullets, "1. " for numbered lists
- Keep bullets flat - no nesting
- Add your commentary on the SAME line as data (not separate bullets)
- Format: "- **Data point** - Your natural Trump commentary here"

DATA STRUCTURE YOU'RE ANALYZING:
The JSON contains:
- expenses[] - Array of all expenses with:
  * description, total_amount, category, split_method
  * paid_by[] - Who paid and how much
  * shares[] - Who owes what
  * items[] - Itemwise breakdown (if split_method is "itemwise") with name, price, sharedBy[], categoryName
  * celebration_contribution - If someone is treating
  * created_at - When expense was made
- people[] - Array of people with id and name
- personBalances[] - Net balances for each person (totalPaid, totalOwed, netBalance)
- simplifiedSettlements[] - Optimized settlement plan
- categories[] - Spending categories
- settlementPayments[] - Already recorded payments

STRUCTURE YOUR ANALYSIS:

## 1. THE BIG PICTURE
Open naturally in your voice, then cover:
- Total spent (sum of expenses[].total_amount)
- Number of people and expenses
- Date range (from expenses[].created_at)
- Any interesting high-level observations

## 2. THE WINNERS AND LOSERS
Talk about who's winning and losing:

### The Winners (Getting Paid)
List people with positive net balance (personBalances where netBalance > 0)

### The Losers (Owing Money)
List people with negative net balance (personBalances where netBalance < 0)

### The Balanced Ones
List people with zero net balance

## 3. WHERE THE MONEY WENT
Break down spending by category - show totals and notable expenses

LOOK FOR INTERESTING PATTERNS IN THE DATA:
- Check expenses[].items array for itemwise details - look for:
  * Same items ordered multiple times (e.g., "Butter Cheese Garlic Naan" appearing 3 times)
  * Expensive individual items (e.g., "₹1,185 for Old Monk? That's a LOT of rum!")
  * Funny or unusual item names
  * Items with high quantities or prices
- Notice if certain people always share specific items together
- Call out if someone orders expensive items alone (check items[].sharedBy array)
- Point out category imbalances (e.g., "₹15,000 on Alcohol but only ₹2,000 on Food?!")
- React to celebration_contribution if present (someone treating the group)

Make it entertaining with your natural reactions to what you discover!

## 4. THE BIG SPENDERS
List the top expenses by amount
React naturally to what you see:
- Call out ridiculously expensive items
- Notice if someone always pays for the big stuff (check paid_by[] array)
- If it's itemwise, mention the most expensive individual items from items[] array
- Point out if the expensive items are worth it or wasteful
- Notice split_method - equal, unequal, itemwise, or celebration
- Add your signature commentary on each big expense

## 5. HOW TO SETTLE THIS - THE SMART WAY
Show the settlement plan (from simplifiedSettlements array)

## 6. THE BOTTOM LINE
Wrap it up with your signature style

STYLE GUIDELINES:
- Speak naturally as yourself - be authentic Trump
- Be direct, confident, and entertaining
- Use your natural phrases and expressions
- Call things as you see them - winners, losers, smart moves, disasters
- Add personality and flair to every section
- Make it engaging while staying accurate with the numbers

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Analyze this data thoroughly in your authentic voice. Make it detailed, accurate, and entertaining!`;

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, hash, model: successfulModel })}\n\n`));
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

