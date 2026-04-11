"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useConvexData } from "@/hooks/useConvexData";

export default function ConvexSmokeTestPage() {
  const {
    currentUser,
    isLoadingAuth,
    supabaseInitializationError,
  } = useSupabaseAuth();
  const { userProfile, isLoadingProfile } = useUserProfile(currentUser);
  const userRole = currentUser ? userProfile?.role || "user" : null;
  const data = useConvexData(currentUser, userRole, isLoadingAuth, isLoadingProfile);
  const health = useQuery(api.app.health, {});

  const checks = useMemo(() => [
    {
      label: "Supabase Auth",
      ok: !supabaseInitializationError && !isLoadingAuth,
      detail: currentUser ? `Signed in as ${currentUser.email}` : "No active session",
    },
    {
      label: "Convex Health",
      ok: !!health?.ok,
      detail: health?.checkedAt ? `Checked ${new Date(health.checkedAt).toLocaleTimeString()}` : "Checking...",
    },
    {
      label: "Convex Profile",
      ok: !!userProfile,
      detail: userProfile ? `Role: ${userProfile.role}` : "Profile not loaded",
    },
    {
      label: "Live Data",
      ok: data.isDataFetchedAtLeastOnce,
      detail: `${data.people.length} people, ${data.expenses.length} expenses, ${data.categories.length} categories`,
    },
  ], [currentUser, data.categories.length, data.expenses.length, data.isDataFetchedAtLeastOnce, data.people.length, health, isLoadingAuth, supabaseInitializationError, userProfile]);

  return (
    <main className="min-h-screen bg-background p-6">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Convex Smoke Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">{check.label}</div>
                <div className="text-sm text-muted-foreground">{check.detail}</div>
              </div>
              <Badge variant={check.ok ? "outline" : "secondary"}>
                {check.ok ? "OK" : "Pending"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
