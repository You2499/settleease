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
    // Debug logging
    console.log("GoogleOAuthModal render:", { isOpen, isLoading, isSignIn });
    
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden" hideCloseButton={true}>
                <div className={`bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6 transition-opacity duration-200 ${isLoading ? 'opacity-75' : 'opacity-100'}`}>
                    <div>
                        <DialogHeader className="pb-4">
                            <DialogTitle className="flex items-center justify-center space-x-3 text-lg font-semibold">
                                <HandCoins className="h-6 w-6 text-primary" />
                                <GoogleMark size={24} />
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3">
                            {/* Warning Section */}
                            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#ff7825]/30 dark:border-[#ff7825]/20 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-[#FBBC05]/10 dark:bg-[#FBBC05]/5">
                                    <div className="flex items-center space-x-2">
                                        <AlertTriangle className="h-4 w-4 text-[#EA4335]" />
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                            Important Notice
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Google Sign-In will automatically create a new account if you don't already have one with SettleEase.
                                    </p>
                                </div>
                            </div>

                            {/* What Happens Section */}
                            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#4285F4]/30 dark:border-[#4285F4]/20 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-[#4285F4]/10 dark:bg-[#4285F4]/5">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="h-4 w-4 text-[#4285F4]" />
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                            What happens next?
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90 space-y-2">
                                    {isSignIn ? (
                                        <>
                                            <div className="flex items-center space-x-2 py-2">
                                                <LogIn className="h-4 w-4 text-[#34A853]" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        If you have an account
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        You'll be signed in immediately
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 py-2">
                                                <UserPlus className="h-4 w-4 text-[#4285F4]" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        If you don't have an account
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        A new account will be created automatically
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center space-x-2 py-2">
                                                <UserPlus className="h-4 w-4 text-[#4285F4]" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        Create new account
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Sign up with your Google account
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2 py-2">
                                                <LogIn className="h-4 w-4 text-[#34A853]" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                        If account exists
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        You'll be signed in instead
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>


                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 pt-4">
                            <Button
                                className={`w-full h-10 text-sm sm:h-11 sm:text-base transition-all duration-200 ${
                                    isLoading 
                                        ? 'bg-gray-100 hover:bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:border-gray-600' 
                                        : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600'
                                }`}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
                                    <GoogleMark size={24} />
                                </div>
                                <span className="ml-2.5">
                                    {(() => {
                                        const text = isLoading ? "Redirecting to Google..." : "Continue with Google";
                                        console.log("Button text should be:", text, "isLoading:", isLoading);
                                        return text;
                                    })()}
                                </span>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-10 text-sm sm:h-11 sm:text-base"
                                onClick={onClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
