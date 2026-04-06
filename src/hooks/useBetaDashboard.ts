"use client";

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'settleease_beta_design';
const CLASS_NAME = 'beta-design';

/**
 * Hook to manage the beta design preference.
 * - Reads/writes to localStorage
 * - Toggles 'beta-design' class on <html>
 * - Syncs across tabs via 'storage' event
 */
export function useBetaDashboard() {
  const [isBeta, setIsBeta] = useState(false);

  // On mount: read from localStorage and apply class
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const shouldBeBeta = stored === 'true';
      setIsBeta(shouldBeBeta);

      if (shouldBeBeta) {
        document.documentElement.classList.add(CLASS_NAME);
      } else {
        document.documentElement.classList.remove(CLASS_NAME);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const newValue = e.newValue === 'true';
        setIsBeta(newValue);
        if (newValue) {
          document.documentElement.classList.add(CLASS_NAME);
        } else {
          document.documentElement.classList.remove(CLASS_NAME);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleBeta = useCallback(() => {
    setIsBeta(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage not available
      }
      if (next) {
        document.documentElement.classList.add(CLASS_NAME);
      } else {
        document.documentElement.classList.remove(CLASS_NAME);
      }
      return next;
    });
  }, []);

  const setBeta = useCallback((value: boolean) => {
    setIsBeta(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // localStorage not available
    }
    if (value) {
      document.documentElement.classList.add(CLASS_NAME);
    } else {
      document.documentElement.classList.remove(CLASS_NAME);
    }
  }, []);

  return { isBeta, toggleBeta, setBeta };
}
