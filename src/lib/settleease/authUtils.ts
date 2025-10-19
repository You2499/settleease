/**
 * Authentication utility functions for SettleEase
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a user exists with the given email address
 * Note: This is a utility function for future enhancements
 * Currently not used due to Supabase security restrictions
 */
export async function checkUserExists(db: SupabaseClient, email: string): Promise<boolean> {
  try {
    // Note: This approach won't work due to RLS policies
    // Keeping for reference and future server-side implementation
    const { data, error } = await db
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single();

    return !error && !!data;
  } catch (error) {
    console.warn('Unable to check user existence:', error);
    return false;
  }
}

/**
 * Show a confirmation dialog for Google OAuth with clear messaging
 */
export function showGoogleOAuthConfirmation(isSignIn: boolean): boolean {
  if (isSignIn) {
    return window.confirm(
      "⚠️ IMPORTANT: Google Sign-In will create a new account if you don't already have one.\n\n" +
      "• If you have an existing account: You'll be signed in\n" +
      "• If you DON'T have an account: A new account will be created automatically\n\n" +
      "If you only want to sign in to an existing account, click 'Cancel' and use email/password instead.\n\n" +
      "Continue with Google Sign-In?"
    );
  }
  return true; // No confirmation needed for sign-up flow
}

/**
 * Get appropriate Google OAuth button text based on context
 */
export function getGoogleButtonText(isSignIn: boolean, isLoading: boolean): string {
  if (isLoading) {
    return "Redirecting to Google...";
  }
  return isSignIn ? 'Continue with Google' : 'Sign up with Google';
}

/**
 * Get Google OAuth query parameters based on user intent
 */
export function getGoogleOAuthParams(isSignIn: boolean) {
  return {
    access_type: 'offline',
    prompt: isSignIn ? 'select_account' : 'consent',
  };
}