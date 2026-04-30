"use client";

import { useEffect, useState } from "react";

import { getShortcutModifierLabel, isMacPlatform } from "@/lib/settleease/shortcuts";

export function useShortcutModifier() {
  const [isHoldingModifier, setIsHoldingModifier] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const nextIsMac = isMacPlatform();
    setIsMac(nextIsMac);

    const updateFromEvent = (event: KeyboardEvent) => {
      setIsHoldingModifier(nextIsMac ? event.metaKey : event.ctrlKey);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      updateFromEvent(event);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        (nextIsMac && event.key === "Meta") ||
        (!nextIsMac && event.key === "Control") ||
        !(nextIsMac ? event.metaKey : event.ctrlKey)
      ) {
        setIsHoldingModifier(false);
      }
    };

    const clearModifier = () => setIsHoldingModifier(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearModifier);
    window.addEventListener("visibilitychange", clearModifier);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearModifier);
      window.removeEventListener("visibilitychange", clearModifier);
    };
  }, []);

  return {
    isHoldingModifier,
    modifierLabel: getShortcutModifierLabel(isMac),
    isMac,
  };
}
