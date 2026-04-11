import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import {
  DEFAULT_PRODUCTION_SUMMARY_PROMPT,
  SETTLEMENT_SUMMARY_PROMPT_NAME,
  STRUCTURED_SUMMARY_RESPONSE_SCHEMA,
  injectSummaryJsonIntoPrompt,
  normalizeStructuredSummary,
  parseStructuredSummaryText,
} from '@/lib/settleease/aiSummarization';
import { getConvexUrl } from '@/lib/settleease/convexUrl';
import { fetchActiveAiModelConfig } from '@/lib/settleease/aiModelConfigServer';
import { buildAiModelAttemptOrder, getAiModelOption } from '@/lib/settleease/aiModels';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CONVEX_URL = getConvexUrl();

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Summarize API called');
    console.log('🔍 Environment check:', {
      hasGeminiKey: !!GEMINI_API_KEY,
      hasConvexUrl: !!CONVEX_URL,
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

    console.log('✅ API key found, fetching prompt and model config from Convex...');

    const promptData = await fetchQuery(api.app.getActiveAiPrompt, {
      name: SETTLEMENT_SUMMARY_PROMPT_NAME,
    }, { url: CONVEX_URL });
    const aiConfig = await fetchActiveAiModelConfig();
    const modelAttemptOrder = buildAiModelAttemptOrder(aiConfig);

    const resolvedPromptVersion = promptData?.version || promptVersion || 0;
    console.log(`✅ Using prompt version ${resolvedPromptVersion}`);
    console.log(`✅ Model attempt order: ${modelAttemptOrder.join(', ')}`);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Replace placeholder with actual data and fail fast for invalid prompt templates.
    const prompt = injectSummaryJsonIntoPrompt(
      promptData?.prompt_text || DEFAULT_PRODUCTION_SUMMARY_PROMPT,
      jsonData,
    );

    // Try models in fallback order until one succeeds
    let summary = null;
    let successfulModel = null;
    const errors: string[] = [];

    for (const modelName of modelAttemptOrder) {
      try {
        console.log(`🔄 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 1800,
            responseMimeType: 'application/json',
            responseSchema: STRUCTURED_SUMMARY_RESPONSE_SCHEMA as any,
          },
        });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const parsedSummary = parseStructuredSummaryText(responseText);
        if (!parsedSummary) {
          throw new Error('Model returned invalid structured summary JSON');
        }

        summary = normalizeStructuredSummary(parsedSummary);
        successfulModel = modelName;
        console.log(`✅ Successfully using model: ${modelName}`);
        break;
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        console.warn(`⚠️ Model ${modelName} failed: ${errorMsg}`);
        errors.push(`${modelName}: ${errorMsg}`);

        // If this is the last model, throw the error
        if (modelName === modelAttemptOrder[modelAttemptOrder.length - 1]) {
          console.error('❌ All models failed');
          throw new Error(
            `All AI models are currently unavailable. Please try again later. Errors: ${errors.join('; ')}`
          );
        }
        // Otherwise, continue to next model
        continue;
      }
    }

    if (!summary || !successfulModel) {
      throw new Error('Failed to generate content with any available model');
    }

    return Response.json({
      summary,
      hash,
      model: successfulModel,
      modelDisplayName: getAiModelOption(successfulModel).displayName,
      promptVersion: resolvedPromptVersion,
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
    } else if (error.message?.includes('{{JSON_DATA}}')) {
      userMessage = 'AI prompt configuration error (missing JSON placeholder). Please contact administrator.';
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
