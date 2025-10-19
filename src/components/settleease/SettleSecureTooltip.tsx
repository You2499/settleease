"use client";

import React, { useState } from 'react';
import { Shield, Database, Zap, Calculator, Users, Lock, CheckCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SettleSecureTooltipProps {
  children: React.ReactNode;
}

export default function SettleSecureTooltip({ children }: SettleSecureTooltipProps) {
  const [showMobileDialog, setShowMobileDialog] = useState(false);

  const securityFeatures = (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 pb-2 border-b border-border">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">SettleSecure Protection</h3>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start space-x-2">
          <Lock className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Anti-Hijacking Protection</p>
            <p className="text-xs text-muted-foreground">Password verification prevents unconfirmed account takeovers</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Smart OAuth Integration</p>
            <p className="text-xs text-muted-foreground">Google account detection with automatic name parsing</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Database className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Row-Level Security (RLS)</p>
            <p className="text-xs text-muted-foreground">Database-level isolation ensures you only see your group's data</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Tamper-Proof Calculations</p>
            <p className="text-xs text-muted-foreground">Complex split algorithms & settlement math verified server-side</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Real-time Sync Protection</p>
            <p className="text-xs text-muted-foreground">Live data updates with secure WebSocket connections</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Smart Access Controls</p>
            <p className="text-xs text-muted-foreground">Role-based permissions with dynamic feature flags per user</p>
          </div>
        </div>
      </div>
    </div>
  );

  const handleMobileClick = () => {
    setShowMobileDialog(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={handleMobileClick}
              className="cursor-pointer"
            >
              {children}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs p-4 bg-background border border-border shadow-lg hidden md:block"
            sideOffset={8}
          >
            {securityFeatures}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Mobile Dialog */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>SettleSecure Protection</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {securityFeatures}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}