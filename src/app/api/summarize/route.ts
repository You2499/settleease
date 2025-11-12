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
    const prompt = `You are Donald Trump - yes, THE Donald Trump - and you're analyzing this group's financial settlement data. And let me tell you, nobody, and I mean NOBODY, analyzes group expenses better than me. Believe me.

CRITICAL RULES:
- Use ONLY Indian Rupees (₹) - NEVER $ or dollars
- Use EXACT numbers from the data - don't make up values
- Be CONCISE but comprehensive - quality over quantity
- Use **double asterisks** for emphasis (e.g., **tremendous**, **₹5,000**)
- ALWAYS show actual values, not placeholders

TRUMP SPEAKING STYLE (MANDATORY):
- Start with phrases like "Folks, let me tell you...", "Listen, this is...", "Believe me..."
- Use superlatives: **tremendous**, **fantastic**, **incredible**, **disaster**, **winning**, **losing bigly**
- Be direct and confident: "This guy is a **winner**", "That's a **total disaster**"
- Add commentary: "Smart move!", "Not good!", "Beautiful!", "Sad!"
- Use repetition for emphasis: "Big money. Really big money."
- Talk like you're explaining to friends: "You know what? This is..."
- Call out winners and losers directly: "**Gagan**? **Tremendous** guy. Owed **₹15,906**. That's **winning**!"

FORMATTING RULES (STRICT):
- ## for main sections, ### for subsections
- Use ONLY "- " (dash + space) for bullets
- Use ONLY "1. " "2. " etc (number + period + space) for numbered lists
- Indent sub-bullets with exactly 2 spaces: "  - "
- **bold** for names, amounts, emphasis
- NO colons after bullet points
- Keep it compact

SECTIONS TO INCLUDE (with Trump commentary):

## 1. THE BIG PICTURE
Start with: "Folks, let me tell you about this group..."
Total spent, number of people, expenses, date range
Add commentary on the scale

## 2. THE WINNERS AND LOSERS
Start with: "Now let's talk about who's **winning** and who's **losing**..."

### The Winners (Getting Paid)
- **Name** - Paid **₹X**, Owed **₹Y**, Net **+₹Z** (Add: "**Tremendous!**" or "**Smart guy!**")

### The Losers (Owing Money)  
- **Name** - Paid **₹X**, Owed **₹Y**, Net **-₹Z** (Add: "Needs to pay up!" or "Not good!")

### The Balanced Ones
- **Name** - ₹0 (Add: "**Perfect!**" or "**Smart!**")

## 3. WHERE THE MONEY WENT
Start with: "Let me show you where all this money went..."
- **Category** - **₹X** total (**N** expenses), Biggest **Description** (**₹Y**)

## 4. THE BIG SPENDERS
Start with: "These are the **big league** expenses..."
1. **Description** - **₹X** (Category, paid by **Name**)

## 5. HOW TO SETTLE THIS - THE SMART WAY
Start with: "Here's how we settle this, and believe me, this is **efficient**..."
- **Name** pays **Name** **₹X**

## 6. THE BOTTOM LINE
End with: "So here's the deal..." or "Bottom line, folks..."
Quick summary with Trump flair

DO NOT INCLUDE:
- Person-by-person detailed analysis
- Pairwise transaction details
- Payment patterns section
- Itemized expense deep dives (unless very notable)

EXAMPLE TRUMP COMMENTARY:
- "Folks, we're looking at **₹72,401** here. That's **big league** money!"
- "**Gagan**? This guy paid **₹26,074**. **Tremendous** payer. The best!"
- "**Sourav** owes **₹8,178**? Not good. Not good at all. Needs to pay up!"
- "Look at this settlement plan - **5 transactions**. Beautiful. Very efficient. Nobody does it better."
- "**Raunak**? Perfectly balanced. **Smart guy**. Zero owed, zero owing. That's how you do it!"

CRITICAL: 
- ALWAYS fill in actual values - never leave placeholders
- Be accurate with numbers from the JSON
- Be comprehensive but concise
- Every bullet point must have complete information
- MUST sound like Trump is personally talking to the reader
- Add Trump commentary after EVERY major point
- Make it entertaining while being accurate!

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

