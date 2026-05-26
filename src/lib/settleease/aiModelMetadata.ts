export interface DynamicModelMetadata {
  code: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
}

export type ModelGroup = "stable" | "previews" | "snapshots" | "legacy";
export type SuitabilityGrade = "Excellent" | "Good" | "Caution" | "Unsuitable";

export interface ModelUIProps {
  code: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  formattedInputLimit: string;
  formattedOutputLimit: string;
  group: ModelGroup;
  groupLabel: string;
  suitability: SuitabilityGrade;
  suitabilityColor: string;
  statusLightColor: string;
  recommendedReason: string;
}

function formatTokens(count: number, suffix: "input" | "output"): string {
  if (count <= 0) return `Unknown ${suffix}`;
  if (count >= 1000000) {
    const val = (count / 1000000).toFixed(0);
    return `${val}M ${suffix}`;
  }
  if (count >= 1000) {
    const val = (count / 1000).toFixed(0);
    return `${val}k ${suffix}`;
  }
  return `${count} ${suffix}`;
}

export function analyzeModelHeuristically(
  model: Partial<DynamicModelMetadata> & { code: string; displayName?: string }
): ModelUIProps {
  const code = model.code.trim().toLowerCase();
  const displayName =
    model.displayName ||
    model.code
      .replace(/^models\//, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Heuristic fallbacks for context limits if API returns 0 or missing
  let inputTokenLimit = Number(model.inputTokenLimit) || 0;
  let outputTokenLimit = Number(model.outputTokenLimit) || 0;

  if (inputTokenLimit === 0) {
    if (code.includes("pro")) {
      inputTokenLimit = 2097152; // 2M
    } else if (code.includes("flash")) {
      inputTokenLimit = 1048576; // 1M
    } else {
      inputTokenLimit = 32768; // 32k legacy baseline
    }
  }

  if (outputTokenLimit === 0) {
    outputTokenLimit = 8192; // 8k output standard
  }

  // Heuristic description fallbacks
  let description = (model.description || "").trim();
  if (!description) {
    if (code.includes("2.0") && code.includes("flash") && !code.includes("lite")) {
      description = "Next generation fast, highly accurate, and stable model.";
    } else if (code.includes("1.5") && code.includes("flash")) {
      description = "Fast, highly stable, and low-cost model optimized for summaries and parsing.";
    } else if (code.includes("pro")) {
      description = "High-capability model for highly complex reasoning and multi-lingual parsing.";
    } else if (code.includes("lite")) {
      description = "Ultra-fast and highly efficient light model.";
    } else {
      description = `Dynamic Gemini model from Google API: ${model.code}`;
    }
  }

  // 1. Group Classification (Pure Dynamic Rules)
  let group: ModelGroup = "stable";
  let groupLabel = "Recommended & Stable";

  const isLegacyModel =
    code.includes("1.0") ||
    code.includes("gemini-3.1-flash-lite-preview") ||
    code.includes("gemini-3-flash-preview");

  const isSnapshotModel =
    code.match(/-\d{3}$/) || // e.g. -001, -002
    code.match(/\b\d{2}-\d{4}\b/) || // e.g. 10-2025
    code.includes("computer-use-preview");

  const isPreviewModel =
    code.includes("preview") ||
    code.includes("exp") ||
    code.includes("experimental") ||
    code.includes("test");

  if (isLegacyModel) {
    group = "legacy";
    groupLabel = "Outdated & Legacy";
  } else if (isSnapshotModel) {
    group = "snapshots";
    groupLabel = "Frozen Snapshots";
  } else if (isPreviewModel) {
    group = "previews";
    groupLabel = "Previews & Pre-Releases";
  } else {
    group = "stable";
    groupLabel = "Recommended & Stable";
  }

  // 2. Suitability Grading
  let suitability: SuitabilityGrade = "Excellent";
  let suitabilityColor =
    "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  let statusLightColor = "bg-emerald-500";
  let recommendedReason = "Ideal for fast, accurate text parsing and receipts.";

  const isSpecializedOnly =
    code.includes("computer-use") ||
    code.includes("tts") ||
    code.includes("embedding") ||
    code.includes("search") ||
    code.includes("custom") ||
    code.includes("vision-only");

  if (isSpecializedOnly) {
    suitability = "Unsuitable";
    suitabilityColor = "bg-rose-500/10 text-rose-500 border-rose-500/20";
    statusLightColor = "bg-rose-500";
    recommendedReason = "Specialized model not designed for general splitting and structured text.";
  } else if (group === "legacy") {
    suitability = "Unsuitable";
    suitabilityColor = "bg-rose-500/10 text-rose-500 border-rose-500/20";
    statusLightColor = "bg-rose-500";
    recommendedReason = "Deprecated or outdated generation. Shutdown is imminent.";
  } else if (group === "snapshots") {
    suitability = "Caution";
    suitabilityColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    statusLightColor = "bg-amber-500";
    recommendedReason = "Frozen snapshots do not receive updates and will eventually shut down.";
  } else if (group === "previews") {
    suitability = "Good";
    suitabilityColor = "bg-teal-500/10 text-teal-500 border-teal-500/20";
    statusLightColor = "bg-amber-500";
    recommendedReason = "Cutting-edge capabilities, but features could change unexpectedly.";
  } else {
    // Stable production models
    if (code.includes("lite")) {
      suitability = "Good";
      suitabilityColor = "bg-teal-500/10 text-teal-500 border-teal-500/20";
      statusLightColor = "bg-emerald-500";
      recommendedReason = "Great lightweight and highly responsive stable model.";
    } else {
      suitability = "Excellent";
      suitabilityColor =
        "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      statusLightColor = "bg-emerald-500";
      recommendedReason = "Production stable release. Excellent performance for SettleEase.";
    }
  }

  return {
    code: model.code,
    displayName,
    description,
    inputTokenLimit,
    outputTokenLimit,
    formattedInputLimit: formatTokens(inputTokenLimit, "input"),
    formattedOutputLimit: formatTokens(outputTokenLimit, "output"),
    group,
    groupLabel,
    suitability,
    suitabilityColor,
    statusLightColor,
    recommendedReason,
  };
}
