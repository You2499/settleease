"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import { USER_PROFILES_TABLE, supabaseUrl, supabaseAnonKey } from '@/lib/settleease';
import type { UserRole } from '@/lib/settleease';

let db: SupabaseClient | undefined;
let supabaseInitializationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseInitializationError = "Supabase URL or Anon Key is missing. Check environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  console.error(supabaseInitializationError);
} else {
  try {
    db = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error: any) {
    console.error("Error initializing Supabase client:", error);
    supabaseInitializationError = `Supabase Client Initialization Error: ${error.message || "Could not initialize Supabase."}. Ensure your Supabase credentials are correct and the service is reachable.`;
  }
}

export function useSupabaseAuth() {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingRole, setIsLoadingRole] = useState(false);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    if (!db || !userId) return 'user';
    
    try {
      const { data, error } = await db
        .from(USER_PROFILES_TABLE)
        .select('role, first_name, last_name')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn(
            `User profile or role not found for ${userId} (PGRST116). Defaulting to 'user' role. This is normal and often temporary for new users as their profile (with role) is being created by a database trigger. If persistent, ensure the trigger 'on_auth_user_created' is correctly populating '${USER_PROFILES_TABLE}'.`
          );
          return 'user';
        }
        let errorDetails = '';
        try {
          errorDetails = JSON.stringify(error);
        } catch (e) {
          errorDetails = 'Error object could not be stringified.';
        }
        console.error(
          `Error fetching user role (userId: ${userId}): Details: ${errorDetails}. Raw error object:`, error,
          `Defaulting to 'user' role. This strongly suggests an RLS misconfiguration on the '${USER_PROFILES_TABLE}' table. ` +
          `Ensure a RLS policy exists and is enabled, like: "CREATE POLICY \\"Users can view their own profile\\" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);"`
        );
        return 'user';
      }
      return data?.role as UserRole || 'user';
    } catch (e: any) {
      let exceptionDetails = '';
      try {
        exceptionDetails = JSON.stringify(e);
      } catch (stringifyError) {
        exceptionDetails = 'Exception object could not be stringified.';
      }
      console.error(
        `Catch: Unhandled exception while fetching user role (userId: ${userId}): Details: ${exceptionDetails}. Raw exception:`, e,
        "Defaulting to 'user' role."
      );
      return 'user';
    }
  }, []);

  const handleLogout = async () => {
    if (!db) return;
    const { error } = await db.auth.signOut();
    if (error) {
      if (error.message === "Auth session missing!") {
        console.warn("Logout attempt: Auth session was already missing or token was invalid. Forcing local currentUser to null.");
        setCurrentUser(null);
      } else {
        toast({ title: "Logout Error", description: error.message, variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    console.log("Auth effect: Starts. Supabase Client:", !!db, "Supabase Init Error:", !!supabaseInitializationError);
    if (supabaseInitializationError || !db) {
      console.log("Auth effect: Supabase init error or no DB. Setting isLoadingAuth=false.");
      setIsLoadingAuth(false);
      return;
    }

    let isMounted = true;

    console.log("Auth effect: Setting up onAuthStateChange listener.");
    const { data: authListener } = db.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        console.log("Auth effect: onAuthStateChange triggered. Event:", _event, "Session:", !!session, "Mounted:", isMounted);
        if (isMounted) {
          const newAuthUser = session?.user ?? null;
          
          setCurrentUser(prevLocalUser => { 
            if ((newAuthUser?.id !== prevLocalUser?.id) || (newAuthUser === null && prevLocalUser !== null) || (newAuthUser !== null && prevLocalUser === null) ) {
                console.log("Auth effect: onAuthStateChange - User state changed via functional update. Updating currentUser.");
                if (!newAuthUser) {
                  setUserRole(null);
                }
                return newAuthUser;
            }
            return prevLocalUser; 
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
    db.auth.getSession().then(({ data: { session } }) => {
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

  // Effect for fetching user role
  useEffect(() => {
    let isMounted = true;
    console.log("User Role Effect: Starts. isLoadingAuth:", isLoadingAuth, "currentUser:", !!currentUser, "userRole:", userRole);
  
    if (isLoadingAuth) {
      console.log("User Role Effect: Still loading auth, skipping.");
      return;
    }
  
    if (currentUser) {
      if (!userRole) {
        console.log("User Role Effect: currentUser exists, userRole not set. Fetching role.");
        setIsLoadingRole(true);
        fetchUserRole(currentUser.id).then(fetchedRole => {
          if (!isMounted) {
            console.log("User Role Effect: fetchUserRole - Component unmounted.");
            setIsLoadingRole(false);
            return;
          }
          console.log("User Role Effect: fetchUserRole - Role fetched:", fetchedRole);
          setUserRole(fetchedRole);
          setIsLoadingRole(false);
        });
      }
    } else { 
      console.log("User Role Effect: No currentUser. Resetting role.");
      setUserRole(null);
      setIsLoadingRole(false);
    }
    
    return () => {
      console.log("User Role Effect: Cleanup. isMounted=false.");
      isMounted = false;
    };
  }, [currentUser, isLoadingAuth, userRole, fetchUserRole]);

  return {
    db,
    supabaseInitializationError,
    currentUser,
    userRole,
    isLoadingAuth,
    isLoadingRole,
    handleLogout,
  };
}