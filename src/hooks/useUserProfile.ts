"use client";

import { useCallback, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { UserProfile } from '@/lib/settleease';
import {
  developmentUserProfile,
  isLocalDevelopmentEnvironment,
} from '@/lib/settleease/developmentAuth';

function getMetadataNames(user: SupabaseUser | null) {
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  if (!fullName) return { firstName: undefined, lastName: undefined };

  const parts = String(fullName).trim().split(/\s+/);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.slice(1).join(' ') || undefined,
  };
}

export function useUserProfile(currentUser: SupabaseUser | null) {
  const isDevelopmentEnvironment = isLocalDevelopmentEnvironment();
  const profile = useQuery(
    api.app.getUserProfile,
    currentUser && !isDevelopmentEnvironment ? { supabaseUserId: currentUser.id } : 'skip',
  ) as UserProfile | null | undefined;
  const upsertProfile = useMutation(api.app.upsertUserProfile);
  const updateProfile = useMutation(api.app.updateUserProfile);

  useEffect(() => {
    if (!currentUser || isDevelopmentEnvironment) return;

    let isCancelled = false;
    const { firstName, lastName } = getMetadataNames(currentUser);

    const ensureProfile = async () => {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (isCancelled) return;

        try {
          await upsertProfile({
            supabaseUserId: currentUser.id,
            email: currentUser.email || undefined,
            firstName,
            lastName,
          });
          return;
        } catch (error) {
          if (attempt === 3 || isCancelled) {
            console.error('Error ensuring Convex user profile:', error);
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    };

    void ensureProfile();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, isDevelopmentEnvironment, upsertProfile]);

  const refreshUserProfile = useCallback(async (_showLoading?: boolean) => {
    // Convex live queries refresh automatically.
  }, []);

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!currentUser) return false;
      if (isDevelopmentEnvironment) return true;

      try {
        await updateProfile({
          supabaseUserId: currentUser.id,
          firstName: updates.first_name,
          lastName: updates.last_name,
          fontPreference: updates.font_preference,
          themePreference: updates.theme_preference,
          lastActiveView: updates.last_active_view as any,
          hasSeenWelcomeToast: updates.has_seen_welcome_toast,
          shouldShowWelcomeToast: updates.should_show_welcome_toast,
        });
        return true;
      } catch (error) {
        console.error('Error updating Convex user profile:', error);
        return false;
      }
    },
    [currentUser, isDevelopmentEnvironment, updateProfile],
  );

  const hasCompleteName = useCallback(() => {
    if (isDevelopmentEnvironment) return true;
    return !!(profile?.first_name && profile?.last_name);
  }, [isDevelopmentEnvironment, profile]);

  const getDisplayName = useCallback(() => {
    if (isDevelopmentEnvironment) return 'Development Admin';

    const profileName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ');

    if (profileName) {
      return profileName;
    }

    return currentUser?.email || 'User';
  }, [profile, currentUser, isDevelopmentEnvironment]);

  const resolvedProfile = isDevelopmentEnvironment && currentUser
    ? developmentUserProfile
    : profile ?? null;

  return {
    userProfile: resolvedProfile,
    isLoadingProfile: !isDevelopmentEnvironment && !!currentUser && (profile === undefined || profile === null),
    updateUserProfile,
    hasCompleteName,
    getDisplayName,
    fetchUserProfile: async () => resolvedProfile,
    refreshUserProfile,
  };
}
