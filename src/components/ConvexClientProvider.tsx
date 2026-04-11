"use client";

import * as React from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { supabaseAnonKey, supabaseUrl } from "@/lib/settleease/constants";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || "https://shocking-panda-595.convex.cloud";

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function useSupabaseConvexAuth() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchAccessToken = React.useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!supabase) return null;

      if (forceRefreshToken) {
        const { data } = await supabase.auth.refreshSession();
        setSession(data.session ?? null);
        return data.session?.access_token ?? null;
      }

      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      return data.session?.access_token ?? null;
    },
    [],
  );

  return {
    isLoading,
    isAuthenticated: !!session,
    fetchAccessToken,
  };
}

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  if (!convex) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSupabaseConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
