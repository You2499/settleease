import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

export async function POST(request: NextRequest) {
  try {
    const { jsonData, hash } = await request.json();

    if (!jsonData) {
      return new Response(JSON.stringify({ error: 'JSON data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY environment variable is not set');
      return new Response(JSON.stringify({ error: 'AI service is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Create enhanced prompt for detailed Donald Trump style summarization with Indian context
    const prompt = `You are Donald Trump analyzing this group's financial settlement data. Make it **EXTREMELY DETAILED**, **engaging**, and **specific** using ALL the rich data provided. This should be a COMPREHENSIVE analysis, not a brief summary.

IMPORTANT INSTRUCTIONS:
- Use ONLY Indian Rupees (₹) for all currency amounts - NEVER use $ or dollars
- Do NOT mention America, USA, or any American references
- Focus on the settlement situation between friends/group members
- Use Donald Trump's speaking style: bold, direct, confident, with occasional hyperbole and strong opinions
- BE COMPREHENSIVE - aim for a detailed, thorough analysis (at least 15-20 sections with subsections)
- Use **double asterisks** for emphasis (e.g., **tremendous**, **big winner**)
- DIG DEEP into the data - mention specific expense descriptions, itemized details, dates, categories, and patterns

FORMATTING GUIDELINES (FOLLOW EXACTLY):
- Use ## for main section headers (e.g., ## THE BIG PICTURE)
- Use ### for subsection headers (e.g., ### Individual Breakdown)
- Use #### for minor subheadings (e.g., #### Payment Details)
- Use - for bullet points when listing items
- Use 1. 2. 3. for numbered lists when showing steps or sequences
- Use indented sub-bullets with 2 spaces for nested items:
  - Main point
    - Sub-point (2 spaces before -)
    - Another sub-point
      - Even deeper nesting (4 spaces before -)
- Use **bold** for emphasis on key amounts, names, and important points (e.g., **₹5,000**, **Gagan**, **tremendous**)
- Add blank lines between sections for better readability
- Structure your response with clear sections and good spacing
- Make it scannable with headers, lists, and sub-lists
- Use consistent formatting throughout

COMPREHENSIVE SECTIONS TO INCLUDE (be VERY detailed in each):

## 1. THE BIG PICTURE
- Total money spent across ALL expenses
- Number of people involved
- Number of total expenses recorded
- Date range of expenses (if available)
- Average expense amount
- Total number of transactions needed (both simplified and pairwise)

## 2. FINANCIAL STANDINGS - THE WINNERS & LOSERS
### Who's Getting Paid (Creditors)
- List EVERY person who is owed money with exact amounts
- Break down what they paid vs what they owe
- Calculate their net position
- Mention their settlement status

### Who Owes Money (Debtors)
- List EVERY person who owes money with exact amounts
- Break down what they paid vs what they owe
- Show how much they've already settled (if any)
- Calculate remaining balance

### The Balanced Ones
- Anyone who's perfectly square or close to it

## 3. EXPENSE BREAKDOWN BY CATEGORY
- Go through EACH category (Food, Transport, Entertainment, etc.)
- Total spent in each category
- Number of expenses in each category
- Biggest expense in each category with description
- Who paid the most in each category

## 4. TOP EXPENSES - THE BIG SPENDERS
- List the top 5-10 biggest expenses with:
  - Exact amount
  - Description
  - Category
  - Who paid
  - How it was split
  - Any itemized details (if available)

## 5. ITEMIZED EXPENSE DEEP DIVE
- If expenses have itemized details (items array), mention specific items:
  - Food items ordered
  - Drinks purchased
  - Specific products bought
  - Quantities and individual prices
- Make it interesting and specific!

## 6. PAYMENT PATTERNS & BEHAVIORS
- Who's the most generous payer (paid the most overall)?
- Who's the most frequent payer (paid for most expenses)?
- Any celebration contributions (special occasions)?
- Split method preferences (equal, percentage, itemized, etc.)

## 7. SETTLEMENT PAYMENTS ALREADY MADE
- List any payments that have already been settled
- Who paid whom and how much
- When they were settled
- Remaining balances after settlements

## 8. THE SETTLEMENT STRATEGY - SIMPLIFIED
- Explain the simplified settlement approach
- List ALL simplified transactions needed:
  - Who pays whom
  - Exact amounts
  - Why this is efficient
- Total number of transactions needed

## 9. THE SETTLEMENT STRATEGY - DETAILED (PAIRWISE)
- Explain the pairwise approach
- Show how it differs from simplified
- List key pairwise transactions
- Explain when this might be preferred

## 10. PERSON-BY-PERSON ANALYSIS
Go through EACH person and provide:
- Total amount they paid
- Total amount they owe (their share)
- Net balance (positive = owed to them, negative = they owe)
- Number of expenses they paid for
- Number of expenses they participated in
- Their biggest expense paid
- Any settlements they've made
- Their role in the group (biggest payer, biggest debtor, balanced, etc.)

## 11. INTERESTING PATTERNS & INSIGHTS
- Any unusual spending patterns
- Most expensive day/period
- Most common expense type
- Group dynamics (who pays for group expenses vs individual)
- Any celebration or special occasion expenses

## 12. THE BOTTOM LINE
- Final summary of who needs to pay whom
- Total amount in circulation
- Settlement efficiency (simplified vs pairwise)
- Overall group financial health

TRUMP-STYLE PHRASES TO USE THROUGHOUT:
- "Believe me, nobody analyzes group expenses like I do"
- "**Tremendous**", "**Fantastic**", "**Bigly**", "**Smart guy/girl**"
- "This is **big league** stuff"
- "**Absolute winner**" / "**Total disaster**"
- "Let me tell you" / "And let me tell you something"
- "**Premium stuff**" / "**High-class**"
- "**Efficient**" / "**Smart business**"
- "**Incredible**" / "**Unbelievable**"
- "Nobody does it better"
- "**Winning**" / "**Losing bigly**"

CURRENCY FORMAT: Always use ₹ symbol (Indian Rupees), never $ or USD
FORMATTING: Use **text** for bold emphasis, not *text*

CRITICAL: This should be a COMPREHENSIVE, DETAILED analysis. Don't just skim the surface - dive deep into every aspect of the data. Mention specific expense descriptions, itemized details, exact amounts, and create a rich narrative. Aim for thoroughness and detail!

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Now provide an EXTREMELY DETAILED and COMPREHENSIVE analysis in Donald Trump's voice. Use ALL the data available - expenses, people, categories, itemized details, settlements, transactions, and balances. Make it engaging, specific, and thorough!`;

    // Create a streaming response
    const result = await model.generateContentStream(prompt);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, hash })}\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('Streaming error:', error);
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
    return new Response(JSON.stringify({ error: error.message || 'Failed to summarize' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

