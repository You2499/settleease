import { describe, expect, it } from "vitest";
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_MODEL_CODE,
  buildAiModelAttemptOrder,
  getAiModelOption,
  resolveAiModelConfig,
} from "../aiModels";

describe("AI model registry", () => {
  it("defaults to Gemini 3.1 Flash-Lite Preview", () => {
    const config = resolveAiModelConfig(null);

    expect(config.modelCode).toBe(DEFAULT_AI_MODEL_CODE);
    expect(getAiModelOption(config.modelCode).displayName).toBe("Gemini 3.1 Flash-Lite Preview");
  });

  it("falls back safely when saved model values are invalid", () => {
    const config = resolveAiModelConfig({
      modelCode: "not-a-model" as any,
      fallbackModelCodes: ["gemini-3-flash-preview", "not-a-model"] as any,
    });

    expect(config.modelCode).toBe(DEFAULT_AI_MODEL_CODE);
    expect(config.fallbackModelCodes).toEqual(["gemini-3-flash-preview"]);
  });

  it("exposes display names and pricing labels for every configured model", () => {
    expect(AI_MODEL_OPTIONS.length).toBeGreaterThanOrEqual(3);
    AI_MODEL_OPTIONS.forEach((model) => {
      expect(model.displayName).toBeTruthy();
      expect(model.code).toContain("gemini-");
      expect(model.freeTierLabel).toContain("Free tier");
      expect(model.paidPricingLabel).toContain("Paid");
    });
  });

  it("builds a unique model attempt order", () => {
    const order = buildAiModelAttemptOrder({
      modelCode: "gemini-3-flash-preview",
      fallbackModelCodes: ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview"],
    });

    expect(order).toEqual(["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"]);
  });
});
