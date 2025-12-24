"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";
import type { FontPreference } from '@/lib/settleease';

const USER_PROFILES_TABLE = 'user_profiles';

export function useFontSync(
    db: SupabaseClient | undefined,
    userId: string | undefined,
    userProfile: any
) {
    const [currentFont, setCurrentFont] = useState<FontPreference>('google-sans');
    const [isInitialized, setIsInitialized] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const isUpdatingFromRemote = useRef(false);
    const lastSyncedFont = useRef<FontPreference | null>(null);

    // Wait for component to mount (fixes hydration issues)
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Reset state when user logs out
    useEffect(() => {
        if (!userId) {
            setIsInitialized(false);
            lastSyncedFont.current = null;
            isUpdatingFromRemote.current = false;
            setCurrentFont('google-sans');
        }
    }, [userId]);

    // Apply font to document
    const applyFontToDocument = useCallback((font: FontPreference) => {
        if (typeof document === 'undefined') return;

        const html = document.documentElement;

        // Remove all font classes
        html.classList.remove('font-geist', 'font-system', 'font-inter', 'font-google-sans');

        // Add the new font class
        html.classList.add(`font-${font}`);
    }, []);

    // Update database when font changes
    const updateFontInDatabase = useCallback(async (newFont: FontPreference) => {
        if (!db || !userId) {
            console.warn('Cannot update font: missing db or userId');
            return;
        }

        try {
            const { error } = await db
                .from(USER_PROFILES_TABLE)
                .update({ font_preference: newFont })
                .eq('user_id', userId);

            if (error) {
                console.error('Error updating font in database:', error);
                toast({
                    title: "Font Sync Error",
                    description: "Failed to save font preference",
                    variant: "destructive",
                });
            } else {
                console.log(`✅ Font updated in database: ${newFont}`);
            }
        } catch (error: any) {
            console.error('Error updating font:', error);
        }
    }, [db, userId]);

    // Load font from database on mount (only once, after component is mounted)
    useEffect(() => {
        if (!isMounted || !db || !userId || !userProfile || isInitialized) return;

        const dbFont = userProfile.font_preference as FontPreference | undefined;
        console.log(`🔤 [Init] Current font: ${currentFont}, DB font: ${dbFont}, Mounted: ${isMounted}`);

        // If database has a font preference, use it
        if (dbFont) {
            console.log(`🔤 Loading font from database: ${dbFont}`);
            isUpdatingFromRemote.current = true;
            lastSyncedFont.current = dbFont;
            setCurrentFont(dbFont);
            applyFontToDocument(dbFont);
            setTimeout(() => {
                isUpdatingFromRemote.current = false;
            }, 200);
        } else if (!dbFont) {
            // If no font in database, default to google-sans and save it
            console.log('🔤 No font in database, defaulting to google-sans');
            isUpdatingFromRemote.current = true;
            lastSyncedFont.current = 'google-sans';
            setCurrentFont('google-sans');
            applyFontToDocument('google-sans');
            updateFontInDatabase('google-sans');
            setTimeout(() => {
                isUpdatingFromRemote.current = false;
            }, 200);
        }

        setIsInitialized(true);
    }, [isMounted, db, userId, userProfile, isInitialized, applyFontToDocument, updateFontInDatabase, currentFont]);

    // Watch for LOCAL font changes and update database
    useEffect(() => {
        if (!isMounted || !currentFont || !db || !userId || !isInitialized) return;

        console.log(`🔤 [Watch] Font: ${currentFont}, LastSynced: ${lastSyncedFont.current}, IsRemote: ${isUpdatingFromRemote.current}`);

        // Don't update database if this change came from remote
        if (isUpdatingFromRemote.current) {
            console.log('🔤 Skipping database update - change came from remote');
            return;
        }

        // Only update if font is different from what we last synced
        if (lastSyncedFont.current !== currentFont) {
            console.log(`🔤 Local font changed: ${lastSyncedFont.current} → ${currentFont}, updating database...`);
            lastSyncedFont.current = currentFont;
            applyFontToDocument(currentFont);
            updateFontInDatabase(currentFont);
        }
    }, [isMounted, currentFont, db, userId, isInitialized, applyFontToDocument, updateFontInDatabase]);

    // Set up real-time subscription for font changes
    useEffect(() => {
        if (!isMounted || !db || !userId || !isInitialized) return;

        console.log('🔄 Setting up real-time font sync subscription');

        const channel = db
            .channel(`font-sync-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: USER_PROFILES_TABLE,
                    filter: `user_id=eq.${userId}`,
                },
                (payload: any) => {
                    const newFont = payload.new?.font_preference as FontPreference | undefined;
                    const oldFont = payload.old?.font_preference as FontPreference | undefined;

                    console.log(`🔄 [Realtime] Received update: ${oldFont} → ${newFont}, Current: ${currentFont}`);

                    // Only update if the font actually changed
                    if (newFont && newFont !== oldFont && newFont !== currentFont) {
                        console.log(`🔄 Applying real-time font update: ${newFont}`);

                        // Mark this as a remote update to prevent loop
                        isUpdatingFromRemote.current = true;
                        lastSyncedFont.current = newFont;
                        setCurrentFont(newFont);
                        applyFontToDocument(newFont);

                        const fontNames: Record<FontPreference, string> = {
                            'geist': 'Geist',
                            'system': 'System Font',
                            'inter': 'Inter',
                            'google-sans': 'Google Sans'
                        };

                        toast({
                            title: "Font Updated",
                            description: `Font changed to ${fontNames[newFont]} from another device`,
                        });

                        // Reset flag after a longer delay for Safari
                        setTimeout(() => {
                            isUpdatingFromRemote.current = false;
                            console.log('🔄 Remote update flag cleared');
                        }, 300);
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔄 Font subscription status:', status);
            });

        return () => {
            console.log('🔄 Cleaning up font sync subscription');
            channel.unsubscribe();
        };
    }, [isMounted, db, userId, isInitialized, currentFont, applyFontToDocument]);

    // Function to set font (for UI controls)
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
