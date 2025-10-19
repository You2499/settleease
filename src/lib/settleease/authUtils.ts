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
      "IMPORTANT: Google Sign-In will create a new account if you don't already have one.\n\n" +
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

/**
 * Enhanced error message mapping for better user experience
 */
export function getAuthErrorMessage(error: any, isSignIn: boolean): { title: string; description: string } {
  const errorCode = error?.code;
  const errorMessage = error?.message || '';

  // Handle specific Supabase error codes
  switch (errorCode) {
    case 'invalid_credentials':
    case 'email_not_confirmed':
      if (isSignIn) {
        return {
          title: "Sign In Failed",
          description: "The email or password you entered is incorrect. If you don't have an account yet, please sign up instead."
        };
      }
      break;

    case 'user_not_found':
      return {
        title: "Account Not Found",
        description: "No account exists with this email address. Would you like to create a new account instead?"
      };

    case 'invalid_password':
      return {
        title: "Incorrect Password",
        description: "The password you entered is incorrect. Please try again or use 'Forgot Password' if you need to reset it."
      };

    case 'email_address_invalid':
      return {
        title: "Invalid Email",
        description: "Please enter a valid email address."
      };

    case 'password_too_short':
      return {
        title: "Password Too Short",
        description: "Password must be at least 6 characters long."
      };

    case 'user_already_exists':
    case 'email_exists':
      return {
        title: "Account Already Exists",
        description: "An account with this email already exists. Please sign in instead or use 'Forgot Password' if you need to reset your password."
      };

    case 'signup_disabled':
      return {
        title: "Sign Up Unavailable",
        description: "New account registration is currently disabled. Please contact support for assistance."
      };

    case 'email_rate_limit_exceeded':
      return {
        title: "Too Many Attempts",
        description: "Too many email attempts. Please wait a few minutes before trying again."
      };

    case 'captcha_failed':
      return {
        title: "Verification Failed",
        description: "Security verification failed. Please try again."
      };

    case 'weak_password':
      return {
        title: "Weak Password",
        description: "Please choose a stronger password with a mix of letters, numbers, and symbols."
      };

    default:
      // Handle common error message patterns
      if (errorMessage.toLowerCase().includes('invalid login credentials')) {
        return {
          title: "Sign In Failed",
          description: "The email or password is incorrect, or no account exists with this email. Please double-check your credentials or create a new account if you're new to SettleEase."
        };
      }

      if (errorMessage.toLowerCase().includes('email not confirmed')) {
        return {
          title: "Email Not Verified",
          description: "Please check your email and click the verification link before signing in."
        };
      }

      if (errorMessage.toLowerCase().includes('network')) {
        return {
          title: "Connection Error",
          description: "Unable to connect to our servers. Please check your internet connection and try again."
        };
      }

      // Default fallback
      return {
        title: isSignIn ? "Sign In Error" : "Sign Up Error",
        description: errorMessage || "An unexpected error occurred. Please try again."
      };
  }

  // Fallback for unhandled cases
  return {
    title: "Authentication Error",
    description: errorMessage || "An unexpected error occurred. Please try again."
  };
}

/**
 * Get helpful suggestions based on the current context and error
 */
export function getAuthSuggestion(isSignIn: boolean, hasError: boolean, errorType?: string): string | null {
  if (hasError && isSignIn) {
    if (errorType === 'invalid_credentials') {
      return "💡 Tip: Check your email and password, or try 'Don't have an account? Sign Up' if you're new to SettleEase.";
    }
    return "💡 Tip: If you don't have an account yet, try clicking 'Don't have an account? Sign Up' below.";
  }
  if (hasError && !isSignIn) {
    return "💡 Tip: If you already have an account, try clicking 'Already have an account? Sign In' below.";
  }
  return null;
}