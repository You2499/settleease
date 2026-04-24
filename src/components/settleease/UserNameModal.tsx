"use client";

import React, { useState, useCallback, useMemo } from 'react';
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
import { User, HandCoins, Edit3, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { GoogleMark } from './BrandAssets';

interface UserNameModalProps {
    isOpen: boolean;
    onClose: (success: boolean) => void;
    userId: string;
    initialFirstName?: string;
    initialLastName?: string;
    isGoogleUser?: boolean;
    isEditMode?: boolean;
}

const UserNameModal = React.memo(function UserNameModal({
    isOpen,
    onClose,
    userId,
    initialFirstName = '',
    initialLastName = '',
    isGoogleUser = false,
    isEditMode = false
}: UserNameModalProps) {
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [isLoading, setIsLoading] = useState(false);
    const updateUserProfile = useMutation(api.app.updateUserProfile);

    // Helper function to properly capitalize names (first letter uppercase, rest lowercase)
    const capitalizeName = useCallback((name: string) => {
        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    // Update state when initial values change (for Google users)
    React.useEffect(() => {
        // Auto-capitalize Google names for better formatting
        setFirstName(isGoogleUser && initialFirstName ? capitalizeName(initialFirstName) : initialFirstName);
        setLastName(isGoogleUser && initialLastName ? capitalizeName(initialLastName) : initialLastName);
    }, [initialFirstName, initialLastName, isGoogleUser]);

    // Memoize handlers to prevent re-renders
    const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFirstName(capitalizeName(e.target.value));
    }, [capitalizeName]);

    const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLastName(capitalizeName(e.target.value));
    }, [capitalizeName]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await saveProfile();
    };

    const handleButtonClick = async () => {
        await saveProfile();
    };

    const saveProfile = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            toast({
                title: "Missing Information",
                description: "Please enter both your first and last name.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            await updateUserProfile({
                supabaseUserId: userId,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            });

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

    // Memoize the display name to prevent unnecessary re-renders
    const displayName = useMemo(() => {
        return `${firstName.trim()} ${lastName.trim()}`.trim();
    }, [firstName, lastName]);

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent 
                className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden"
                hideCloseButton={true}
            >
                <div className="bg-white dark:bg-gray-900 border border-border shadow-lg relative rounded-lg -m-6 p-6">
                    <div>
                        <DialogHeader className="pb-4">
                            <DialogTitle className="flex items-center justify-center space-x-3 text-lg font-semibold">
                                <HandCoins className="h-6 w-6 text-primary" />
                                {isGoogleUser && <GoogleMark size={24} />}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-3">
                            {/* Profile Setup Section */}
                            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#4285F4]/30 dark:border-[#4285F4]/20 rounded-lg overflow-hidden">
                                <div className="px-4 py-3 bg-[#4285F4]/10 dark:bg-[#4285F4]/5">
                                    <div className="flex items-center space-x-2">
                                        <User className="h-4 w-4 text-[#4285F4]" />
                                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                            {isEditMode
                                                ? 'Edit Your Name'
                                                : isGoogleUser
                                                    ? 'Confirm Your Name'
                                                    : 'Profile Setup'
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                        {isEditMode
                                            ? 'Update how your name appears to your friends'
                                            : isGoogleUser
                                                ? 'Review and confirm your information below'
                                                : 'Let\'s set up your profile to get started'
                                        }
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                First Name
                                            </Label>
                                            <Input
                                                id="firstName"
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={handleFirstNameChange}
                                                disabled={isLoading}
                                                required
                                                autoFocus
                                                className="h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Last Name
                                            </Label>
                                            <Input
                                                id="lastName"
                                                type="text"
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={handleLastNameChange}
                                                disabled={isLoading}
                                                required
                                                className="h-10 text-sm"
                                            />
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* Preview Section */}
                            {displayName && (
                                <div className="bg-white/95 dark:bg-gray-800/95 border border-[#34A853]/30 dark:border-[#34A853]/20 rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 bg-[#34A853]/10 dark:bg-[#34A853]/5">
                                        <div className="flex items-center space-x-2">
                                            <CheckCircle className="h-4 w-4 text-[#34A853]" />
                                            <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                                Preview
                                            </span>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                        <div className="flex items-center space-x-2 py-2">
                                            <User className="h-4 w-4 text-[#34A853]" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                                    {displayName}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                    How others will see you
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Google Account Info */}
                            {isGoogleUser && !isEditMode && (
                                <div className="bg-white/95 dark:bg-gray-800/95 border border-[#ff7825]/30 dark:border-[#ff7825]/20 rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 bg-[#FBBC05]/10 dark:bg-[#FBBC05]/5">
                                        <div className="flex items-center space-x-2">
                                            <AlertTriangle className="h-4 w-4 text-[#EA4335]" />
                                            <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                                                Google Account
                                            </span>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            We've automatically filled your name from your Google profile. You can edit it above if needed.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-center pt-4">
                            <Button
                                className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600"
                                onClick={handleButtonClick}
                                disabled={isLoading || !firstName.trim() || !lastName.trim()}
                            >
                                {isLoading ? (
                                    <span>Saving...</span>
                                ) : (
                                    <>
                                        <User className="h-5 w-5" />
                                        <span className="ml-2.5">
                                            {isEditMode ? 'Save Changes' : 'Complete Profile'}
                                        </span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});

export default UserNameModal;
