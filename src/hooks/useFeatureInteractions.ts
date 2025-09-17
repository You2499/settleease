import { useState, useCallback, useEffect } from 'react';

interface FeatureInteraction {
  featureName: string;
  lastInteracted: Date;
  hasSeenNotification: boolean;
  hasClickedFeature: boolean;
}

interface UseFeatureInteractionsReturn {
  hasSeenFeatureNotification: (featureName: string) => boolean;
  hasClickedFeature: (featureName: string) => boolean;
  markNotificationSeen: (featureName: string) => void;
  markFeatureClicked: (featureName: string) => void;
  shouldShowIndicator: (featureName: string) => boolean;
  clearAllIndicators: () => void;
}

const STORAGE_KEY = 'feature_interactions';

export function useFeatureInteractions(): UseFeatureInteractionsReturn {
  const [interactions, setInteractions] = useState<Record<string, FeatureInteraction>>({});

  // Load interactions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects and clean up old entries
        const converted: Record<string, FeatureInteraction> = {};
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          const lastInteracted = new Date(value.lastInteracted);
          // Only keep interactions from the last 30 days
          if (lastInteracted > thirtyDaysAgo) {
            converted[key] = {
              ...value,
              lastInteracted
            };
          }
        });
        setInteractions(converted);
      }
    } catch (error) {
      console.error('Error loading feature interactions:', error);
    }
  }, []);

  // Save interactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(interactions));
    } catch (error) {
      console.error('Error saving feature interactions:', error);
    }
  }, [interactions]);

  const hasSeenFeatureNotification = useCallback((featureName: string): boolean => {
    return interactions[featureName]?.hasSeenNotification || false;
  }, [interactions]);

  const hasClickedFeature = useCallback((featureName: string): boolean => {
    return interactions[featureName]?.hasClickedFeature || false;
  }, [interactions]);

  const markNotificationSeen = useCallback((featureName: string) => {
    setInteractions(prev => ({
      ...prev,
      [featureName]: {
        ...prev[featureName],
        featureName,
        lastInteracted: new Date(),
        hasSeenNotification: true,
        hasClickedFeature: prev[featureName]?.hasClickedFeature || false,
      }
    }));
  }, []);

  const markFeatureClicked = useCallback((featureName: string) => {
    setInteractions(prev => ({
      ...prev,
      [featureName]: {
        ...prev[featureName],
        featureName,
        lastInteracted: new Date(),
        hasSeenNotification: prev[featureName]?.hasSeenNotification || false,
        hasClickedFeature: true,
      }
    }));
  }, []);

  const shouldShowIndicator = useCallback((featureName: string): boolean => {
    const interaction = interactions[featureName];
    if (!interaction) return true; // Show indicator for new features
    
    // Hide indicator if user has both seen notification AND clicked the feature
    return !(interaction.hasSeenNotification && interaction.hasClickedFeature);
  }, [interactions]);

  const clearAllIndicators = useCallback(() => {
    setInteractions(prev => {
      const updated: Record<string, FeatureInteraction> = {};
      Object.entries(prev).forEach(([key, value]) => {
        updated[key] = {
          ...value,
          hasSeenNotification: true,
          hasClickedFeature: true,
          lastInteracted: new Date(),
        };
      });
      return updated;
    });
  }, []);

  return {
    hasSeenFeatureNotification,
    hasClickedFeature,
    markNotificationSeen,
    markFeatureClicked,
    shouldShowIndicator,
    clearAllIndicators,
  };
}