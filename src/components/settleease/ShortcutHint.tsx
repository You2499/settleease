"use client";

import React from "react";

import { useShortcutModifier } from "@/hooks/useShortcutModifier";
import { cn } from "@/lib/utils";
import {
  formatShortcut,
  getShortcutById,
  type ShortcutId,
} from "@/lib/settleease/shortcuts";

interface ShortcutHintProps {
  shortcutId: ShortcutId;
  className?: string;
  alwaysVisible?: boolean;
}

export default function ShortcutHint({
  shortcutId,
  className,
  alwaysVisible = false,
}: ShortcutHintProps) {
  const shortcut = getShortcutById(shortcutId);
  const { isHoldingModifier, isMac } = useShortcutModifier();

  if (!shortcut) return null;

  const keys = formatShortcut(shortcut, isMac);
  const shouldShow = alwaysVisible || isHoldingModifier;

  return (
    <span
      data-shortcut-hint=""
      aria-hidden={!shouldShow}
      className={cn(
        "hidden shrink-0 items-center gap-0.5 rounded-md border border-border/70 bg-background/95 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground shadow-sm transition-opacity duration-150 md:inline-flex !overflow-visible whitespace-nowrap",
        shouldShow ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {keys.map((key, index) => (
        <React.Fragment key={`${key}-${index}`}>
          {index > 0 ? <span className="text-muted-foreground/60">+</span> : null}
          <kbd className="font-[inherit]">{key}</kbd>
        </React.Fragment>
      ))}
    </span>
  );
}
