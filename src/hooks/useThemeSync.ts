"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";

const USER_PROFILES_TABLE = 'user_profiles';

export function useThemeSync(
  db: SupabaseClient | undefined,
  userId: string | undefined,
  userProfile: any
) {
  const { theme, setTheme, systemTheme, resolvedTheme: nextThemesResolved } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isUpdatingFromRemote = useRef(false);
  const lastSyncedTheme = useRef<string | null>(null);

  // Wait for next-themes to mount (fixes Safari/iOS hydration issues)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get the actual resolved theme (handles 'system' theme)
  const resolvedTheme = nextThemesResolved || (theme === 'system' ? systemTheme : theme);

  // Load theme from database on mount (only once, after next-themes is mounted)
  useEffect(() => {
    if (!isMounted || !db || !userId || !userProfile || isInitialized) return;

    const dbTheme = userProfile.theme_preference;
    console.log(`🎨 [Init] Current theme: ${theme}, DB theme: ${dbTheme}, Mounted: ${isMounted}`);
    
    // If database has a theme preference, use it
    if (dbTheme) {
      console.log(`🎨 Loading theme from database: ${dbTheme}`);
      isUpdatingFromRemote.current = true;
      lastSyncedTheme.current = dbTheme;
      setTheme(dbTheme);
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 200);
    } else if (!dbTheme) {
      // If no theme in database, default to light and save it
      console.log('🎨 No theme in database, defaulting to light');
      isUpdatingFromRemote.current = true;
      lastSyncedTheme.current = 'light';
      setTheme('light');
      updateThemeInDatabase('light');
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 200);
    }
    
    setIsInitialized(true);
  }, [isMounted, db, userId, userProfile, isInitialized, theme]);

  // Update database when theme changes
  const updateThemeInDatabase = useCallback(async (newTheme: string) => {
    if (!db || !userId) {
      console.warn('Cannot update theme: missing db or userId');
      return;
    }

    try {
      const { error } = await db
        .from(USER_PROFILES_TABLE)
        .update({ theme_preference: newTheme })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating theme in database:', error);
        toast({
          title: "Theme Sync Error",
          description: "Failed to save theme preference",
          variant: "destructive",
        });
      } else {
        console.log(`✅ Theme updated in database: ${newTheme}`);
      }
    } catch (error: any) {
      console.error('Error updating theme:', error);
    }
  }, [db, userId]);

  // Watch for LOCAL theme changes and update database
  useEffect(() => {
    if (!isMounted || !theme || !db || !userId || !isInitialized) return;
    
    console.log(`🎨 [Watch] Theme: ${theme}, LastSynced: ${lastSyncedTheme.current}, IsRemote: ${isUpdatingFromRemote.current}`);
    
    // Don't update database if this change came from remote
    if (isUpdatingFromRemote.current) {
      console.log('🎨 Skipping database update - change came from remote');
      return;
    }

    // Only update if theme is different from what we last synced
    if (lastSyncedTheme.current !== theme) {
      console.log(`🎨 Local theme changed: ${lastSyncedTheme.current} → ${theme}, updating database...`);
      lastSyncedTheme.current = theme;
      updateThemeInDatabase(theme);
    }
  }, [isMounted, theme, db, userId, isInitialized, updateThemeInDatabase]);

  // Set up real-time subscription for theme changes
  useEffect(() => {
    if (!isMounted || !db || !userId || !isInitialized) return;

    console.log('🔄 Setting up real-time theme sync subscription');

    const channel = db
      .channel(`theme-sync-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: USER_PROFILES_TABLE,
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newTheme = payload.new?.theme_preference;
          const oldTheme = payload.old?.theme_preference;
          
          console.log(`🔄 [Realtime] Received update: ${oldTheme} → ${newTheme}, Current: ${theme}`);
          
          // Only update if the theme actually changed
          if (newTheme && newTheme !== oldTheme && newTheme !== theme) {
            console.log(`🔄 Applying real-time theme update: ${newTheme}`);
            
            // Mark this as a remote update to prevent loop
            isUpdatingFromRemote.current = true;
            lastSyncedTheme.current = newTheme;
            setTheme(newTheme);
            
            toast({
              title: "Theme Updated",
              description: `Theme changed to ${newTheme} mode from another device`,
            });
            
            // Reset flag after a longer delay for Safari
            setTimeout(() => {
              isUpdatingFromRemote.current = false;
              console.log('🔄 Remote update flag cleared');
            }, 300);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔄 Subscription status:', status);
      });

    return () => {
      console.log('🔄 Cleaning up theme sync subscription');
      channel.unsubscribe();
    };
  }, [isMounted, db, userId, isInitialized, setTheme, theme]);

  return {
    currentTheme: theme,
    resolvedTheme,
    updateThemeInDatabase,
  };
}
