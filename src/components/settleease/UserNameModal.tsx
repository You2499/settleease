"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, HandCoins, Edit3, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { GoogleMark } from './BrandAssets';
import SettleEaseDialog, {
    SettleEaseModalBody,
    SettleEaseModalFooter,
    SettleEaseModalHeader,
    SettleEaseModalNotice,
    SettleEaseModalSection,
} from './SettleEaseDialog';

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
        <SettleEaseDialog
            open={isOpen}
            onOpenChange={() => { }}
            hideCloseButton
            className="sm:max-w-md"
        >
            <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
                <SettleEaseModalHeader
                    icon={isEditMode ? Edit3 : HandCoins}
                    tone="brand"
                    title={isEditMode ? "Edit your name" : isGoogleUser ? "Confirm your name" : "Profile setup"}
                    description={
                        isEditMode
                            ? "Update how your name appears to your group."
                            : isGoogleUser
                                ? "Review the name pulled from your Google profile before continuing."
                                : "Add your name so expenses and settlements are easier to read."
                    }
                    accessory={isGoogleUser ? <GoogleMark size={24} /> : null}
                />

                <SettleEaseModalBody className="space-y-3">
                    <SettleEaseModalSection>
                        <div className="mb-4 flex items-center gap-2 text-sm font-medium">
                            <User className="h-4 w-4" />
                            Profile details
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-sm font-medium">
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
                                    className="h-10 rounded-full text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-sm font-medium">
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
                                    className="h-10 rounded-full text-sm"
                                />
                            </div>
                        </form>
                    </SettleEaseModalSection>

                    {displayName && (
                        <SettleEaseModalSection className="bg-muted/25">
                            <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-background">
                                    <CheckCircle className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">How others will see you</p>
                                </div>
                            </div>
                        </SettleEaseModalSection>
                    )}

                    {isGoogleUser && !isEditMode && (
                        <SettleEaseModalNotice tone="warning" className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                We've automatically filled your name from your Google profile. You can edit it above if needed.
                            </span>
                        </SettleEaseModalNotice>
                    )}
                </SettleEaseModalBody>

                <SettleEaseModalFooter className="sm:justify-end">
                    <Button
                        className="h-10 w-full rounded-full bg-foreground text-background hover:bg-foreground/90 sm:w-auto"
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
                </SettleEaseModalFooter>
            </div>
        </SettleEaseDialog>
    );
});

export default UserNameModal;
