"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from 'lucide-react';
import type { ActiveView } from '@/lib/settleease';
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from './SkeletonLayouts';

interface SettingsTabProps {
  onNavigate: (view: ActiveView) => void;
}

export function SettingsTabSkeleton() {
  return (
    <LoadingRegion label="Loading settings" className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full max-w-[260px]" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-4 h-4 w-full max-w-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </LoadingRegion>
  );
}

export default function SettingsTab({ onNavigate }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display-section mb-2">Settings</h1>
        <p className="text-body-standard text-muted-foreground">
          Manage system settings and exports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Export Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onNavigate('exportExpense')}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Export Data</CardTitle>
                <CardDescription className="text-caption">
                  Download expense reports and summaries
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-body-standard text-muted-foreground mb-4">
              Export your expense data as PDF reports for personal records or group sharing.
            </p>
            <Button variant="outline" className="w-full">
              Open Export Tool
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
