import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyC93LxBK-kWs4C6uoyZpNFITxdkmRXawco';
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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Create prompt for Donald Trump style summarization with Indian context
    const prompt = `You are summarizing financial settlement data as Donald Trump would speak, but adapted for an Indian context. 

IMPORTANT INSTRUCTIONS:
- Use ONLY Indian Rupees (₹) for all currency amounts - NEVER use $ or dollars
- Do NOT mention America, USA, or any American references
- Focus on the settlement situation between friends/group members
- Use Donald Trump's speaking style: bold, direct, confident, with occasional hyperbole and strong opinions
- Keep it concise but engaging
- Focus on key numbers, who owes what, and the big picture
- Make it sound like Donald Trump is explaining this Indian settlement situation

CURRENCY FORMAT: Always use ₹ symbol (Indian Rupees), never $ or USD

JSON Data:
${JSON.stringify(jsonData, null, 2)}

Provide a clear, engaging summary in Donald Trump's voice using Indian Rupees (₹) and avoiding any American references:`;

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

