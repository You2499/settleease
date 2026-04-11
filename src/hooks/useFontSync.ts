"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from "@/hooks/use-toast";
import type { FontPreference } from '@/lib/settleease';

export function useFontSync(
    userId: string | undefined,
    userProfile: any
) {
    const [currentFont, setCurrentFont] = useState<FontPreference>('google-sans');
    const [isInitialized, setIsInitialized] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const isUpdatingFromRemote = useRef(false);
    const lastSyncedFont = useRef<FontPreference | null>(null);
    const updateUserProfile = useMutation(api.app.updateUserProfile);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!userId) {
            setIsInitialized(false);
            lastSyncedFont.current = null;
            isUpdatingFromRemote.current = false;
            setCurrentFont('google-sans');
        }
    }, [userId]);

    const applyFontToDocument = useCallback((font: FontPreference) => {
        if (typeof document === 'undefined') return;

        const html = document.documentElement;
        html.classList.remove('font-geist', 'font-system', 'font-inter', 'font-google-sans');
        html.classList.add(`font-${font}`);
    }, []);

    const updateFontInDatabase = useCallback(async (newFont: FontPreference) => {
        if (!userId) return;

        try {
            await updateUserProfile({
                supabaseUserId: userId,
                fontPreference: newFont,
            });
        } catch (error: any) {
            console.error('Error updating font in Convex:', error);
            toast({
                title: "Font Sync Error",
                description: "Failed to save font preference",
                variant: "destructive",
            });
        }
    }, [updateUserProfile, userId]);

    useEffect(() => {
        if (!isMounted || !userId || !userProfile || isInitialized) return;

        const dbFont = userProfile.font_preference as FontPreference | undefined;

        if (dbFont) {
            isUpdatingFromRemote.current = true;
            lastSyncedFont.current = dbFont;
            setCurrentFont(dbFont);
            applyFontToDocument(dbFont);
            setTimeout(() => {
                isUpdatingFromRemote.current = false;
            }, 200);
        } else {
            isUpdatingFromRemote.current = true;
            lastSyncedFont.current = 'google-sans';
            setCurrentFont('google-sans');
            applyFontToDocument('google-sans');
            void updateFontInDatabase('google-sans');
            setTimeout(() => {
                isUpdatingFromRemote.current = false;
            }, 200);
        }

        setIsInitialized(true);
    }, [isMounted, userId, userProfile, isInitialized, applyFontToDocument, updateFontInDatabase]);

    useEffect(() => {
        if (!isMounted || !currentFont || !userId || !isInitialized) return;

        if (isUpdatingFromRemote.current) return;

        if (lastSyncedFont.current !== currentFont) {
            lastSyncedFont.current = currentFont;
            applyFontToDocument(currentFont);
            void updateFontInDatabase(currentFont);
        }
    }, [isMounted, currentFont, userId, isInitialized, applyFontToDocument, updateFontInDatabase]);

    useEffect(() => {
        const remoteFont = userProfile?.font_preference as FontPreference | undefined;
        if (!isMounted || !remoteFont || !isInitialized) return;

        if (remoteFont !== lastSyncedFont.current && remoteFont !== currentFont) {
            isUpdatingFromRemote.current = true;
            lastSyncedFont.current = remoteFont;
            setCurrentFont(remoteFont);
            applyFontToDocument(remoteFont);

            const fontNames: Record<FontPreference, string> = {
                'geist': 'Geist',
                'system': 'System Font',
                'inter': 'Inter',
                'google-sans': 'Google Sans'
            };

            toast({
                title: "Font Updated",
                description: `Font changed to ${fontNames[remoteFont]} from another device`,
            });

            setTimeout(() => {
                isUpdatingFromRemote.current = false;
            }, 300);
        }
    }, [isMounted, isInitialized, currentFont, applyFontToDocument, userProfile?.font_preference]);

    const setFont = useCallback((font: FontPreference) => {
        if (font !== currentFont) {
            setCurrentFont(font);
        }
    }, [currentFont]);

    return {
        currentFont,
        setFont,
        updateFontInDatabase,
    };
}
