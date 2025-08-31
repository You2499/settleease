"use client";

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { USER_PROFILES_TABLE, type UserProfile } from '@/lib/settleease';

export function useUserProfile(db: SupabaseClient | undefined, currentUser: SupabaseUser | null) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!db || !userId) return null;
    
    try {
      const { data, error } = await db
        .from(USER_PROFILES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(`User profile not found for ${userId}. This is normal for new users.`);
          return null;
        }
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data as UserProfile;
    } catch (e: any) {
      console.error('Exception while fetching user profile:', e);
      return null;
    }
  }, [db]);

  // Add a refresh function that updates the state
  const refreshUserProfile = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    
    setIsLoadingProfile(true);
    try {
      const profile = await fetchUserProfile(currentUser.id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [currentUser, fetchUserProfile]);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!db || !currentUser) return false;
    
    try {
      const { error } = await db
        .from(USER_PROFILES_TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id);

      if (error) throw error;
      
      // Refresh the profile data
      const updatedProfile = await fetchUserProfile(currentUser.id);
      setUserProfile(updatedProfile);
      
      return true;
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }, [db, currentUser, fetchUserProfile]);

  const hasCompleteName = useCallback(() => {
    return userProfile?.first_name && userProfile?.last_name;
  }, [userProfile]);

  const getDisplayName = useCallback(() => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return currentUser?.email || 'User';
  }, [userProfile, currentUser]);

  // Effect to fetch user profile when user changes
  useEffect(() => {
    let isMounted = true;
    
    if (currentUser) {
      setIsLoadingProfile(true);
      fetchUserProfile(currentUser.id).then(profile => {
        if (isMounted) {
          setUserProfile(profile);
          setIsLoadingProfile(false);
        }
      });
    } else {
      setUserProfile(null);
      setIsLoadingProfile(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [currentUser, fetchUserProfile]);

  return {
    userProfile,
    isLoadingProfile,
    updateUserProfile,
    hasCompleteName,
    getDisplayName,
    fetchUserProfile,
    refreshUserProfile,
  };
}