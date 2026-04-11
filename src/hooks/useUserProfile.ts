"use client";

import { useCallback, useEffect } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { UserProfile } from '@/lib/settleease';

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
  const profile = useQuery(
    api.app.getUserProfile,
    currentUser ? { supabaseUserId: currentUser.id } : 'skip',
  ) as UserProfile | null | undefined;
  const upsertProfile = useMutation(api.app.upsertUserProfile);
  const updateProfile = useMutation(api.app.updateUserProfile);

  useEffect(() => {
    if (!currentUser) return;

    const { firstName, lastName } = getMetadataNames(currentUser);
    void upsertProfile({
      supabaseUserId: currentUser.id,
      email: currentUser.email || undefined,
      firstName,
      lastName,
    }).catch((error) => {
      console.error('Error ensuring Convex user profile:', error);
    });
  }, [currentUser, upsertProfile]);

  const refreshUserProfile = useCallback(async (_showLoading?: boolean) => {
    // Convex live queries refresh automatically.
  }, []);

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<boolean> => {
      if (!currentUser) return false;

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
    [currentUser, updateProfile],
  );

  const hasCompleteName = useCallback(() => {
    return !!(profile?.first_name && profile?.last_name);
  }, [profile]);

  const getDisplayName = useCallback(() => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return currentUser?.email || 'User';
  }, [profile, currentUser]);

  return {
    userProfile: profile ?? null,
    isLoadingProfile: !!currentUser && profile === undefined,
    updateUserProfile,
    hasCompleteName,
    getDisplayName,
    fetchUserProfile: async () => profile ?? null,
    refreshUserProfile,
  };
}
