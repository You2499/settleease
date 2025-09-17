"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Settings, Users, BarChart3, Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeatureFlag } from '@/lib/settleease/types';
import { FEATURE_FLAGS_TABLE, FEATURE_NOTIFICATIONS_TABLE } from '@/lib/settleease/constants';

interface FeatureRolloutTabProps {
  db: SupabaseClient | undefined;
  supabaseInitializationError: string | null;
  currentUserId: string;
}

interface AuthenticatedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name: string;
  role?: string;
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
  currentUserId,
}: FeatureRolloutTabProps) {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [authenticatedUsers, setAuthenticatedUsers] = useState<AuthenticatedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);


  const fetchAuthenticatedUsers = useCallback(async () => {
    if (!db || supabaseInitializationError) return;

    try {
      // First check if current user is admin by querying their own profile
      const { data: currentUserData, error: currentUserError } = await db
        .from('user_profiles')
        .select('role')
        .eq('user_id', currentUserId)
        .single();

      if (currentUserError) throw currentUserError;

      const isCurrentUserAdmin = currentUserData?.role === 'admin';

      // If user is admin, use the admin view to get all users
      // Otherwise, just get their own profile
      const { data, error } = isCurrentUserAdmin
        ? await db
          .from('admin_user_profiles')
          .select('user_id, first_name, last_name, role')
          .order('role', { ascending: false }) // Show admins first
          .order('first_name', { ascending: true })
        : await db
          .from('user_profiles')
          .select('user_id, first_name, last_name, role')
          .eq('user_id', currentUserId);

      if (error) throw error;

      // Filter out any profiles without user_id
      const validProfiles = data?.filter(profile => profile.user_id) || [];

      if (validProfiles.length === 0) {
        // Fallback: just use current user
        setAuthenticatedUsers([{
          id: currentUserId,
          email: 'Current User',
          display_name: 'Current User',
          role: 'user'
        }]);
        return;
      }

      // Create user list with display names and roles
      const users: AuthenticatedUser[] = validProfiles.map(profile => ({
        id: profile.user_id,
        email: '', // We'll show display name instead
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || 'user',
        display_name: profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : profile.first_name || profile.last_name || `User ${profile.user_id.slice(0, 8)}...`
      }));

      setAuthenticatedUsers(users);
    } catch (error: any) {
      console.error('Error fetching authenticated users:', error);
      // Fallback: just use current user
      setAuthenticatedUsers([{
        id: currentUserId,
        email: 'Current User',
        display_name: 'Current User (Fallback)',
        role: 'user'
      }]);
    }
  }, [db, supabaseInitializationError, currentUserId]);

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

  const cleanupDuplicateNotifications = useCallback(async () => {
    if (!db || supabaseInitializationError) return;

    try {
      // Clean up duplicate notifications by keeping only the most recent one per user per feature
      const { error } = await db.rpc('cleanup_duplicate_notifications');
      
      if (error) {
        console.error('Error cleaning up duplicate notifications:', error);
        // Don't throw, this is not critical
      }
    } catch (error: any) {
      console.error('Error in cleanup function:', error);
    }
  }, [db, supabaseInitializationError]);

  const initializeFeatureFlags = useCallback(async () => {
    if (!db || supabaseInitializationError) return;

    try {
      // Clean up any duplicate notifications first
      await cleanupDuplicateNotifications();

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
  }, [db, supabaseInitializationError, fetchFeatureFlags, cleanupDuplicateNotifications]);

  useEffect(() => {
    const initialize = async () => {
      await fetchAuthenticatedUsers();
      await initializeFeatureFlags();
    };
    initialize();

    // Set up real-time subscriptions
    if (db) {
      const subscription = db
        .channel('feature_rollout_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: FEATURE_FLAGS_TABLE,
          },
          () => {
            fetchFeatureFlags();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles',
          },
          (payload) => {
            // Show toast notification for user changes
            if (payload.eventType === 'INSERT') {
              const newUser = payload.new as any;
              toast({
                title: "👤 New User Added",
                description: `${newUser.first_name} ${newUser.last_name} has joined the system`,
                duration: 3000,
              });
            } else if (payload.eventType === 'UPDATE') {
              toast({
                title: "👤 User Updated",
                description: `User profile has been updated`,
                duration: 2000,
              });
            }

            // Add a small delay to ensure the database has been updated
            setTimeout(() => {
              fetchAuthenticatedUsers();
            }, 100);
          }
        )
        .subscribe((status) => {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        });

      return () => {
        subscription.unsubscribe();
        setIsRealtimeConnected(false);
      };
    }
  }, [fetchAuthenticatedUsers, initializeFeatureFlags, fetchFeatureFlags, db]);

  const createNotification = async (featureName: string, notificationType: 'enabled' | 'disabled', userIds: string[]) => {
    if (!db || userIds.length === 0) return;

    try {
      // First, delete any existing unread notifications for this feature and these users
      // to prevent duplicates
      const { error: deleteError } = await db
        .from(FEATURE_NOTIFICATIONS_TABLE)
        .delete()
        .eq('feature_name', featureName)
        .in('user_id', userIds)
        .eq('is_read', false);

      if (deleteError) {
        console.error('Error deleting old notifications:', deleteError);
        // Continue anyway, don't throw
      }

      // Create new notifications
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
      const allUserIds = authenticatedUsers.map(user => user.id);

      // Update the feature flag
      const { error } = await db
        .from(FEATURE_FLAGS_TABLE)
        .update({
          is_enabled: newEnabledState,
          enabled_for_users: newEnabledState ? allUserIds : [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', featureFlag.id);

      if (error) throw error;

      // Only create notifications if there are users to notify
      if (allUserIds.length > 0) {
        await createNotification(
          featureFlag.feature_name,
          newEnabledState ? 'enabled' : 'disabled',
          allUserIds
        );
      }

      toast({
        title: "🎉 Feature Updated Successfully",
        description: `${featureFlag.display_name} has been ${newEnabledState ? 'enabled' : 'disabled'} for all ${allUserIds.length} user${allUserIds.length !== 1 ? 's' : ''} in real-time. ${newEnabledState ? 'Users will see the feature immediately and receive a notification!' : 'Users will lose access immediately and be notified about this change.'}`,
        duration: 6000,
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

      // Don't do anything if the state isn't actually changing
      if (isCurrentlyEnabled === isCurrentlyEnabled) {
        let newEnabledUsers: string[];
        if (isCurrentlyEnabled) {
          newEnabledUsers = currentEnabledUsers.filter(id => id !== userId);
        } else {
          newEnabledUsers = [...currentEnabledUsers, userId];
        }

        // Update the feature flag
        const { error } = await db
          .from(FEATURE_FLAGS_TABLE)
          .update({
            enabled_for_users: newEnabledUsers,
            updated_at: new Date().toISOString(),
          })
          .eq('id', featureFlag.id);

        if (error) throw error;

        // Create notification for the specific user only
        await createNotification(
          featureFlag.feature_name,
          isCurrentlyEnabled ? 'disabled' : 'enabled',
          [userId]
        );

        const user = authenticatedUsers.find(u => u.id === userId);
        const userName = user?.display_name || 'User';
        toast({
          title: `✨ Feature ${isCurrentlyEnabled ? 'Disabled' : 'Enabled'}`,
          description: `${featureFlag.display_name} has been ${isCurrentlyEnabled ? 'disabled' : 'enabled'} for ${userName} in real-time. ${!isCurrentlyEnabled ? 'They will see the feature immediately and receive a notification!' : 'They will lose access immediately and be notified about this change.'}`,
          duration: 5000,
        });

        await fetchFeatureFlags();
      }
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
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">
              Control which features are available to users
            </p>
            <div className={`flex items-center gap-1 text-xs ${isRealtimeConnected
              ? 'text-green-600 dark:text-green-400'
              : 'text-orange-600 dark:text-orange-400'
              }`}>
              <div className={`w-2 h-2 rounded-full ${isRealtimeConnected
                ? 'bg-green-500 animate-pulse'
                : 'bg-orange-500'
                }`}></div>
              <span className="font-medium">
                {isRealtimeConnected ? 'Real-time Active' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {featureFlags.map((featureFlag) => {
          const featureConfig = AVAILABLE_FEATURES.find(f => f.name === featureFlag.feature_name);
          const FeatureIcon = featureConfig?.icon || Settings;
          const enabledUserCount = featureFlag.enabled_for_users?.length || 0;
          const totalUserCount = authenticatedUsers.length;

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
                {authenticatedUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Individual User Access ({authenticatedUsers.length} users)
                      </h4>
                      {isRealtimeConnected && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-medium">Auto-sync</span>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-2 max-h-60 overflow-y-auto">
                      {authenticatedUsers.map((user) => {
                        const isEnabled = featureFlag.enabled_for_users?.includes(user.id) || false;

                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-3 bg-background border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.display_name}</span>
                                <div className="flex items-center gap-2">
                                  {user.role && (
                                    <span className={`text-xs px-2 py-0.5 rounded ${user.role === 'admin'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                      }`}>
                                      {user.role}
                                    </span>
                                  )}
                                  {user.id === currentUserId && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">You</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleFeatureForUser(featureFlag, user.id)}
                              disabled={isUpdating === featureFlag.id}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {authenticatedUsers.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No authenticated users found. Please check your user profiles.</p>
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