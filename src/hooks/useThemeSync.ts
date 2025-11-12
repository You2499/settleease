"use client";

import { useEffect, useCallback } from 'react';
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

  // Get the actual resolved theme (handles 'system' theme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  // Load theme from database on mount
  useEffect(() => {
    if (!db || !userId || !userProfile) return;

    const dbTheme = userProfile.theme_preference;
    
    // If database has a theme preference and it's different from current, sync it
    if (dbTheme && dbTheme !== theme) {
      console.log(`🎨 Loading theme from database: ${dbTheme}`);
      setTheme(dbTheme);
    } else if (!dbTheme) {
      // If no theme in database, default to light and save it
      console.log('🎨 No theme in database, defaulting to light');
      setTheme('light');
      updateThemeInDatabase('light');
    }
  }, [db, userId, userProfile]);

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

  // Watch for theme changes and update database
  useEffect(() => {
    if (!theme || !db || !userId) return;

    // Only update if theme is different from what's in the database
    if (userProfile?.theme_preference !== theme) {
      console.log(`🎨 Theme changed to: ${theme}, updating database...`);
      updateThemeInDatabase(theme);
    }
  }, [theme, db, userId, userProfile, updateThemeInDatabase]);

  // Set up real-time subscription for theme changes
  useEffect(() => {
    if (!db || !userId) return;

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
          
          // Only update if the theme changed and it's different from current
          if (newTheme && newTheme !== theme) {
            console.log(`🔄 Real-time theme update received: ${newTheme}`);
            setTheme(newTheme);
            toast({
              title: "Theme Updated",
              description: `Theme changed to ${newTheme} mode from another device`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up theme sync subscription');
      channel.unsubscribe();
    };
  }, [db, userId, theme, setTheme]);

  return {
    currentTheme: theme,
    resolvedTheme,
    updateThemeInDatabase,
  };
}
