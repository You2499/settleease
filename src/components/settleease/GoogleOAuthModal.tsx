"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, UserPlus, LogIn, HandCoins } from 'lucide-react';
import { GoogleMark } from './BrandAssets';

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
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
            <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto overflow-x-hidden sm:max-w-md" hideCloseButton={true}>
                <div className={`relative -m-6 rounded-[1.35rem] border border-border bg-card p-6 shadow-xl transition-opacity duration-200 ${isLoading ? 'opacity-75' : 'opacity-100'}`}>
                    <DialogHeader className="pb-5">
                        <DialogTitle className="flex items-center justify-center gap-3 text-xl font-light tracking-tight">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/60">
                                <HandCoins className="h-5 w-5 text-foreground" />
                            </span>
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
                                <GoogleMark size={22} />
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="overflow-hidden rounded-2xl border border-border bg-muted/35">
                            <div className="flex items-center gap-2 border-b border-border/70 bg-background/70 px-4 py-3">
                                <AlertTriangle className="h-4 w-4 text-foreground" />
                                <span className="text-sm font-medium text-foreground">
                                    Important notice
                                </span>
                            </div>
                            <div className="px-4 py-3">
                                <p className="text-sm leading-6 text-muted-foreground">
                                    Google Sign-In will automatically create a new account if you do not already have one with SettleEase.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-border bg-background/80">
                            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-3">
                                <CheckCircle className="h-4 w-4 text-foreground" />
                                <span className="text-sm font-medium text-foreground">
                                    What happens next?
                                </span>
                            </div>
                            <div className="space-y-1 px-4 py-3">
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
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2 pt-4">
                        <Button
                            className={`h-11 w-full rounded-full border text-sm transition-all duration-200 sm:text-base ${
                                isLoading
                                    ? 'cursor-not-allowed border-border bg-muted text-muted-foreground hover:bg-muted'
                                    : 'border-border bg-background text-foreground hover:bg-muted'
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
                        <Button
                            variant="outline"
                            className="h-11 w-full rounded-full text-sm sm:text-base"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
