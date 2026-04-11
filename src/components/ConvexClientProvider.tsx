"use client";

import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { getConvexUrl } from "@/lib/settleease/convexUrl";
import { supabaseClient as supabase } from "@/lib/settleease/supabaseClient";

const convex = new ConvexReactClient(getConvexUrl());

function useSupabaseMintedConvexAuth() {
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

      const { data } = forceRefreshToken
        ? await supabase.auth.refreshSession()
        : await supabase.auth.getSession();

      const nextSession = data.session ?? null;
      setSession(nextSession);

      if (!nextSession?.access_token) return null;

      const response = await fetch("/api/convex-token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nextSession.access_token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to mint Convex auth token:", await response.text());
        return null;
      }

      const body = (await response.json()) as { token?: string };
      return body.token ?? null;
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
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSupabaseMintedConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
