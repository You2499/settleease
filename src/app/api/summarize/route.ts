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
  EMPTY_SETTLEMENT_SUMMARY,
  isSummaryPayloadEmpty,
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

    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('❌ Failed to parse request JSON:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid or empty JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { jsonData, hash, promptVersion } = body;

    // Check for empty inputs or empty lists to avoid crash/hallucination/unnecessary API call.
    if (isSummaryPayloadEmpty(jsonData)) {
      console.log('ℹ️ Empty JSON data, returning empty settlement summary');
      return Response.json({
        summary: EMPTY_SETTLEMENT_SUMMARY,
        hash,
        model: 'static-fallback',
        modelDisplayName: 'Static Fallback',
        promptVersion: promptVersion || 0,
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

    for (let i = 0; i < modelAttemptOrder.length; i++) {
      const modelName = modelAttemptOrder[i];
      try {
        console.log(`🔄 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 8192,
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

        // Fail fast on API key or authentication errors (no point in trying other models)
        const isApiKeyError =
          error.status === 403 ||
          error.message?.includes('API key') ||
          error.message?.includes('API_KEY_INVALID') ||
          error.message?.includes('invalid key');

        if (isApiKeyError) {
          console.error(`❌ Global API key error encountered on ${modelName}, failing fast`);
          throw error;
        }

        // If this is the last model, throw the error
        if (i === modelAttemptOrder.length - 1) {
          console.error('❌ All models failed');
          throw new Error(
            `All AI models are currently unavailable. Errors: ${errors.join('; ')}`
          );
        }
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
    let statusCode = 500;

    if (error.message?.includes('overloaded') || error.message?.includes('503')) {
      userMessage = 'AI service is currently busy. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      userMessage = 'API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error.message?.includes('API key') || error.status === 403) {
      userMessage = 'AI service configuration error. Please contact administrator.';
      statusCode = 403;
    } else if (error.message?.includes('All AI models')) {
      // Security fix: Do NOT expose internal API error details to client in production
      userMessage = 'All AI models are currently unavailable. Please try again later.';
    } else if (error.message?.includes('{{JSON_DATA}}')) {
      userMessage = 'AI prompt configuration error (missing JSON placeholder). Please contact administrator.';
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
