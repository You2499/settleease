import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureFlag } from '@/lib/settleease/types';
import { FEATURE_FLAGS_TABLE } from '@/lib/settleease/constants';

interface UseFeatureFlagsReturn {
  featureFlags: FeatureFlag[];
  isLoading: boolean;
  isFeatureEnabled: (featureName: string, userId?: string) => boolean;
  refreshFeatureFlags: () => Promise<void>;
}

export function useFeatureFlags(
  db: SupabaseClient | undefined,
  currentUserId?: string
): UseFeatureFlagsReturn {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeatureFlags = useCallback(async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await db
        .from(FEATURE_FLAGS_TABLE)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setFeatureFlags(data || []);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFeatureFlags([]);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const refreshFeatureFlags = useCallback(async () => {
    setIsLoading(true);
    await fetchFeatureFlags();
  }, [fetchFeatureFlags]);

  const isFeatureEnabled = useCallback((featureName: string, userId?: string): boolean => {
    const targetUserId = userId || currentUserId;
    if (!targetUserId) return false;

    const featureFlag = featureFlags.find(flag => flag.feature_name === featureName);
    if (!featureFlag) return false;

    // If the feature is globally disabled, return false
    if (!featureFlag.is_enabled) return false;

    // Check if the user is in the enabled_for_users array
    return featureFlag.enabled_for_users?.includes(targetUserId) || false;
  }, [featureFlags, currentUserId]);

  useEffect(() => {
    fetchFeatureFlags();
  }, [fetchFeatureFlags]);

  return {
    featureFlags,
    isLoading,
    isFeatureEnabled,
    refreshFeatureFlags,
  };
}