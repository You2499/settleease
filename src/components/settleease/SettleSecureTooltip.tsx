"use client";

import React, { useState } from 'react';
import { Shield, Database, Users, Lock, CheckCircle, Key, Mail, UserCheck, RefreshCw, AlertTriangle, Eye, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SettleSecureTooltipProps {
  children: React.ReactNode;
}

export default function SettleSecureTooltip({ children }: SettleSecureTooltipProps) {
  const [showMobileDialog, setShowMobileDialog] = useState(false);

  const securityFeatures = (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 pb-2 border-b border-border">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">SettleSecure Authentication</h3>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start space-x-2">
          <Lock className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Account Hijacking Prevention</p>
            <p className="text-xs text-muted-foreground">Password verification blocks unconfirmed account takeovers</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Smart Google OAuth</p>
            <p className="text-xs text-muted-foreground">Automatic name extraction with secure provider detection</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Mail className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Email Status Verification</p>
            <p className="text-xs text-muted-foreground">Secure RPC functions prevent account enumeration attacks</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Key className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Multi-Factor Ready</p>
            <p className="text-xs text-muted-foreground">TOTP, WebAuthn, and phone verification support built-in</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Row-Level Security (RLS)</p>
            <p className="text-xs text-muted-foreground">Database policies ensure users only access their own data</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Auto Profile Creation</p>
            <p className="text-xs text-muted-foreground">Database triggers create profiles with intelligent name parsing</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <RefreshCw className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Session Management</p>
            <p className="text-xs text-muted-foreground">Secure token refresh with automatic cleanup on logout</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Error Recovery</p>
            <p className="text-xs text-muted-foreground">15+ error scenarios handled with actionable user guidance</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Eye className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Audit Trail</p>
            <p className="text-xs text-muted-foreground">Comprehensive logging of authentication events and user actions</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Users className="h-4 w-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium">Role-Based Access</p>
            <p className="text-xs text-muted-foreground">Dynamic permissions with admin/user role enforcement</p>
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

      {/* Mobile Dialog - Clean design with only close button */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-0"
          hideCloseButton={false}
        >
          {/* Custom header with close button only */}
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">SettleSecure Authentication</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileDialog(false)}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content without additional padding since we handle it in the header */}
          <div className="p-4">
            <div className="space-y-2.5">
              <div className="flex items-start space-x-2">
                <Lock className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Account Hijacking Prevention</p>
                  <p className="text-xs text-muted-foreground">Password verification blocks unconfirmed account takeovers</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Smart Google OAuth</p>
                  <p className="text-xs text-muted-foreground">Automatic name extraction with secure provider detection</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Email Status Verification</p>
                  <p className="text-xs text-muted-foreground">Secure RPC functions prevent account enumeration attacks</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Key className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Multi-Factor Ready</p>
                  <p className="text-xs text-muted-foreground">TOTP, WebAuthn, and phone verification support built-in</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Row-Level Security (RLS)</p>
                  <p className="text-xs text-muted-foreground">Database policies ensure users only access their own data</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <UserCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Auto Profile Creation</p>
                  <p className="text-xs text-muted-foreground">Database triggers create profiles with intelligent name parsing</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <RefreshCw className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Session Management</p>
                  <p className="text-xs text-muted-foreground">Secure token refresh with automatic cleanup on logout</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Error Recovery</p>
                  <p className="text-xs text-muted-foreground">15+ error scenarios handled with actionable user guidance</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Eye className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Audit Trail</p>
                  <p className="text-xs text-muted-foreground">Comprehensive logging of authentication events and user actions</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Users className="h-4 w-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Role-Based Access</p>
                  <p className="text-xs text-muted-foreground">Dynamic permissions with admin/user role enforcement</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}