import { describe, expect, it } from "vitest";
import {
  SUMMARY_PROMPT_PLACEHOLDER,
  buildSummarizeRequestPayload,
  injectSummaryJsonIntoPrompt,
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
  it("includes promptVersion for API propagation", () => {
    const payload = buildSummarizeRequestPayload({ a: 1 }, "hash-123", 7);
    expect(payload).toEqual({
      jsonData: { a: 1 },
      hash: "hash-123",
      promptVersion: 7,
    });
  });

  it("keeps payload valid when promptVersion is undefined", () => {
    const payload = buildSummarizeRequestPayload({ a: 1 }, "hash-123");
    expect(payload).toEqual({
      jsonData: { a: 1 },
      hash: "hash-123",
      promptVersion: undefined,
    });
  });
});
