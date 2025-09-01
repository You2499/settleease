"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Settings, Users, BarChart3, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureFlag, Person } from '@/lib/settleease/types';
import { FEATURE_FLAGS_TABLE, FEATURE_NOTIFICATIONS_TABLE } from '@/lib/settleease/constants';

interface FeatureRolloutTabProps {
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  people: Person[];
  currentUserId: string;
}

const AVAILABLE_FEATURES = [
  {
    name: 'analytics',
    displayName: 'Analytics',
    description: 'Advanced analytics and insights for expense tracking and spending patterns',
    icon: BarChart3,
  },
  {
    name: 'activityFeed',
    displayName: 'Activity Feed',
    description: 'Real-time activity feed showing all expense updates and user actions',
    icon: Activity,
  },
];

export default function FeatureRolloutTab({
  db,
  supabaseInitializationError,
  people,
  currentUserId,
}: FeatureRolloutTabProps) {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchFeatureFlags = useCallback(async () => {
    if (!db || supabaseInitializationError) return;

    try {
      const { data, error } = await db
        .from(FEATURE_FLAGS_TABLE)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setFeatureFlags(data || []);
    } catch (error: any) {
      console.error('Error fetching feature flags:', error);
      toast({
        title: "Error",
        description: "Failed to load feature flags",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [db, supabaseInitializationError]);

  const initializeFeatureFlags = useCallback(async () => {
    if (!db || supabaseInitializationError) return;

    try {
      // Check which features already exist
      const { data: existingFlags } = await db
        .from(FEATURE_FLAGS_TABLE)
        .select('feature_name');

      const existingFeatureNames = existingFlags?.map(f => f.feature_name) || [];

      // Create missing feature flags
      const missingFeatures = AVAILABLE_FEATURES.filter(
        feature => !existingFeatureNames.includes(feature.name)
      );

      if (missingFeatures.length > 0) {
        const newFlags = missingFeatures.map(feature => ({
          feature_name: feature.name,
          display_name: feature.displayName,
          description: feature.description,
          is_enabled: false,
          enabled_for_users: [],
        }));

        const { error } = await db
          .from(FEATURE_FLAGS_TABLE)
          .insert(newFlags);

        if (error) throw error;
      }

      await fetchFeatureFlags();
    } catch (error: any) {
      console.error('Error initializing feature flags:', error);
      toast({
        title: "Error",
        description: "Failed to initialize feature flags",
        variant: "destructive"
      });
    }
  }, [db, supabaseInitializationError, fetchFeatureFlags]);

  useEffect(() => {
    initializeFeatureFlags();
  }, [initializeFeatureFlags]);

  const createNotification = async (featureName: string, notificationType: 'enabled' | 'disabled', userIds: string[]) => {
    if (!db || userIds.length === 0) return;

    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        feature_name: featureName,
        notification_type: notificationType,
        is_read: false,
      }));

      const { error } = await db
        .from(FEATURE_NOTIFICATIONS_TABLE)
        .insert(notifications);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error creating notifications:', error);
    }
  };

  const toggleFeatureForAllUsers = async (featureFlag: FeatureFlag) => {
    if (!db) return;

    setIsUpdating(featureFlag.id);

    try {
      const newEnabledState = !featureFlag.is_enabled;
      const allUserIds = people.map(person => person.id);

      const { error } = await db
        .from(FEATURE_FLAGS_TABLE)
        .update({
          is_enabled: newEnabledState,
          enabled_for_users: newEnabledState ? allUserIds : [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', featureFlag.id);

      if (error) throw error;

      // Create notifications for all users
      await createNotification(
        featureFlag.feature_name,
        newEnabledState ? 'enabled' : 'disabled',
        allUserIds
      );

      toast({
        title: "Feature Updated",
        description: `${featureFlag.display_name} has been ${newEnabledState ? 'enabled' : 'disabled'} for all users`,
      });

      await fetchFeatureFlags();
    } catch (error: any) {
      console.error('Error updating feature flag:', error);
      toast({
        title: "Error",
        description: "Failed to update feature flag",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const toggleFeatureForUser = async (featureFlag: FeatureFlag, userId: string) => {
    if (!db) return;

    setIsUpdating(featureFlag.id);

    try {
      const currentEnabledUsers = featureFlag.enabled_for_users || [];
      const isCurrentlyEnabled = currentEnabledUsers.includes(userId);
      
      let newEnabledUsers: string[];
      if (isCurrentlyEnabled) {
        newEnabledUsers = currentEnabledUsers.filter(id => id !== userId);
      } else {
        newEnabledUsers = [...currentEnabledUsers, userId];
      }

      const { error } = await db
        .from(FEATURE_FLAGS_TABLE)
        .update({
          enabled_for_users: newEnabledUsers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', featureFlag.id);

      if (error) throw error;

      // Create notification for the specific user
      await createNotification(
        featureFlag.feature_name,
        isCurrentlyEnabled ? 'disabled' : 'enabled',
        [userId]
      );

      const userName = people.find(p => p.id === userId)?.name || 'User';
      toast({
        title: "Feature Updated",
        description: `${featureFlag.display_name} has been ${isCurrentlyEnabled ? 'disabled' : 'enabled'} for ${userName}`,
      });

      await fetchFeatureFlags();
    } catch (error: any) {
      console.error('Error updating feature flag for user:', error);
      toast({
        title: "Error",
        description: "Failed to update feature flag for user",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  if (supabaseInitializationError) {
    return (
      <Card className="text-center py-10">
        <CardHeader>
          <CardTitle className="flex items-center justify-center text-destructive">
            <AlertCircle className="mr-2 h-6 w-6" />
            Database Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cannot manage feature rollouts without database connection.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="text-center py-10">
        <CardHeader>
          <CardTitle className="flex items-center justify-center">
            <Clock className="mr-2 h-6 w-6 animate-spin" />
            Loading Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Fetching feature rollout configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Feature Rollout</h1>
          <p className="text-muted-foreground mt-1">
            Control which features are available to users
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Settings className="h-3 w-3" />
          Admin Only
        </Badge>
      </div>

      <div className="grid gap-6">
        {featureFlags.map((featureFlag) => {
          const featureConfig = AVAILABLE_FEATURES.find(f => f.name === featureFlag.feature_name);
          const FeatureIcon = featureConfig?.icon || Settings;
          const enabledUserCount = featureFlag.enabled_for_users?.length || 0;
          const totalUserCount = people.length;

          return (
            <Card key={featureFlag.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FeatureIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{featureFlag.display_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {featureFlag.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={featureFlag.is_enabled ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {featureFlag.is_enabled ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {featureFlag.is_enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Global Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Enable for All Users</p>
                      <p className="text-sm text-muted-foreground">
                        {enabledUserCount} of {totalUserCount} users have access
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={featureFlag.is_enabled}
                      onCheckedChange={() => toggleFeatureForAllUsers(featureFlag)}
                      disabled={isUpdating === featureFlag.id}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleFeatureForAllUsers(featureFlag)}
                      disabled={isUpdating === featureFlag.id}
                    >
                      {isUpdating === featureFlag.id ? 'Updating...' : 'Toggle All'}
                    </Button>
                  </div>
                </div>

                {/* Individual User Controls */}
                {people.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Individual User Access</h4>
                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                      {people.map((person) => {
                        const isEnabled = featureFlag.enabled_for_users?.includes(person.id) || false;
                        
                        return (
                          <div
                            key={person.id}
                            className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className="font-medium">{person.name}</span>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleFeatureForUser(featureFlag, person.id)}
                              disabled={isUpdating === featureFlag.id}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {people.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No users available. Add people first to manage individual access.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {featureFlags.length === 0 && (
        <Card className="text-center py-10">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-muted-foreground">
              <Settings className="mr-2 h-6 w-6" />
              No Feature Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Feature flags will be automatically created when available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}