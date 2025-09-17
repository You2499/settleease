import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureFlag } from '@/lib/settleease/types';
import { FEATURE_FLAGS_TABLE } from '@/lib/settleease/constants';
import { toast } from '@/hooks/use-toast';

interface UseFeatureFlagsReturn {
  featureFlags: FeatureFlag[];
  isLoading: boolean;
  isFeatureEnabled: (featureName: string, userId?: string) => boolean;
  refreshFeatureFlags: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useFeatureFlags(
  db: SupabaseClient | undefined,
  currentUserId?: string
): UseFeatureFlagsReturn {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [previousFlags, setPreviousFlags] = useState<FeatureFlag[]>([]);

  const fetchFeatureFlags = useCallback(async (showNotifications = false) => {
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

      const newFlags = data || [];
      
      // Check for changes and show notifications if requested
      if (showNotifications && currentUserId && previousFlags.length > 0) {
        newFlags.forEach(newFlag => {
          const oldFlag = previousFlags.find(f => f.feature_name === newFlag.feature_name);
          if (oldFlag && currentUserId) {
            const wasEnabled = oldFlag.enabled_for_users?.includes(currentUserId) || false;
            const isNowEnabled = newFlag.enabled_for_users?.includes(currentUserId) || false;
            
            // Show notification if the feature status changed for this user
            if (wasEnabled !== isNowEnabled) {
              const featureName = newFlag.display_name || newFlag.feature_name;
              toast({
                title: isNowEnabled ? `✨ ${featureName} Enabled!` : `🚫 ${featureName} Disabled`,
                description: isNowEnabled 
                  ? `You now have access to ${featureName}. Check it out in the sidebar!`
                  : `${featureName} has been disabled for your account.`,
                duration: 4000,
              });
            }
          }
        });
      }

      setPreviousFlags(featureFlags); // Store current flags as previous
      setFeatureFlags(newFlags);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFeatureFlags([]);
    } finally {
      setIsLoading(false);
    }
  }, [db, currentUserId, previousFlags, featureFlags]);

  const refreshFeatureFlags = useCallback(async () => {
    setIsLoading(true);
    await fetchFeatureFlags(false);
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
    // Initial fetch without notifications
    fetchFeatureFlags(false);

    // Set up real-time subscription for feature flags
    if (db && currentUserId) {
      const subscription = db
        .channel('feature_flags_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: FEATURE_FLAGS_TABLE,
          },
          (payload) => {
            console.log('Feature flags changed in real-time:', payload);
            // Refresh feature flags with notifications enabled for real-time updates
            fetchFeatureFlags(true);
          }
        )
        .subscribe((status) => {
          console.log('Feature flags subscription status:', status);
        });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [fetchFeatureFlags, db, currentUserId]);

  return {
    featureFlags,
    isLoading,
    isFeatureEnabled,
    refreshFeatureFlags,
    lastUpdated,
  };
}