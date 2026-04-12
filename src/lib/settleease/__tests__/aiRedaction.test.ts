import { describe, expect, it } from "vitest";
import {
  buildRedactionCachePayload,
  buildRedactionPrompt,
  normalizeRedactionResponse,
  parseRedactionResponseText,
  REDACTION_PROMPT_VERSION,
} from "../aiRedaction";
import { computeJsonHash } from "../hashUtils";

describe("AI report redaction helpers", () => {
  it("builds a prompt with provided labels and no JSON placeholder left behind", () => {
    const prompt = buildRedactionPrompt([
      {
        key: "expense-0",
        description: "Beer and wine",
        category: "Alcohol",
        items: [{ key: "item-0", name: "Craft beer", category: "Alcohol" }],
      },
    ]);

    expect(prompt).toContain("Beer and wine");
    expect(prompt).toContain("Craft beer");
    expect(prompt).not.toContain("{{JSON_DATA}}");
  });

  it("normalizes redaction responses into stable arrays", () => {
    const normalized = normalizeRedactionResponse({
      entries: [
        {
          key: "expense-0",
          description: "Private shared expense",
          category: "General",
          items: [{ key: "item-0", name: "Private item", category: "General" }],
        },
      ],
    });

    expect(normalized.schemaVersion).toBe(1);
    expect(normalized.entries[0].description).toBe("Private shared expense");
    expect(normalized.entries[0].items[0].name).toBe("Private item");
  });

  it("parses JSON even if a model wraps it in extra text", () => {
    const parsed = parseRedactionResponseText(`
      Result:
      {"schemaVersion":1,"entries":[{"key":"expense-0","description":"Dinner","category":"Food","items":[]}]}
    `);

    expect(parsed?.entries[0].description).toBe("Dinner");
  });

  it("builds cache payloads that include prompt version and selected model", async () => {
    const entries = [
      {
        key: "expense-0",
        description: "Beer and wine",
        category: "Alcohol",
        items: [{ key: "item-0", name: "Craft beer", category: "Alcohol" }],
      },
    ];
    const basePayload = buildRedactionCachePayload({
      entries,
      modelCode: "gemini-3.1-flash-lite-preview",
      context: { reportMode: "group" },
    });
    const otherModelPayload = buildRedactionCachePayload({
      entries,
      modelCode: "gemini-3-flash-preview",
      context: { reportMode: "group" },
    });

    expect(basePayload.promptVersion).toBe(REDACTION_PROMPT_VERSION);
    expect(basePayload.modelCode).toBe("gemini-3.1-flash-lite-preview");
    const baseHash = await computeJsonHash(basePayload);
    const otherModelHash = await computeJsonHash(otherModelPayload);
    expect(baseHash).not.toBe(otherModelHash);
  });
});
