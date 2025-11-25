import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    console.log('🔍 Environment check:', {
      hasGeminiKey: !!GEMINI_API_KEY,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_KEY,
    });
    const { jsonData, hash, promptVersion } = await request.json();

    if (!jsonData) {
      console.error('❌ No JSON data provided');
      return new Response(JSON.stringify({ error: 'JSON data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ JSON data received, hash:', hash, 'promptVersion:', promptVersion);

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

    console.log('✅ API key found, fetching prompt from database...');

    // Fetch active prompt from database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: promptData, error: promptError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('name', 'trump-summarizer')
      .eq('is_active', true)
      .single();

    if (promptError || !promptData) {
      console.error('❌ Error fetching prompt:', promptError);
      return new Response(
        JSON.stringify({ error: 'AI prompt not configured. Please contact administrator.' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Using prompt version ${promptData.version}`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Replace {{JSON_DATA}} placeholder with actual data
    const prompt = promptData.prompt_text.replace('{{JSON_DATA}}', JSON.stringify(jsonData, null, 2));

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

