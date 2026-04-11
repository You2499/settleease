"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from "@/hooks/use-toast";

export function useThemeSync(
  userId: string | undefined,
  userProfile: any
) {
  const { theme, setTheme } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isUpdatingFromRemote = useRef(false);
  const lastSyncedTheme = useRef<string | null>(null);
  const pendingLocalTheme = useRef<string | null>(null);
  const pendingLocalThemeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateUserProfile = useMutation(api.app.updateUserProfile);

  const clearPendingLocalTheme = useCallback(() => {
    if (pendingLocalThemeTimeout.current) {
      clearTimeout(pendingLocalThemeTimeout.current);
      pendingLocalThemeTimeout.current = null;
    }
    pendingLocalTheme.current = null;
  }, []);

  const markPendingLocalTheme = useCallback((newTheme: string) => {
    pendingLocalTheme.current = newTheme;

    if (pendingLocalThemeTimeout.current) {
      clearTimeout(pendingLocalThemeTimeout.current);
    }

    pendingLocalThemeTimeout.current = setTimeout(() => {
      pendingLocalTheme.current = null;
      pendingLocalThemeTimeout.current = null;
    }, 10000);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => clearPendingLocalTheme();
  }, [clearPendingLocalTheme]);

  useEffect(() => {
    if (!userId) {
      setIsInitialized(false);
      lastSyncedTheme.current = null;
      isUpdatingFromRemote.current = false;
      clearPendingLocalTheme();
    }
  }, [clearPendingLocalTheme, userId]);

  const updateThemeInDatabase = useCallback(async (newTheme: string) => {
    if (!userId) return;

    try {
      await updateUserProfile({
        supabaseUserId: userId,
        themePreference: newTheme,
      });
    } catch (error: any) {
      console.error('Error updating theme in Convex:', error);
      toast({
        title: "Theme Sync Error",
        description: "Failed to save theme preference",
        variant: "destructive",
      });
    }
  }, [updateUserProfile, userId]);

  useEffect(() => {
    if (!isMounted || !userId || !userProfile || isInitialized) return;

    const dbTheme = userProfile.theme_preference;

    if (dbTheme) {
      isUpdatingFromRemote.current = true;
      lastSyncedTheme.current = dbTheme;
      clearPendingLocalTheme();
      setTheme(dbTheme);
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 200);
    } else {
      isUpdatingFromRemote.current = true;
      lastSyncedTheme.current = 'light';
      markPendingLocalTheme('light');
      setTheme('light');
      void updateThemeInDatabase('light');
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 200);
    }

    setIsInitialized(true);
  }, [clearPendingLocalTheme, isMounted, userId, userProfile, isInitialized, markPendingLocalTheme, setTheme, updateThemeInDatabase]);

  useEffect(() => {
    if (!isMounted || !theme || !userId || !isInitialized) return;

    if (isUpdatingFromRemote.current) return;

    if (pendingLocalTheme.current === theme) return;

    if (lastSyncedTheme.current !== theme) {
      lastSyncedTheme.current = theme;
      markPendingLocalTheme(theme);
      void updateThemeInDatabase(theme);
    }
  }, [isMounted, markPendingLocalTheme, theme, userId, isInitialized, updateThemeInDatabase]);

  useEffect(() => {
    if (!isMounted || !theme || !userProfile?.theme_preference || !isInitialized) return;

    const remoteTheme = userProfile.theme_preference;

    if (pendingLocalTheme.current) {
      if (remoteTheme === pendingLocalTheme.current) {
        lastSyncedTheme.current = remoteTheme;
        clearPendingLocalTheme();
      }
      return;
    }

    if (remoteTheme === lastSyncedTheme.current) return;

    lastSyncedTheme.current = remoteTheme;

    if (remoteTheme !== theme) {
      isUpdatingFromRemote.current = true;
      setTheme(remoteTheme);
      toast({
        title: "Theme Updated",
        description: `Theme changed to ${remoteTheme} mode from another device`,
      });
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 300);
    }
  }, [clearPendingLocalTheme, isMounted, isInitialized, setTheme, theme, userProfile?.theme_preference]);

  return {
    currentTheme: theme,
    updateThemeInDatabase,
  };
}
