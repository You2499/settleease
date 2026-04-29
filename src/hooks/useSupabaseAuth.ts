"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from "@/hooks/use-toast";
import { supabaseClient, supabaseInitializationError } from '@/lib/settleease/supabaseClient';
import {
  developmentSupabaseUser,
  isLocalDevelopmentEnvironment,
} from '@/lib/settleease/developmentAuth';
import {
  createLogoutMessage,
  parseLogoutMessage,
  SETTLEEASE_AUTH_LOGOUT_CHANNEL,
  SETTLEEASE_AUTH_LOGOUT_STORAGE_KEY,
  shouldApplyLogoutMessage,
} from '@/lib/settleease/authFlow';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

function getAuthProcessedKey(userId: string, session: Session) {
  return `auth_processed_${userId}_${session.expires_at ?? 'session'}`;
}

function clearStoredAuthState() {
  if (typeof window === 'undefined') return;

  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Could not clear localStorage:', error);
  }

  try {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key.startsWith('auth_processed_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Could not clear sessionStorage:', error);
  }
}

function clearAuthUrlState() {
  if (typeof window === 'undefined') return;

  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch (error) {
    console.warn('Could not clear URL params:', error);
  }
}

export function useSupabaseAuth() {
  const isDevelopmentEnvironment = isLocalDevelopmentEnvironment();
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(
    isDevelopmentEnvironment ? developmentSupabaseUser : null,
  );
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isDevelopmentEnvironment ? 'authenticated' : 'checking',
  );
  const authStatusRef = useRef<AuthStatus>(
    isDevelopmentEnvironment ? 'authenticated' : 'checking',
  );
  const currentUserRef = useRef<SupabaseUser | null>(
    isDevelopmentEnvironment ? developmentSupabaseUser : null,
  );
  const hasShownLogoutToastRef = useRef(false);
  const lastHandledLogoutIssuedAtRef = useRef(0);
  const lastSessionKeyRef = useRef<string | null>(null);
  const logoutChannelRef = useRef<BroadcastChannel | null>(null);
  const markSignIn = useMutation(api.app.markSignIn);
  const isLoadingAuth = authStatus === 'checking';

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const setAuthStatusAndRef = useCallback((status: AuthStatus) => {
    authStatusRef.current = status;
    setAuthStatus(status);
  }, []);

  const showLoggedOutToastOnce = useCallback(() => {
    if (hasShownLogoutToastRef.current) return;
    hasShownLogoutToastRef.current = true;
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  }, []);

  const applySignedOut = useCallback((options?: { clearStorage?: boolean; showToast?: boolean }) => {
    const hadUser = !!currentUserRef.current || authStatusRef.current === 'authenticated';

    currentUserRef.current = null;
    lastSessionKeyRef.current = 'signed-out';
    setCurrentUser(null);
    setAuthStatusAndRef('unauthenticated');

    if (options?.clearStorage) {
      clearStoredAuthState();
      clearAuthUrlState();
    }

    if (options?.showToast && hadUser) {
      showLoggedOutToastOnce();
    }
  }, [setAuthStatusAndRef, showLoggedOutToastOnce]);

  const applySession = useCallback((session: Session | null) => {
    const newAuthUser = session?.user ?? null;
    const sessionKey = newAuthUser
      ? `${newAuthUser.id}:${session?.access_token ?? 'session'}`
      : 'signed-out';

    if (lastSessionKeyRef.current === sessionKey && authStatusRef.current !== 'checking') {
      return;
    }

    lastSessionKeyRef.current = sessionKey;
    currentUserRef.current = newAuthUser;
    setCurrentUser(prevUser => {
      if (prevUser?.id === newAuthUser?.id) return prevUser;
      return newAuthUser;
    });
    setAuthStatusAndRef(newAuthUser ? 'authenticated' : 'unauthenticated');

    if (newAuthUser) {
      hasShownLogoutToastRef.current = false;
    }
  }, [setAuthStatusAndRef]);

  const markSignInWithRetry = useCallback(async (newAuthUser: SupabaseUser) => {
    const fullName = newAuthUser.user_metadata?.full_name || newAuthUser.user_metadata?.name || '';
    const firstName = fullName ? String(fullName).split(' ')[0] : undefined;
    const lastName = fullName ? String(fullName).split(' ').slice(1).join(' ') || undefined : undefined;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await markSignIn({
          supabaseUserId: newAuthUser.id,
          email: newAuthUser.email || undefined,
          firstName,
          lastName,
        });
        return true;
      } catch (err) {
        if (attempt === 2) {
          console.error('Error updating Convex sign-in flags:', err);
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }

    return false;
  }, [markSignIn]);

  const maybeTrackSignIn = useCallback((event: AuthChangeEvent, session: Session | null) => {
    const newAuthUser = session?.user ?? null;
    if (!newAuthUser || !session) return;

    const hasOAuthHash = typeof window !== 'undefined' && window.location.hash.includes('access_token');

    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (event !== 'SIGNED_IN' && !hasOAuthHash) return;

    const sessionKey = getAuthProcessedKey(newAuthUser.id, session);
    let hasProcessedThisSession = false;

    if (typeof window !== 'undefined') {
      try {
        hasProcessedThisSession = sessionStorage.getItem(sessionKey) === 'true';
      } catch {
        hasProcessedThisSession = false;
      }
    }

    if (hasProcessedThisSession) return;

    void markSignInWithRetry(newAuthUser).then((success) => {
      if (!success || typeof window === 'undefined') return;

      try {
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.warn('Could not set sessionStorage:', error);
      }
    });
  }, [markSignInWithRetry]);

  const broadcastLogout = useCallback((userId?: string | null) => {
    if (typeof window === 'undefined') return;

    const message = createLogoutMessage(userId);
    lastHandledLogoutIssuedAtRef.current = message.issuedAt;

    try {
      logoutChannelRef.current?.postMessage(message);
    } catch (error) {
      console.warn('Could not broadcast logout via BroadcastChannel:', error);
    }

    try {
      localStorage.setItem(SETTLEEASE_AUTH_LOGOUT_STORAGE_KEY, JSON.stringify(message));
    } catch (error) {
      console.warn('Could not broadcast logout via localStorage:', error);
    }
  }, []);

  const applyExternalLogout = useCallback((rawMessage: unknown) => {
    const message = parseLogoutMessage(rawMessage);
    if (!shouldApplyLogoutMessage({
      currentUserId: currentUserRef.current?.id ?? null,
      lastHandledIssuedAt: lastHandledLogoutIssuedAtRef.current,
      message,
    })) {
      return;
    }

    lastHandledLogoutIssuedAtRef.current = message!.issuedAt;

    void supabaseClient?.auth.signOut({ scope: 'local' }).catch((error) => {
      if (error?.message !== 'Auth session missing!') {
        console.warn('Could not apply local sign-out after logout broadcast:', error);
      }
    });

    applySignedOut({ clearStorage: true, showToast: true });
  }, [applySignedOut]);

  const handleLogout = useCallback(async () => {
    if (isDevelopmentEnvironment) return;

    if (!supabaseClient) return;

    const userId = currentUserRef.current?.id ?? null;
    broadcastLogout(userId);
    
    try {
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        if (error.message === "Auth session missing!") {
          console.warn("Logout attempt: Auth session was already missing or token was invalid. Forcing local currentUser to null.");
        } else {
          console.error("Logout error:", error);
          toast({ title: "Logout Error", description: error.message, variant: "destructive" });
        }
      }
    } catch (err: any) {
      console.error("Unexpected error during logout:", err);
    } finally {
      applySignedOut({ clearStorage: true, showToast: true });
    }
  }, [applySignedOut, broadcastLogout, isDevelopmentEnvironment]);

  useEffect(() => {
    if (isDevelopmentEnvironment) return;
    if (typeof window === 'undefined') return;

    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(SETTLEEASE_AUTH_LOGOUT_CHANNEL)
      : null;

    logoutChannelRef.current = channel;

    const handleChannelMessage = (event: MessageEvent) => {
      applyExternalLogout(event.data);
    };

    const handleStorageMessage = (event: StorageEvent) => {
      if (event.key === SETTLEEASE_AUTH_LOGOUT_STORAGE_KEY && event.newValue) {
        applyExternalLogout(event.newValue);
      }
    };

    channel?.addEventListener('message', handleChannelMessage);
    window.addEventListener('storage', handleStorageMessage);

    return () => {
      channel?.removeEventListener('message', handleChannelMessage);
      channel?.close();
      if (logoutChannelRef.current === channel) {
        logoutChannelRef.current = null;
      }
      window.removeEventListener('storage', handleStorageMessage);
    };
  }, [applyExternalLogout, isDevelopmentEnvironment]);

  useEffect(() => {
    if (isDevelopmentEnvironment) {
      currentUserRef.current = developmentSupabaseUser;
      setCurrentUser(developmentSupabaseUser);
      setAuthStatusAndRef('authenticated');
      return;
    }

    console.log("Auth effect: Starts. Supabase Client:", !!supabaseClient, "Supabase Init Error:", !!supabaseInitializationError);
    if (supabaseInitializationError || !supabaseClient) {
      console.log("Auth effect: Supabase init error or no auth client. Setting isLoadingAuth=false.");
      setAuthStatusAndRef('unauthenticated');
      return;
    }

    let isMounted = true;

    console.log("Auth effect: Setting up onAuthStateChange listener.");
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        console.log("Auth effect: onAuthStateChange triggered. Event:", event, "Session:", !!session, "Mounted:", isMounted);
        if (!isMounted) {
          console.log("Auth effect: onAuthStateChange - Component unmounted, ignoring event.");
          return;
        }

        if (event === 'SIGNED_OUT') {
          applySignedOut({ clearStorage: true, showToast: true });
          return;
        }

        maybeTrackSignIn(event, session);
        applySession(session ?? null);
      }, 0);
    });
    
    console.log("Auth effect: Attempting to recover session.");
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      console.log("Auth effect: getSession returned. Session:", !!session, "Mounted:", isMounted);
      if (isMounted) {
        applySession(session ?? null);
      }
    }).catch(err => {
      if(isMounted) {
        console.warn("Auth effect: Error in getSession:", err.message);
        applySignedOut({ clearStorage: false, showToast: false });
      }
    });

    return () => {
      console.log("Auth effect: Cleanup. Unsubscribing auth listener. isMounted=false.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [applySession, applySignedOut, isDevelopmentEnvironment, maybeTrackSignIn, setAuthStatusAndRef]);

  return {
    authStatus,
    supabaseClient: isDevelopmentEnvironment ? undefined : supabaseClient,
    supabaseInitializationError: isDevelopmentEnvironment ? null : supabaseInitializationError,
    currentUser,
    isLoadingAuth,
    handleLogout,
    isDevelopmentEnvironment,
  };
}
