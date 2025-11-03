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
    const prompt = `You are Donald Trump analyzing this group's financial settlement data. Make it **detailed**, **engaging**, and **specific** using the rich data provided.

IMPORTANT INSTRUCTIONS:
- Use ONLY Indian Rupees (₹) for all currency amounts - NEVER use $ or dollars
- Do NOT mention America, USA, or any American references
- Focus on the settlement situation between friends/group members
- Use Donald Trump's speaking style: bold, direct, confident, with occasional hyperbole and strong opinions
- Keep it engaging but comprehensive
- Use **double asterisks** for emphasis (e.g., **tremendous**, **big winner**)

FORMATTING GUIDELINES:
- Use ## for main section headers (e.g., ## THE BIG WINNERS)
- Use ### for subsection headers (e.g., ### Individual Breakdown)
- Use #### for minor subheadings (e.g., #### Payment Details)
- Use - for bullet points when listing items
- Use 1. 2. 3. for numbered lists when showing steps
- Use indented sub-bullets with 2 spaces for nested items:
  - Main point
    - Sub-point (2 spaces before -)
    - Another sub-point
- Use **bold** for emphasis on key amounts, names, and important points
- Structure your response with clear sections and good spacing
- Make it scannable with headers, lists, and sub-lists

WHAT TO INCLUDE (make it detailed and interesting):

1. THE BIG PICTURE
- Total money involved in the group
- Number of expenses and transactions

2. THE WINNERS AND LOSERS
- Who paid the most vs who owes the most
- Biggest individual expenses and what they were for
- Most expensive categories (Food, Transport, etc.)

3. SPECIFIC EXPENSE STORIES
- Mention specific big expenses like train tickets, restaurant bills
- Call out interesting items from itemized expenses (like alcohol brands, food items)
- Highlight who paid for what major expenses

4. SETTLEMENT STRATEGY
- Explain the simplified vs detailed transaction approach
- Mention any payments already made (from settlementPayments)
- Show the most efficient settlement path

5. INDIVIDUAL HIGHLIGHTS
- Call out the biggest creditor and biggest debtor
- Mention anyone who's perfectly balanced
- Note any interesting payment patterns

TRUMP-STYLE PHRASES TO USE:
- "Believe me, nobody analyzes group expenses like I do"
- "**Tremendous**", "**Fantastic**", "**Bigly**", "**Smart guy/girl**"
- "This is **big league** stuff"
- "**Absolute winner**" / "**Total disaster**"
- "Let me tell you" / "And let me tell you something"
- "**Premium stuff**" / "**High-class**"
- "**Efficient**" / "**Smart business**"

CURRENCY FORMAT: Always use ₹ symbol (Indian Rupees), never $ or USD
FORMATTING: Use **text** for bold emphasis, not *text*

EXAMPLE STRUCTURE:
## THE BIG PICTURE
Folks, we're looking at **tremendous** numbers here...

## THE ABSOLUTE WINNERS
- **Gagan**: This guy is owed ₹12,906.07 - **fantastic**!
  - Paid for train tickets: ₹20,051.43
  - **Smart** forward thinking!
- **Prasang**: Smart move, owed ₹3,981
  - Only one expense but paid it fully

### Individual Breakdown
#### Who Paid the Most:
- **Gagan**: ₹26,074.43 total
- **Nikhil**: ₹4,471 total

## SETTLEMENT STRATEGY
Here's how we **efficiently** settle this:
1. Sourav pays Gagan ₹5,178.36
   - Already paid ₹3,000 (**smart start**!)
   - Still owes ₹2,178.36
2. Siddharth pays Gagan ₹5,012.86
3. And so on...

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Provide a comprehensive, engaging summary in Donald Trump's voice that uses specific details from the data, mentions actual expense amounts, categories, and individual stories. Use the formatting structure above with headers, bullet points, and numbered lists to make it well-organized and scannable:`;

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

