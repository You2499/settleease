"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./constants";
import { isLocalDevelopmentEnvironment } from "./developmentAuth";

export let supabaseClient: SupabaseClient | undefined;
export let supabaseInitializationError: string | null = null;

const customDynamicStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    const persist = window.localStorage.getItem('settleease_remember_me') === 'true';
    return persist ? window.localStorage.getItem(key) : window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    const persist = window.localStorage.getItem('settleease_remember_me') === 'true';
    if (persist) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseInitializationError = "Supabase URL or Anon Key is missing. Check environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  if (isLocalDevelopmentEnvironment()) {
    supabaseInitializationError = null;
  } else {
    console.error(supabaseInitializationError);
  }
} else {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storage: customDynamicStorage,
      },
    });
  } catch (error: any) {
    console.error("Error initializing Supabase client:", error);
    supabaseInitializationError = `Supabase Client Initialization Error: ${error.message || "Could not initialize Supabase."}. Ensure your Supabase credentials are correct and the service is reachable.`;
  }
}
