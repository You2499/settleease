"use client";

import { useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from "@/hooks/use-toast";
import { supabaseClient, supabaseInitializationError } from '@/lib/settleease/supabaseClient';

export function useSupabaseAuth() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const markSignIn = useMutation(api.app.markSignIn);

  const handleLogout = async () => {
    if (!supabaseClient) return;
    
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
      
      // Always clear local state regardless of error to ensure logout on mobile
      setCurrentUser(null);
      
      // Clear any stored session data (Safari-safe)
      if (typeof window !== 'undefined') {
        try {
          // Clear localStorage and sessionStorage for Supabase
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Could not clear localStorage:', e);
        }
        
        try {
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase') || key.startsWith('auth_processed_')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Could not clear sessionStorage:', e);
        }
        
        // Clear URL params
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch (e) {
          console.warn('Could not clear URL params:', e);
        }
      }
      
    } catch (err: any) {
      console.error("Unexpected error during logout:", err);
      // Force logout even if there's an error
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    console.log("Auth effect: Starts. Supabase Client:", !!supabaseClient, "Supabase Init Error:", !!supabaseInitializationError);
    if (supabaseInitializationError || !supabaseClient) {
      console.log("Auth effect: Supabase init error or no auth client. Setting isLoadingAuth=false.");
      setIsLoadingAuth(false);
      return;
    }

    let isMounted = true;

    console.log("Auth effect: Setting up onAuthStateChange listener.");
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => {
        console.log("Auth effect: onAuthStateChange triggered. Event:", _event, "Session:", !!session, "Mounted:", isMounted);
        if (isMounted) {
          const newAuthUser = session?.user ?? null;
          
          // Clean up URL hash fragments after successful authentication
          if (newAuthUser && typeof window !== 'undefined' && window.location.hash) {
            console.log("Auth effect: Cleaning up URL hash fragment after successful authentication");
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          
          // Track sign-in event in Convex (NO toasts here - page.tsx handles all toasts)
          const prevLocalUser = currentUser;
          
          // Check if this is a fresh sign-in or just a page refresh
          // Use sessionStorage to track if we've already processed this session
          // Safari-safe: wrap in try-catch for private browsing mode
          let hasProcessedThisSession = false;
          const sessionKey = `auth_processed_${newAuthUser?.id}`;
          
          if (typeof window !== 'undefined' && newAuthUser) {
            try {
              hasProcessedThisSession = sessionStorage.getItem(sessionKey) === 'true';
            } catch (e) {
              // Safari private browsing or storage disabled - fallback to checking if SIGNED_IN event
              // In this case, we'll rely on the event type to determine if it's a fresh sign-in
              console.warn('SessionStorage not available, using event-based detection');
              hasProcessedThisSession = _event !== 'SIGNED_IN';
            }
          }
          
          // Only set flag on actual NEW sign-ins (not page refreshes)
          // Conditions:
          // 1. New user exists
          // 2. No previous user in state (transition from logged out to logged in)
          // 3. Haven't processed this session yet (prevents flag being set on refresh)
          if (newAuthUser && !prevLocalUser && !hasProcessedThisSession) {
            // Mark this session as processed (Safari-safe)
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(sessionKey, 'true');
              } catch (e) {
                console.warn('Could not set sessionStorage:', e);
              }
            }
            
            try {
              const fullName = newAuthUser.user_metadata?.full_name || newAuthUser.user_metadata?.name || '';
              const firstName = fullName ? String(fullName).split(' ')[0] : undefined;
              const lastName = fullName ? String(fullName).split(' ').slice(1).join(' ') || undefined : undefined;

              await markSignIn({
                supabaseUserId: newAuthUser.id,
                email: newAuthUser.email || undefined,
                firstName,
                lastName,
              });
            } catch (err) {
              console.error('Error updating Convex sign-in flags:', err);
            }
          }
          
          setCurrentUser(prevUser => { 
            if ((newAuthUser?.id !== prevUser?.id) || (newAuthUser === null && prevUser !== null) || (newAuthUser !== null && prevUser === null) ) {
                console.log("Auth effect: onAuthStateChange - User state changed via functional update. Updating currentUser.");
                
                return newAuthUser;
            }
            return prevUser; 
          });

          if (!newAuthUser) { 
            console.log("Auth effect: onAuthStateChange - No newAuthUser. Clearing data (will be handled by User Role & Data Effect).");
            if (_event === "SIGNED_OUT") {
              toast({ title: "Logged Out", description: "You have been successfully logged out." });
            }
          }
          
          console.log("Auth effect: onAuthStateChange - Setting isLoadingAuth=false.");
          setIsLoadingAuth(false); 
        } else {
          console.log("Auth effect: onAuthStateChange - Component unmounted, ignoring event.");
        }
      }, 0);
    });
    
    console.log("Auth effect: Attempting to get session as a secondary check/optimization.");
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      console.log("Auth effect: getSession returned. Session:", !!session, "Mounted:", isMounted);
    }).catch(err => {
        if(isMounted) {
            console.warn("Auth effect: Error in getSession:", err.message);
        }
    });

    return () => {
      console.log("Auth effect: Cleanup. Unsubscribing auth listener. isMounted=false.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return {
    supabaseClient,
    supabaseInitializationError,
    currentUser,
    isLoadingAuth,
    handleLogout,
  };
}
