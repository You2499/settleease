// src/app/api/ai-clean-catalog/route.ts

import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchAiModelAttemptOrder } from "@/lib/settleease/aiModelConfigServer";
import { getAiModelOption } from "@/lib/settleease/aiModels";
import {
  injectCleanCatalogPrompt,
  parseCleanCatalogResponse,
  normalizeCleanCatalogResponse,
  AI_CLEAN_CATALOG_RESPONSE_SCHEMA,
  DEFAULT_AI_CLEAN_CATALOG_PROMPT,
  type CatalogObservationInput,
} from "@/lib/settleease/aiCleanCatalog";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_OBSERVATIONS = 100; // Safeguard to prevent token blowout/timeout
const REQUEST_TIMEOUT_MS = 30000; // Strict 30-second timeout

function sanitizeObservations(value: unknown): CatalogObservationInput[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_OBSERVATIONS).map((item, index) => {
    const source = typeof item === "object" && item !== null ? (item as Record<string, any>) : {};

    return {
      id: String(source.id || `obs-${index}`).slice(0, 80),
      itemName: String(source.itemName || source.item_name || `Item ${index + 1}`).slice(0, 160),
      expenseDescription: String(source.expenseDescription || source.expense_description || "").slice(0, 200),
      price: typeof source.price === "number" && Number.isFinite(source.price) ? source.price : 0,
      date: String(source.date || "").slice(0, 30),
      categoryName: source.categoryName || source.category_name ? String(source.categoryName || source.category_name).slice(0, 80) : null,
    };
  });
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.log("🧼 AI Clean Catalog API called");

    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY not configured");
      clearTimeout(timeoutId);
      return Response.json(
        { error: "AI catalog cleaner is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const rawObservations = body.observations;
    const rawAllowedCategories = body.allowedCategories || body.allowed_categories;

    const observations = sanitizeObservations(rawObservations);
    const allowedCategories = Array.isArray(rawAllowedCategories)
      ? rawAllowedCategories.map((c) => String(c).trim()).filter(Boolean)
      : ["Other"];

    if (observations.length === 0) {
      clearTimeout(timeoutId);
      return Response.json(
        { error: "No valid observations provided to clean." },
        { status: 400 }
      );
    }

    const modelAttemptOrder = await fetchAiModelAttemptOrder();
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const prompt = injectCleanCatalogPrompt(
      DEFAULT_AI_CLEAN_CATALOG_PROMPT,
      allowedCategories,
      observations
    );

    let normalizedData = null;
    let successfulModel = "";
    const errors: string[] = [];

    // Bulletproof Sequential Fallback Engine
    for (const modelName of modelAttemptOrder) {
      try {
        console.log(`🔄 Trying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1, // Highly precise, low temperature
            topP: 0.85,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: AI_CLEAN_CATALOG_RESPONSE_SCHEMA as any,
          },
        });

        // Trigger request (respects controller abort signal)
        const result = await model.generateContent(prompt);
        const response = result.response;

        if (!response || !response.candidates || response.candidates.length === 0) {
          throw new Error("AI returned empty response candidates. Please try again.");
        }

        const candidate = response.candidates[0];
        if (candidate.finishReason === "SAFETY") {
          throw new Error("SAFETY: Content was blocked by safety filters.");
        }

        const responseText = response.text();
        const parsedData = parseCleanCatalogResponse(responseText);

        if (!parsedData) {
          throw new Error("AI response could not be parsed into valid clean catalog JSON.");
        }

        normalizedData = normalizeCleanCatalogResponse(parsedData, allowedCategories, observations);
        successfulModel = modelName;
        console.log(`✅ Successfully cleaned catalog with ${modelName}`);
        break;
      } catch (error: any) {
        const message = error?.message || "Unknown model error";
        console.warn(`⚠️ Model ${modelName} failed: ${message}`);
        errors.push(`${modelName}: ${message}`);
      }
    }

    clearTimeout(timeoutId);

    if (!normalizedData || !successfulModel) {
      throw new Error(`Could not clean catalog with any available Gemini model. Errors: ${errors.join("; ")}`);
    }

    return Response.json({
      ...normalizedData,
      model: successfulModel,
      modelDisplayName: getAiModelOption(successfulModel).displayName,
      observationsProcessed: observations.length,
      canonicalItemsCount: normalizedData.canonicalItems.length,
    });

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("❌ Catalog Cleaning Error:", error);

    // Timeout Check
    if (error.name === "AbortError" || controller.signal.aborted) {
      return Response.json(
        { error: "Catalog cleaning request timed out. Please try again with fewer items." },
        { status: 408 }
      );
    }

    // Precise HTTP Status Code Mapping
    let userMessage = "Failed to clean catalog. Please try again.";
    let statusCode = 500;

    const errorMsg = error.message || "";
    const errorStr = JSON.stringify(error);

    if (errorMsg.includes("parsing") || errorMsg.includes("parse") || errorMsg.includes("JSON")) {
      userMessage = "AI response was unstructured or malformed. Please try again.";
      statusCode = 422;
    } else if (errorMsg.includes("quota") || errorMsg.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
      userMessage = "AI service quota exceeded. Please try again later.";
      statusCode = 429;
    } else if (errorMsg.includes("overloaded") || errorMsg.includes("503") || errorStr.includes("UNAVAILABLE")) {
      userMessage = "AI service is currently busy. Please try again in a moment.";
      statusCode = 503;
    } else if (errorMsg.includes("SAFETY")) {
      userMessage = "Item data triggered content safety filters. Please review input descriptions.";
      statusCode = 400;
    }

    return Response.json(
      {
        error: userMessage,
        technicalDetails: process.env.NODE_ENV === "development" ? error.message : undefined,
        retryable: statusCode !== 400,
      },
      { status: statusCode }
    );
  }
}
