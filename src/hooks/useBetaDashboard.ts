"use client";

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'settleease_beta_design';
const CLASS_NAME = 'beta-design';

/**
 * Hook to manage the beta design preference.
 * Beta design is now the default and permanent design.
 * This hook is kept for backward compatibility but always returns true.
 */
export function useBetaDashboard() {
  const [isBeta] = useState(true); // Always true - beta design is now permanent

  // On mount: ensure class is applied
  useEffect(() => {
    document.documentElement.classList.add(CLASS_NAME);
  }, []);

  const toggleBeta = useCallback(() => {
    // No-op: beta design is permanent
  }, []);

  const setBeta = useCallback(() => {
    // No-op: beta design is permanent
  }, []);

  return { isBeta, toggleBeta, setBeta };
}
