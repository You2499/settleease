
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Settings as SettingsIcon, Bell, Download, Trash2, ShieldCheck, Palette } from 'lucide-react';
import { useTheme } from "next-themes";
import type { UserRole } from '@/lib/settleease/types';

interface SettingsTabProps {
  currentUserEmail?: string;
  userRole?: UserRole;
  // Add any other props needed for settings, e.g., current settings values
}

export default function SettingsTab({ currentUserEmail, userRole }: SettingsTabProps) {
  const { theme, setTheme } = useTheme();
  // Placeholder states for UI interaction - in a real app, these would come from a settings store/context
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [settlementReminders, setSettlementReminders] = useState(true);
  const [dataDensity, setDataDensity] = useState("compact"); // example: compact, comfortable

  // This would ideally be fetched or passed in
  const appVersion = "1.0.0"; 
  const lastBackupDate = "Not Implemented"; 

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of SettleEase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme-select" className="text-sm font-medium">Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme-select" className="mt-1 w-full sm:w-[200px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><div className="flex items-center"><Sun className="mr-2 h-4 w-4"/>Light</div></SelectItem>
                <SelectItem value="dark"><div className="flex items-center"><Moon className="mr-2 h-4 w-4"/>Dark</div></SelectItem>
                <SelectItem value="system"><div className="flex items-center"><SettingsIcon className="mr-2 h-4 w-4"/>System</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="data-density-select" className="text-sm font-medium">Data Density (UI Placeholder)</Label>
            <Select value={dataDensity} onValueChange={setDataDensity}>
              <SelectTrigger id="data-density-select" className="mt-1 w-full sm:w-[200px]">
                <SelectValue placeholder="Select density" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Adjust how much information is shown on screen (feature not yet implemented).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive notifications (UI Placeholders - not functional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Email for New Expenses</span>
              <span className="text-xs text-muted-foreground">Receive an email when a new expense is added by others.</span>
            </Label>
            <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="settlement-reminders" className="flex flex-col space-y-1">
              <span className="text-sm font-medium">Settlement Reminders</span>
              <span className="text-xs text-muted-foreground">Get reminders for pending settlements.</span>
            </Label>
            <Switch id="settlement-reminders" checked={settlementReminders} onCheckedChange={setSettlementReminders} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Download className="mr-2 h-5 w-5 text-primary"/> Data Management</CardTitle>
          <CardDescription>Export your data or manage backups (UI Placeholders - not functional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4"/> Export All Data (CSV)</Button>
          <p className="text-xs text-muted-foreground">Last backup: {lastBackupDate}. Backups are automatic (feature not yet implemented).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary"/> Account Settings</CardTitle>
          <CardDescription>Manage your account details and security (UI Placeholders - not functional).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUserEmail && <p className="text-sm">Logged in as: <span className="font-medium">{currentUserEmail}</span></p>}
          {userRole && <p className="text-sm">Your role: <span className="font-medium capitalize">{userRole}</span></p>}
          <Button variant="outline" className="w-full sm:w-auto">Change Password</Button>
          <Button variant="destructive" className="w-full sm:w-auto"><Trash2 className="mr-2 h-4 w-4"/> Delete Account</Button>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><SettingsIcon className="mr-2 h-5 w-5 text-primary"/> About</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>SettleEase Application</p>
          <p>Version: {appVersion}</p>
          <p>&copy; {new Date().getFullYear()} Your Name/Company. All rights reserved.</p>
        </CardContent>
      </Card>
    </div>
  );
}
