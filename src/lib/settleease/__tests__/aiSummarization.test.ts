import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCTION_SUMMARY_PROMPT,
  SUMMARY_PROMPT_PLACEHOLDER,
  STRUCTURED_SUMMARY_RESPONSE_SCHEMA,
  STRUCTURED_SUMMARY_SECTION_ORDER,
  SETTLEMENT_SUMMARY_PROMPT_NAME,
  buildSummarizeRequestPayload,
  injectSummaryJsonIntoPrompt,
  parseStructuredSummaryText,
  structuredSummaryToMarkdown,
} from "../aiSummarization";

describe("injectSummaryJsonIntoPrompt", () => {
  it("replaces all placeholder instances", () => {
    const template = `A\n${SUMMARY_PROMPT_PLACEHOLDER}\nB\n${SUMMARY_PROMPT_PLACEHOLDER}`;
    const prompt = injectSummaryJsonIntoPrompt(template, { hello: "world" });

    expect(prompt).toContain('"hello": "world"');
    expect(prompt).not.toContain(SUMMARY_PROMPT_PLACEHOLDER);
  });

  it("throws clear error when placeholder is missing", () => {
    expect(() => injectSummaryJsonIntoPrompt("No placeholders here", { x: 1 })).toThrow(
      "AI prompt is missing {{JSON_DATA}}"
    );
  });
});

describe("buildSummarizeRequestPayload", () => {
  it("includes promptVersion and modelCode for API propagation", () => {
    const payload = buildSummarizeRequestPayload({ a: 1 }, "hash-123", 7, "gemini-3.1-flash-lite-preview");
    expect(payload).toEqual({
      jsonData: { a: 1 },
      hash: "hash-123",
      promptVersion: 7,
      modelCode: "gemini-3.1-flash-lite-preview",
    });
  });

  it("keeps payload valid when optional fields are undefined", () => {
    const payload = buildSummarizeRequestPayload({ a: 1 }, "hash-123");
    expect(payload).toEqual({
      jsonData: { a: 1 },
      hash: "hash-123",
      promptVersion: undefined,
      modelCode: undefined,
    });
  });
});

describe("structured summary contract", () => {
  it("uses a neutral prompt key and requires the JSON placeholder", () => {
    expect(SETTLEMENT_SUMMARY_PROMPT_NAME).toBe("settlement-summary");
    expect(DEFAULT_PRODUCTION_SUMMARY_PROMPT).toContain(SUMMARY_PROMPT_PLACEHOLDER);
    expect(DEFAULT_PRODUCTION_SUMMARY_PROMPT).toContain("Never expose internal IDs");
    expect(DEFAULT_PRODUCTION_SUMMARY_PROMPT).toContain("Return ONLY a JSON object");
  });

  it("requires every renderable section in order", () => {
    expect(STRUCTURED_SUMMARY_RESPONSE_SCHEMA.required).toEqual([
      "schemaVersion",
      ...STRUCTURED_SUMMARY_SECTION_ORDER,
    ]);
  });

  it("builds clean markdown in the required heading order", () => {
    const summary = parseStructuredSummaryText(JSON.stringify({
      schemaVersion: 1,
      settlementSnapshot: ["Snapshot."],
      keyNumbers: ["Included spend: 6109."],
      whoShouldReceiveMoney: ["Amit: 3679.5."],
      whoShouldPay: ["Aditya: 1969.75.", "Sourav: 1709.75."],
      recommendedSettlementActions: ["Aditya -> Amit: 1969.75.", "Sourav -> Amit: 1709.75."],
      spendingDrivers: ["Alcohol: 3945 (64.58%)."],
      manualOverridesAndExceptions: ["No manual overrides active."],
      dataQuality: ["No material data-quality issues detected."],
      nextBestActions: ["Verify receipts.", "Close outstanding payments."],
    }));

    expect(summary).not.toBeNull();
    const markdown = structuredSummaryToMarkdown(summary!);

    expect(markdown.indexOf("# Settlement Snapshot")).toBeLessThan(markdown.indexOf("# Key Numbers"));
    expect(markdown.indexOf("# Key Numbers")).toBeLessThan(markdown.indexOf("# Who Should Receive Money"));
    expect(markdown).toContain("- Aditya -> Amit: 1969.75.");
  });
});
