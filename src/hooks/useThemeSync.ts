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
  const updateUserProfile = useMutation(api.app.updateUserProfile);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsInitialized(false);
      lastSyncedTheme.current = null;
      isUpdatingFromRemote.current = false;
    }
  }, [userId]);

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
      setTheme(dbTheme);
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 200);
    } else {
      isUpdatingFromRemote.current = true;
      lastSyncedTheme.current = 'light';
      setTheme('light');
      void updateThemeInDatabase('light');
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 200);
    }

    setIsInitialized(true);
  }, [isMounted, userId, userProfile, isInitialized, setTheme, updateThemeInDatabase]);

  useEffect(() => {
    if (!isMounted || !theme || !userId || !isInitialized) return;

    if (isUpdatingFromRemote.current) return;

    if (lastSyncedTheme.current !== theme) {
      lastSyncedTheme.current = theme;
      void updateThemeInDatabase(theme);
    }
  }, [isMounted, theme, userId, isInitialized, updateThemeInDatabase]);

  useEffect(() => {
    if (!isMounted || !theme || !userProfile?.theme_preference || !isInitialized) return;

    const remoteTheme = userProfile.theme_preference;
    if (remoteTheme && remoteTheme !== lastSyncedTheme.current && remoteTheme !== theme) {
      isUpdatingFromRemote.current = true;
      lastSyncedTheme.current = remoteTheme;
      setTheme(remoteTheme);
      toast({
        title: "Theme Updated",
        description: `Theme changed to ${remoteTheme} mode from another device`,
      });
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 300);
    }
  }, [isMounted, isInitialized, setTheme, theme, userProfile?.theme_preference]);

  return {
    currentTheme: theme,
    updateThemeInDatabase,
  };
}
