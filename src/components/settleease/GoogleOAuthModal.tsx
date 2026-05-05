"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, UserPlus, LogIn, HandCoins } from 'lucide-react';
import { GoogleMark } from './BrandAssets';
import SettleEaseDialog, {
    SettleEaseModalBody,
    SettleEaseModalFooter,
    SettleEaseModalHeader,
    SettleEaseModalNotice,
    SettleEaseModalSection,
} from './SettleEaseDialog';

interface GoogleOAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSignIn: boolean;
    isLoading?: boolean;
}

export default function GoogleOAuthModal({
    isOpen,
    onClose,
    onConfirm,
    isSignIn,
    isLoading = false
}: GoogleOAuthModalProps) {
    return (
        <SettleEaseDialog
            open={isOpen}
            onOpenChange={(open) => !open && !isLoading && onClose()}
            hideCloseButton
            className="sm:max-w-md"
        >
            <div className={`flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col transition-opacity duration-200 ${isLoading ? 'opacity-75' : 'opacity-100'}`}>
                <SettleEaseModalHeader
                    icon={HandCoins}
                    title="Continue with Google"
                    description="SettleEase will use Google for this authentication step."
                    accessory={<GoogleMark size={24} />}
                />

                <SettleEaseModalBody className="space-y-3">
                    <SettleEaseModalNotice tone="warning" className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            Google Sign-In will automatically create a new account if you do not already have one with SettleEase.
                        </span>
                    </SettleEaseModalNotice>

                    <SettleEaseModalSection>
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                            <CheckCircle className="h-4 w-4" />
                            What happens next?
                        </div>
                        <div className="space-y-1">
                                {isSignIn ? (
                                    <>
                                        <div className="flex items-center gap-3 rounded-xl py-2">
                                            <LogIn className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    If you have an account
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    You will be signed in immediately
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-xl py-2">
                                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    If you do not have an account
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    A new account will be created automatically
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 rounded-xl py-2">
                                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    Create new account
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Sign up with your Google account
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 rounded-xl py-2">
                                            <LogIn className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    If account exists
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    You will be signed in instead
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                        </div>
                    </SettleEaseModalSection>
                </SettleEaseModalBody>

                <SettleEaseModalFooter className="sm:justify-end">
                    <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                        <Button
                            variant="outline"
                            className="h-10 w-full rounded-full text-sm sm:w-auto"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            className={`h-10 w-full rounded-full border text-sm transition-all duration-200 sm:w-auto ${
                                isLoading
                                    ? 'cursor-not-allowed border-border bg-muted text-muted-foreground hover:bg-muted'
                                    : 'border-foreground bg-foreground text-background hover:bg-foreground/90'
                            }`}
                            onClick={onConfirm}
                            disabled={isLoading}
                        >
                            <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                                <GoogleMark size={22} />
                            </div>
                            <span className="ml-2.5">
                                {isLoading ? "Redirecting to Google..." : "Continue with Google"}
                            </span>
                        </Button>
                    </div>
                </SettleEaseModalFooter>
            </div>
        </SettleEaseDialog>
    );
}
