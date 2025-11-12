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
  const { theme, setTheme, systemTheme } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const isUpdatingFromRemote = useRef(false);

  // Get the actual resolved theme (handles 'system' theme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Load theme from database on mount (only once)
  useEffect(() => {
    if (!db || !userId || !userProfile || isInitialized) return;

    const dbTheme = userProfile.theme_preference;
    
    // If database has a theme preference, use it
    if (dbTheme) {
      console.log(`🎨 Loading theme from database: ${dbTheme}`);
      isUpdatingFromRemote.current = true;
      setTheme(dbTheme);
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 100);
    } else if (!dbTheme) {
      // If no theme in database, default to light and save it
      console.log('🎨 No theme in database, defaulting to light');
      isUpdatingFromRemote.current = true;
      setTheme('light');
      updateThemeInDatabase('light');
      setTimeout(() => {
        isUpdatingFromRemote.current = false;
      }, 100);
    }
    
    setIsInitialized(true);
  }, [db, userId, userProfile, isInitialized]);

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
    if (!theme || !db || !userId || !isInitialized) return;
    
    // Don't update database if this change came from remote
    if (isUpdatingFromRemote.current) {
      console.log('🎨 Skipping database update - change came from remote');
      return;
    }

    // Only update if theme is different from what's in the database
    const dbTheme = userProfile?.theme_preference;
    if (dbTheme !== theme) {
      console.log(`🎨 Local theme changed to: ${theme}, updating database...`);
      updateThemeInDatabase(theme);
    }
  }, [theme, db, userId, isInitialized, userProfile?.theme_preference, updateThemeInDatabase]);

  // Set up real-time subscription for theme changes
  useEffect(() => {
    if (!db || !userId || !isInitialized) return;

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
          
          // Only update if the theme actually changed
          if (newTheme && newTheme !== oldTheme) {
            console.log(`🔄 Real-time theme update received: ${oldTheme} → ${newTheme}`);
            
            // Mark this as a remote update to prevent loop
            isUpdatingFromRemote.current = true;
            setTheme(newTheme);
            
            toast({
              title: "Theme Updated",
              description: `Theme changed to ${newTheme} mode from another device`,
            });
            
            // Reset flag after a short delay
            setTimeout(() => {
              isUpdatingFromRemote.current = false;
            }, 100);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up theme sync subscription');
      channel.unsubscribe();
    };
  }, [db, userId, isInitialized, setTheme]);

  return {
    currentTheme: theme,
    resolvedTheme,
    updateThemeInDatabase,
  };
}
