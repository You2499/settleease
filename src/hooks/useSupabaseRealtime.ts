"use client";

import { useEffect, useRef } from 'react';
import type { SupabaseClient, User as SupabaseUser, RealtimeChannel } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import {
  EXPENSES_TABLE,
  PEOPLE_TABLE,
  CATEGORIES_TABLE,
  SETTLEMENT_PAYMENTS_TABLE,
  MANUAL_SETTLEMENT_OVERRIDES_TABLE,
} from '@/lib/settleease';
import type { UserRole } from '@/lib/settleease';

export function useSupabaseRealtime(
  db: SupabaseClient | undefined,
  supabaseInitializationError: string | null,
  currentUser: SupabaseUser | null,
  userRole: UserRole,
  isDataFetchedAtLeastOnce: boolean,
  fetchAllData: (showLoadingIndicator?: boolean) => Promise<void>
) {
  const peopleChannelRef = useRef<RealtimeChannel | null>(null);
  const expensesChannelRef = useRef<RealtimeChannel | null>(null);
  const categoriesChannelRef = useRef<RealtimeChannel | null>(null);
  const settlementPaymentsChannelRef = useRef<RealtimeChannel | null>(null);
  const manualOverridesChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let isMounted = true;
    console.log("Realtime effect: Start. DB:", !!db, "currentUser:", !!currentUser, "SupabaseInitError:", !!supabaseInitializationError, "isDataFetchedOnce:", isDataFetchedAtLeastOnce, "userRole:", userRole);

    if (supabaseInitializationError || !db) {
      console.log("Realtime setup skipped: Supabase client not available or init error.");
      if (db && typeof db.removeAllChannels === 'function') {
        console.log("Realtime: Attempting to remove all channels due to init error/unavailable client.");
        db.removeAllChannels()
          .catch(e => console.warn("Realtime: Precautionary removeAllChannels (init error path) failed:", e?.message || e))
          .finally(() => {
            if (isMounted) {
              peopleChannelRef.current = null;
              expensesChannelRef.current = null;
              categoriesChannelRef.current = null;
              settlementPaymentsChannelRef.current = null;
              manualOverridesChannelRef.current = null;
              console.log("Realtime: Channel refs nullified (init error path).");
            }
          });
      } else {
        peopleChannelRef.current = null;
        expensesChannelRef.current = null;
        categoriesChannelRef.current = null;
        settlementPaymentsChannelRef.current = null;
        manualOverridesChannelRef.current = null;
        console.log("Realtime: Channel refs nullified (db client was null).");
      }
      return;
    }

    if (!currentUser) {
      console.log("Realtime setup skipped: No authenticated user.");
      if (peopleChannelRef.current || expensesChannelRef.current || categoriesChannelRef.current || settlementPaymentsChannelRef.current || manualOverridesChannelRef.current) {
        console.log("Realtime: User logged out. Ensuring local channel refs are cleared (should have been handled by prior cleanup).");
        peopleChannelRef.current = null;
        expensesChannelRef.current = null;
        categoriesChannelRef.current = null;
        settlementPaymentsChannelRef.current = null;
        manualOverridesChannelRef.current = null;
      }
      return;
    }

    if (!isDataFetchedAtLeastOnce || !userRole) {
      console.log("Realtime subscriptions deferred: Waiting for initial data fetch and user role.");
      return;
    }

    console.log("Attempting to set up Supabase Realtime subscriptions using refs...");

    const handleDbChange = (payload: any, table: string) => {
        if (!isMounted) return;
        console.log(`Realtime: ${table} change received!`, payload.eventType, payload.new || payload.old || payload);
        toast({ title: "Data Synced", description: `${table} has been updated.`, duration: 2000});
        fetchAllData(false);
    };

    const handleSubscriptionError = (tableName: string, status: string, error?: any) => {
      if (!isMounted) return;
      const baseMessage = `Subscription error on ${tableName}`;

      if (status === 'CHANNEL_ERROR') {
        if (error) {
          console.warn(`${baseMessage}: Status: ${status}. Error details:`, error);
        } else {
          console.warn(`${baseMessage}: Status was ${status} but no error object was provided. This often points to RLS or Realtime Replication issues in Supabase.`);
        }
      } else if (error) {
        console.error(`${baseMessage}: Status: ${status}`, error);
        toast({ title: `Realtime Error (${tableName})`, description: `Could not subscribe: ${error.message || 'Unknown error'}. Status: ${status}.`, variant: "destructive", duration: 10000 });
      } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
         console.warn(`${baseMessage}: Status was ${status} but no error object was provided. This often points to RLS or Realtime Replication issues in Supabase.`);
      } else {
         console.warn(`${baseMessage}: Unhandled status ${status} without an error object.`);
      }
    };

    const setupChannel = async (
        channelRef: React.MutableRefObject<RealtimeChannel | null>,
        tableName: string
      ) => {
        if (!db || !isMounted) return;
        if (channelRef.current && channelRef.current.state === 'joined') {
            console.log(`Realtime: Already subscribed to ${tableName}. State: ${channelRef.current.state}`);
            return;
        }

        if (channelRef.current) {
            console.log(`Realtime: Channel ref for ${tableName} exists but not joined (state: ${channelRef.current.state}). Attempting to remove first.`);
            try {
                await db.removeChannel(channelRef.current);
                console.log(`Realtime: Successfully removed existing (non-joined) channel for ${tableName}.`);
            } catch (removeError: any) {
                console.warn(`Realtime: Error removing existing (non-joined) channel for ${tableName}:`, removeError?.message || removeError);
            }
            channelRef.current = null;
        }

        console.log(`Realtime: Creating new channel for ${tableName}`);
        const channel = db.channel(`public:${tableName}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: tableName },
              (payload) => handleDbChange(payload, tableName)
          );

        channelRef.current = channel;

        try {
            console.log(`Realtime: Attempting to subscribe to ${tableName}...`);
            channel.subscribe(async (status, err) => {
              if (!isMounted) {
                 console.log(`Realtime (${tableName}): subscription callback ignored, component unmounted.`);
                 return;
              }

              console.log(`Realtime: Subscription status for ${tableName}: ${status}`, err ? `Error: ${err.message}` : '');
              if (status === 'SUBSCRIBED') {
                console.log(`Realtime: Subscribed successfully to ${tableName}`);
              } else if ((err && status !== 'CHANNEL_ERROR') || status === 'TIMED_OUT' || status === 'CLOSED') { 
                handleSubscriptionError(tableName, status, err);
                if(channelRef.current === channel) {
                    console.log(`Realtime: Nullifying channelRef for ${tableName} due to error/closed status.`);
                    channelRef.current = null;
                }
              } else if (status === 'CHANNEL_ERROR') { 
                  console.warn(`Subscription error on ${tableName}: Status was ${status}. Error details:`, err);
                  if(channelRef.current === channel) {
                    console.log(`Realtime: Nullifying channelRef for ${tableName} due to CHANNEL_ERROR.`);
                    channelRef.current = null;
                  }
              }
            });
          } catch (subscribeError: any) {
            if (!isMounted) return;
            console.error(`Realtime: Direct error during .subscribe() call for ${tableName}:`, subscribeError);
            handleSubscriptionError(tableName, 'SUBSCRIBE_CALL_ERROR', subscribeError);
            if(channelRef.current === channel) {
                 channelRef.current = null;
            }
          }
    };

    setupChannel(peopleChannelRef, PEOPLE_TABLE);
    setupChannel(expensesChannelRef, EXPENSES_TABLE);
    setupChannel(categoriesChannelRef, CATEGORIES_TABLE);
    setupChannel(settlementPaymentsChannelRef, SETTLEMENT_PAYMENTS_TABLE);
    setupChannel(manualOverridesChannelRef, MANUAL_SETTLEMENT_OVERRIDES_TABLE);

    return () => {
      isMounted = false;
      console.log("Realtime: Cleaning up Supabase Realtime subscriptions (useEffect cleanup)...");
      if (db && typeof db.removeAllChannels === 'function') {
        console.log("Realtime: Calling db.removeAllChannels() from effect cleanup...");
        db.removeAllChannels()
          .then(statuses => {
            console.log("Realtime: removeAllChannels() completed. Statuses:", statuses);
            if (statuses.some(s => s === 'error')) { 
              console.warn("Realtime: Some channels might not have closed cleanly during removeAllChannels:", statuses);
            }
          })
          .catch(err => {
            console.error("Realtime: Error during db.removeAllChannels():", err?.message || err);
            if (err?.message?.includes("WebSocket is closed")) {
                 console.warn("Realtime: Caught 'WebSocket is closed' during removeAllChannels. This is often due to HMR or rapid unmounts/remounts or actual connection loss before cleanup.");
            }
          })
          .finally(() => {
            console.log("Realtime: Nullifying channel refs in .finally() after removeAllChannels attempt.");
            peopleChannelRef.current = null;
            expensesChannelRef.current = null;
            categoriesChannelRef.current = null;
            settlementPaymentsChannelRef.current = null;
            manualOverridesChannelRef.current = null;
          });
      } else {
        console.warn("Realtime: Supabase client (db) or removeAllChannels not available during cleanup. Manually nullifying refs.");
        peopleChannelRef.current = null;
        expensesChannelRef.current = null;
        categoriesChannelRef.current = null;
        settlementPaymentsChannelRef.current = null;
        manualOverridesChannelRef.current = null;
      }
    };
  }, [db, currentUser, supabaseInitializationError, isDataFetchedAtLeastOnce, userRole, fetchAllData]);
}