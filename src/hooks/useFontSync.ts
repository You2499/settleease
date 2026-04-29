"use client";

import { useEffect } from "react";

import type { FontPreference } from "@/lib/settleease";

const FONT_CLASSES: FontPreference[] = [
  "geist",
  "system",
  "inter",
  "google-sans",
];

export function applyFontPreference(fontPreference?: FontPreference | null) {
  if (typeof document === "undefined") return;

  const resolvedFont = fontPreference || "inter";
  const root = document.documentElement;
  root.classList.remove(...FONT_CLASSES.map((font) => `font-${font}`));
  root.classList.add(`font-${resolvedFont}`);
}

export function useFontSync(fontPreference?: FontPreference | null) {
  useEffect(() => {
    applyFontPreference(fontPreference);
  }, [fontPreference]);
}
