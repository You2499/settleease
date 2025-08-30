"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { User, HandCoins, Edit3, ChevronDown, ChevronRight } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

// Google Icon SVG as a React component
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
    isEditMode?: boolean;
}

export default function UserNameModal({ 
    isOpen, 
    onClose, 
    db, 
    userId, 
    initialFirstName = '', 
    initialLastName = '', 
    isGoogleUser = false, 
    isEditMode = false 
}: UserNameModalProps) {
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['profile']));

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

    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

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

    // Apple HIG Section Component
    const Section = ({
        id,
        title,
        icon: Icon,
        children,
    }: {
        id: string;
        title: string;
        icon: React.FC<React.SVGProps<SVGSVGElement>>;
        children: React.ReactNode;
    }) => {
        const isExpanded = expandedSections.has(id);

        return (
            <div className="bg-card dark:bg-card/95 border border-border/30 dark:border-border/20 rounded-2xl overflow-hidden transition-colors hover:bg-card/80 dark:hover:bg-card/90">
                <button
                    onClick={() => toggleSection(id)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/15 dark:to-muted/5 hover:from-muted/30 hover:to-muted/20 dark:hover:from-muted/25 dark:hover:to-muted/15 transition-all duration-200 active:scale-[0.98]"
                >
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/15 dark:bg-primary/20 rounded-xl">
                            <Icon className="h-5 w-5 text-primary dark:text-primary/90" />
                        </div>
                        <span className="font-semibold text-base text-foreground dark:text-foreground/95">
                            {title}
                        </span>
                    </div>
                    <div className="p-1 rounded-full bg-background/50 dark:bg-background/30">
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80 transition-transform" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80 transition-transform" />
                        )}
                    </div>
                </button>
                {isExpanded && (
                    <div className="px-5 py-4 bg-background/50 dark:bg-background/30 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    // Apple HIG Info Row Component
    const InfoRow = ({
        label,
        value,
        icon: Icon,
        highlight = false,
    }: {
        label: string;
        value: React.ReactNode;
        icon?: React.FC<React.SVGProps<SVGSVGElement>>;
        highlight?: boolean;
    }) => (
        <div className="flex items-center justify-between py-3 px-4 bg-muted/20 dark:bg-muted/15 rounded-xl hover:bg-muted/30 dark:hover:bg-muted/25 transition-colors">
            <div className="flex items-center space-x-3">
                {Icon && (
                    <div className="p-1.5 bg-background dark:bg-background/80 rounded-lg">
                        <Icon className="h-4 w-4 text-muted-foreground dark:text-muted-foreground/80" />
                    </div>
                )}
                <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground/90">
                    {label}
                </span>
            </div>
            <div
                className={`text-sm font-medium text-right max-w-[60%] ${
                    highlight
                        ? "text-primary dark:text-primary/90 font-semibold text-base"
                        : "text-foreground dark:text-foreground/95"
                }`}
            >
                {value}
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent
                className="max-h-[90vh] overflow-hidden flex flex-col bg-background border-border/30 w-full max-w-md"
                hideCloseButton={true}
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                {/* Header */}
                <DialogHeader className="pb-6 border-b border-border/30">
                    <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary/15 dark:bg-primary/20 rounded-2xl">
                            <HandCoins className="h-8 w-8 text-primary dark:text-primary/90" />
                        </div>
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-bold text-center text-foreground mb-1">
                            {isEditMode 
                                ? 'Edit Your Name' 
                                : isGoogleUser 
                                    ? 'Confirm Your Name' 
                                    : 'Welcome to SettleEase!'
                            }
                        </DialogTitle>
                        <p className="text-sm text-center text-muted-foreground">
                            {isEditMode
                                ? 'Update how your name appears to your friends'
                                : isGoogleUser
                                    ? 'Review and confirm your information below'
                                    : 'Let\'s set up your profile to get started'
                            }
                        </p>
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto space-y-5 py-4 no-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Google Account Info Section */}
                        {isGoogleUser && !isEditMode && (
                            <Section id="google" title="Google Account" icon={() => <GoogleIcon />}>
                                <InfoRow
                                    label="Account Type"
                                    value={
                                        <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/30">
                                            <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
                                                Google OAuth
                                            </span>
                                        </div>
                                    }
                                />
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        We've automatically filled your name from your Google profile. You can edit it below if needed.
                                    </p>
                                </div>
                            </Section>
                        )}

                        {/* Profile Information Section */}
                        <Section id="profile" title="Profile Information" icon={isEditMode ? Edit3 : User}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                                        First Name
                                    </Label>
                                    <Input
                                        id="firstName"
                                        type="text"
                                        placeholder="John"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={isLoading}
                                        required
                                        autoFocus
                                        className="h-11 border-border/30 focus:border-primary focus:ring-primary focus:ring-1 focus:ring-offset-0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                                        Last Name
                                    </Label>
                                    <Input
                                        id="lastName"
                                        type="text"
                                        placeholder="Doe"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={isLoading}
                                        required
                                        className="h-11 border-border/30 focus:border-primary focus:ring-primary focus:ring-1 focus:ring-offset-0"
                                    />
                                </div>
                                
                                {/* Preview */}
                                {(firstName.trim() || lastName.trim()) && (
                                    <div className="mt-4">
                                        <InfoRow
                                            label="Display Name"
                                            value={
                                                <div className="text-right">
                                                    <div className="text-base font-bold text-primary">
                                                        {`${firstName.trim()} ${lastName.trim()}`.trim() || 'Enter your name'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        How others will see you
                                                    </div>
                                                </div>
                                            }
                                            highlight
                                        />
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Action Button */}
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
                                        {isEditMode ? 'Save Changes' : 'Complete Profile'}
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