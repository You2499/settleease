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

  const fetchFeatureFlags = useCallback(async () => {
    if (!db) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from(FEATURE_FLAGS_TABLE)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setFeatureFlags(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      setFeatureFlags([]);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const refreshFeatureFlags = useCallback(async () => {
    await fetchFeatureFlags();
  }, [fetchFeatureFlags]);

  const isFeatureEnabled = useCallback((featureName: string, userId?: string): boolean => {
    const targetUserId = userId || currentUserId;
    if (!targetUserId) return false;

    const featureFlag = featureFlags.find(flag => flag.feature_name === featureName);
    if (!featureFlag) return false;

    if (!featureFlag.is_enabled) return false;

    return featureFlag.enabled_for_users?.includes(targetUserId) || false;
  }, [featureFlags, currentUserId]);

  useEffect(() => {
    fetchFeatureFlags();

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
            
            setFeatureFlags(currentFlags => {
              const oldFlag = payload.old as FeatureFlag;
              const newFlag = payload.new as FeatureFlag;
              let updatedFlags = [...currentFlags];

              if (payload.eventType === 'INSERT') {
                updatedFlags.push(newFlag);
              } else if (payload.eventType === 'UPDATE') {
                updatedFlags = updatedFlags.map(f => f.id === newFlag.id ? newFlag : f);
              } else if (payload.eventType === 'DELETE') {
                updatedFlags = updatedFlags.filter(f => f.id !== oldFlag.id);
              }
              
              if (currentUserId) {
                const wasEnabled = oldFlag ? (oldFlag.enabled_for_users?.includes(currentUserId) && oldFlag.is_enabled) : false;
                const isNowEnabled = newFlag ? (newFlag.enabled_for_users?.includes(currentUserId) && newFlag.is_enabled) : false;

                if (wasEnabled !== isNowEnabled) {
                  const featureName = newFlag?.display_name || oldFlag?.display_name || 'A feature';
                  toast({
                    title: isNowEnabled ? `✨ ${featureName} Enabled!` : `🚫 ${featureName} Disabled`,
                    description: isNowEnabled 
                      ? `You now have access to ${featureName}.`
                      : `${featureName} has been disabled for your account.`,
                    duration: 4000,
                  });
                }
              }
              return updatedFlags;
            });
            setLastUpdated(new Date());
          }
        )
        .subscribe((status) => {
          console.log('Feature flags subscription status:', status);
        });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [db, currentUserId]);

  return {
    featureFlags,
    isLoading,
    isFeatureEnabled,
    refreshFeatureFlags,
    lastUpdated,
  };
}