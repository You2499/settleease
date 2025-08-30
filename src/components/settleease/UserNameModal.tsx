"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { User, HandCoins } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Google Icon SVG as a React component (larger size)
const GoogleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

interface UserNameModalProps {
    isOpen: boolean;
    onClose: (success: boolean) => void;
    db: SupabaseClient | undefined;
    userId: string;
    initialFirstName?: string;
    initialLastName?: string;
    isGoogleUser?: boolean;
}

export default function UserNameModal({ isOpen, onClose, db, userId, initialFirstName = '', initialLastName = '', isGoogleUser = false }: UserNameModalProps) {
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [isLoading, setIsLoading] = useState(false);

    // Helper function to properly capitalize names (first letter uppercase, rest lowercase)
    const capitalizeName = (name: string) => {
        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Update state when initial values change (for Google users)
    React.useEffect(() => {
        // Auto-capitalize Google names for better formatting
        setFirstName(isGoogleUser && initialFirstName ? capitalizeName(initialFirstName) : initialFirstName);
        setLastName(isGoogleUser && initialLastName ? capitalizeName(initialLastName) : initialLastName);
    }, [initialFirstName, initialLastName, isGoogleUser]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!firstName.trim() || !lastName.trim()) {
            toast({
                title: "Missing Information",
                description: "Please enter both your first and last name.",
                variant: "destructive"
            });
            return;
        }

        if (!db) {
            toast({
                title: "Error",
                description: "Database connection not available. Please try again.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await db
                .from('user_profiles')
                .update({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            if (error) throw error;

            toast({
                title: "Profile Updated",
                description: "Your name has been saved successfully!"
            });

            onClose(true);
        } catch (error: any) {
            console.error('Error updating user profile:', error);
            toast({
                title: "Update Failed",
                description: error.message || "Failed to save your name. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                className="w-full max-w-md mx-auto max-h-[90vh] overflow-hidden flex flex-col bg-background border-border/30"
                hideCloseButton={true}
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="pb-6 border-b border-border/30">
                    <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary/15 dark:bg-primary/20 rounded-2xl">
                            <HandCoins className="h-8 w-8 text-primary dark:text-primary/90" />
                        </div>
                    </div>
                    <DialogTitle className="text-2xl font-bold text-center text-foreground mb-1">
                        {isGoogleUser ? 'Confirm Your Name' : 'Welcome to SettleEase!'}
                    </DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground">
                        {isGoogleUser
                            ? 'Review and confirm how your name appears to friends.'
                            : 'To personalize your experience and help your friends recognize you, please provide your first and last name.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-5 py-4 no-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-5">
                            {isGoogleUser && (
                                <div className="bg-card dark:bg-card/95 border border-border/30 dark:border-border/20 rounded-2xl overflow-hidden">
                                    <div className="px-5 py-4 bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/15 dark:to-muted/5">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-primary/15 dark:bg-primary/20 rounded-xl">
                                                <GoogleIcon />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-base text-foreground dark:text-foreground/95">
                                                    Google Account
                                                </h4>
                                                <p className="text-sm text-muted-foreground dark:text-muted-foreground/90">
                                                    Names pre-filled from your profile
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            <div className="bg-card dark:bg-card/95 border border-border/30 dark:border-border/20 rounded-2xl overflow-hidden">
                                <div className="px-5 py-4 bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/15 dark:to-muted/5">
                                    <h4 className="font-semibold text-base text-foreground dark:text-foreground/95">
                                        Your Information
                                    </h4>
                                </div>
                                <div className="px-5 py-4 bg-background/50 dark:bg-background/30 space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName" className="text-sm font-medium text-foreground">First Name</Label>
                                        <Input
                                            id="firstName"
                                            type="text"
                                            placeholder="John"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={isLoading}
                                            required
                                            autoFocus
                                            className="h-11 text-base border-border/30 focus:border-primary focus:ring-primary focus:ring-1 focus:ring-offset-0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className="text-sm font-medium text-foreground">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            type="text"
                                            placeholder="Doe"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={isLoading}
                                            required
                                            className="h-11 text-base border-border/30 focus:border-primary focus:ring-primary focus:ring-1 focus:ring-offset-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/30">
                            <Button
                                type="submit"
                                disabled={isLoading || !firstName.trim() || !lastName.trim()}
                                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all duration-200 active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <User className="mr-2 h-5 w-5" />
                                        Complete Profile
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}