import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import {
  AI_CONFIG_KEY,
  buildAiModelAttemptOrder,
  resolveAiModelConfig,
  type AiModelConfig,
  type AiModelCode,
} from "./aiModels";
import { getConvexUrl } from "./convexUrl";

export async function fetchActiveAiModelConfig(): Promise<AiModelConfig> {
  try {
    const config = await fetchQuery(
      api.app.getActiveAiConfig,
      { key: AI_CONFIG_KEY },
      { url: getConvexUrl() },
    );

    return resolveAiModelConfig(config);
  } catch (error) {
    console.warn("Falling back to default AI model config:", error);
    return resolveAiModelConfig(null);
  }
}

export async function fetchAiModelAttemptOrder(): Promise<AiModelCode[]> {
  return buildAiModelAttemptOrder(await fetchActiveAiModelConfig());
}
