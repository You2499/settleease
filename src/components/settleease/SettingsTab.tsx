"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from 'lucide-react';
import type { ActiveView } from '@/lib/settleease';

interface SettingsTabProps {
  onNavigate: (view: ActiveView) => void;
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
