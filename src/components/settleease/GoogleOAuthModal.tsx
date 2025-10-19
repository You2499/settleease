"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, UserPlus, LogIn, Shield, Mail } from 'lucide-react';

// Google Icon SVG as a React component
const GoogleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface GoogleOAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSignIn: boolean;
}

export default function GoogleOAuthModal({
    isOpen,
    onClose,
    onConfirm,
    isSignIn
}: GoogleOAuthModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-[#4285F4]/20 dark:border-[#4285F4]/30 w-full max-w-md shadow-2xl relative">
                {/* Flowing Google Gradient Threads Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Blue Thread */}
                    <div className="absolute -top-10 -right-20 w-96 h-4 bg-gradient-to-r from-[#4285F4]/20 via-[#1893dd]/15 to-[#3086ff]/10 transform rotate-12 rounded-full blur-sm"></div>
                    <div className="absolute top-20 -left-16 w-80 h-3 bg-gradient-to-r from-[#3086ff]/15 via-[#4285F4]/20 to-[#1893dd]/10 transform -rotate-6 rounded-full blur-sm"></div>
                    
                    {/* Green Thread */}
                    <div className="absolute top-32 -right-12 w-72 h-3 bg-gradient-to-r from-[#34A853]/20 via-[#0fbc5c]/15 to-[#0cba65]/10 transform rotate-8 rounded-full blur-sm"></div>
                    <div className="absolute bottom-40 -left-20 w-88 h-4 bg-gradient-to-r from-[#0cba65]/15 via-[#34A853]/20 to-[#0fbc5c]/10 transform -rotate-10 rounded-full blur-sm"></div>
                    
                    {/* Red-Orange Thread */}
                    <div className="absolute bottom-20 -right-16 w-64 h-3 bg-gradient-to-r from-[#EA4335]/20 via-[#ff692c]/15 to-[#ff8d1b]/10 transform rotate-15 rounded-full blur-sm"></div>
                    <div className="absolute top-60 -left-12 w-56 h-2 bg-gradient-to-r from-[#ff8d1b]/15 via-[#EA4335]/20 to-[#ff692c]/10 transform -rotate-12 rounded-full blur-sm"></div>
                    
                    {/* Yellow Thread */}
                    <div className="absolute bottom-60 -right-8 w-48 h-2 bg-gradient-to-r from-[#FBBC05]/20 via-[#fdcd04]/15 to-[#ffce0a]/10 transform rotate-20 rounded-full blur-sm"></div>
                    
                    {/* Subtle overlay to ensure content readability */}
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80"></div>
                </div>
                
                {/* Content with higher z-index */}
                <div className="relative z-10 flex flex-col h-full">
                <DialogHeader className="pb-2">
                    <DialogTitle className="flex items-center space-x-3 text-xl font-bold">
                        <div className="p-3 bg-gradient-to-br from-[#4285F4] via-[#EA4335] to-[#FBBC05] rounded-xl shadow-lg">
                            <div className="p-1 bg-white rounded-lg shadow-inner">
                                <GoogleIcon />
                            </div>
                        </div>
                        <span className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05] bg-clip-text text-transparent font-semibold">
                            Continue with Google
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 px-1">
                    {/* Warning Section */}
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-[#ff7825]/30 dark:border-[#ff7825]/20 rounded-2xl overflow-hidden shadow-lg">
                        <div className="px-5 py-4 bg-gradient-to-r from-[#FBBC05]/15 via-[#ff7825]/15 to-[#EA4335]/15 dark:from-[#FBBC05]/10 dark:via-[#ff7825]/10 dark:to-[#EA4335]/10">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-[#FBBC05] to-[#EA4335] rounded-xl shadow-md">
                                    <AlertTriangle className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-semibold text-base text-gray-800 dark:text-gray-100">
                                    Important Notice
                                </span>
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-white/90 dark:bg-gray-800/90 space-y-3">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                Google Sign-In will automatically create a new account if you don't already have one with SettleEase.
                            </p>
                        </div>
                    </div>

                    {/* What Happens Section */}
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-[#4285F4]/30 dark:border-[#4285F4]/20 rounded-2xl overflow-hidden shadow-lg">
                        <div className="px-5 py-4 bg-gradient-to-r from-[#4285F4]/15 via-[#1893dd]/15 to-[#3086ff]/15 dark:from-[#4285F4]/10 dark:via-[#1893dd]/10 dark:to-[#3086ff]/10">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-[#4285F4] to-[#3086ff] rounded-xl shadow-md">
                                    <CheckCircle className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-semibold text-base text-gray-800 dark:text-gray-100">
                                    What happens next?
                                </span>
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-white/90 dark:bg-gray-800/90 space-y-4">
                            {isSignIn ? (
                                <>
                                    <div className="flex items-center space-x-3 py-3 px-4 bg-white/80 dark:bg-gray-700/80 rounded-xl border border-[#34A853]/30 dark:border-[#34A853]/20 shadow-sm">
                                        <div className="p-1.5 bg-gradient-to-br from-[#34A853] to-[#4285F4] rounded-lg shadow-sm">
                                            <LogIn className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                If you have an account
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                                You'll be signed in immediately
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 py-3 px-4 bg-white/80 dark:bg-gray-700/80 rounded-xl border border-[#4285F4]/30 dark:border-[#4285F4]/20 shadow-sm">
                                        <div className="p-1.5 bg-gradient-to-br from-[#4285F4] to-[#EA4335] rounded-lg shadow-sm">
                                            <UserPlus className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                If you don't have an account
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                                A new account will be created automatically
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center space-x-3 py-3 px-4 bg-white/80 dark:bg-gray-700/80 rounded-xl border border-[#4285F4]/30 dark:border-[#4285F4]/20 shadow-sm">
                                        <div className="p-1.5 bg-gradient-to-br from-[#4285F4] to-[#EA4335] rounded-lg shadow-sm">
                                            <UserPlus className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                Create new account
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                                Sign up with your Google account
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 py-3 px-4 bg-white/80 dark:bg-gray-700/80 rounded-xl border border-[#34A853]/30 dark:border-[#34A853]/20 shadow-sm">
                                        <div className="p-1.5 bg-gradient-to-br from-[#34A853] to-[#4285F4] rounded-lg shadow-sm">
                                            <LogIn className="h-4 w-4 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                If account exists
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                                You'll be signed in instead
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-[#34A853]/30 dark:border-[#34A853]/20 rounded-2xl overflow-hidden shadow-lg">
                        <div className="px-5 py-4 bg-gradient-to-r from-[#34A853]/15 via-[#0fbc5c]/15 to-[#0cba65]/15 dark:from-[#34A853]/10 dark:via-[#0fbc5c]/10 dark:to-[#0cba65]/10">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-[#34A853] to-[#0cba65] rounded-xl shadow-md">
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-semibold text-base text-gray-800 dark:text-gray-100">
                                    Secure & Private
                                </span>
                            </div>
                        </div>
                        <div className="px-5 py-4 bg-white/90 dark:bg-gray-800/90 space-y-3">
                            <div className="flex items-center space-x-3 p-3 bg-white/80 dark:bg-gray-700/80 rounded-lg border border-[#34A853]/30 dark:border-[#34A853]/20 shadow-sm">
                                <div className="p-1.5 bg-gradient-to-br from-[#34A853] to-[#0fbc5c] rounded-md shadow-sm">
                                    <Mail className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    We only access your email and basic profile info
                                </p>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-white/80 dark:bg-gray-700/80 rounded-lg border border-[#34A853]/30 dark:border-[#34A853]/20 shadow-sm">
                                <div className="p-1.5 bg-gradient-to-br from-[#0fbc5c] to-[#0cba65] rounded-md shadow-sm">
                                    <Shield className="h-4 w-4 text-white" />
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    Your Google password is never shared with us
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-11 border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="flex-1 h-11 bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] hover:from-[#3367D6] hover:via-[#2E7D32] hover:to-[#F9A825] text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] font-medium"
                    >
                        <div className="p-1 bg-white/95 rounded-md mr-2 shadow-sm">
                            <GoogleIcon />
                        </div>
                        <span>Continue with Google</span>
                    </Button>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}