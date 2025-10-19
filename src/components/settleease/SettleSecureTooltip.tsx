"use client";

import React from 'react';
import { Shield, Lock, Eye, Zap, CheckCircle, Users } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettleSecureTooltipProps {
  children: React.ReactNode;
}

export default function SettleSecureTooltip({ children }: SettleSecureTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-4 bg-background border border-border shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">SettleSecure Features</h3>
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-start space-x-2">
                <Lock className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">End-to-End Encryption</p>
                  <p className="text-xs text-muted-foreground">Your financial data is encrypted at rest and in transit</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Privacy First</p>
                  <p className="text-xs text-muted-foreground">We never sell your data or share it with third parties</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Secure Authentication</p>
                  <p className="text-xs text-muted-foreground">Multi-factor authentication and OAuth integration</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Real-time Security</p>
                  <p className="text-xs text-muted-foreground">Continuous monitoring and threat detection</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Group Privacy</p>
                  <p className="text-xs text-muted-foreground">Granular permissions and access controls</p>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}