"use client";

import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import {
  ChartNoAxesCombined,
  ReceiptText,
  ShieldCheck,
  Split,
} from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { getGoogleButtonText, getGoogleOAuthParams, getAuthErrorMessage, getAuthSuggestion } from '@/lib/settleease/authUtils';

// ─── Types ──────────────────────────────────────────────
type EmailAccountStatus = 'new' | 'confirmed' | 'unconfirmed' | 'pending' | 'unknown';

type AuthToastConfig = {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
};

type EmailStatusLookup = {
  status: EmailAccountStatus;
  isGoogleAccount: boolean;
};

type EmailStatusCheckResult = {
  shouldProceed: boolean;
  toastConfig?: AuthToastConfig;
  showResendOption?: boolean;
  errorType?: string;
};

// ─── Constants ──────────────────────────────────────────
export const AUTH_REDIRECT_URL = "https://settleease-navy.vercel.app/";

export const authBenefits: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Split,
    title: "Split with precision",
    description: "Equal, unequal, and item-wise splits stay readable as the bill grows.",
  },
  {
    icon: ReceiptText,
    title: "Receipts become records",
    description: "Smart Scan turns messy receipts into editable expense drafts.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Know the group pulse",
    description: "Analytics, health estimates, and reports surface the patterns that matter.",
  },
  {
    icon: ShieldCheck,
    title: "Admin-safe controls",
    description: "Production and development controls stay separated where it counts.",
  },
];

// ─── Helpers (module-private) ───────────────────────────
function getAuthErrorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
}

function getAuthErrorMessageText(error: unknown) {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message || '')
    : '';
}

function isEmailNotConfirmedError(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessageText(error).toLowerCase();
  return code === 'email_not_confirmed' || message.includes('email not confirmed');
}

function isInvalidCredentialsError(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessageText(error).toLowerCase();
  return (
    code === 'invalid_credentials' ||
    code === 'invalid_login_credentials' ||
    (message.includes('invalid') && message.includes('credentials'))
  );
}

function isExistingUserError(error: unknown) {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessageText(error).toLowerCase();
  return (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already')
  );
}

function normalizeEmailStatus(rawStatus: unknown): EmailAccountStatus {
  if (
    rawStatus === 'new' ||
    rawStatus === 'confirmed' ||
    rawStatus === 'unconfirmed' ||
    rawStatus === 'pending'
  ) {
    return rawStatus;
  }
  return 'unknown';
}

function getAccountStatusUnavailableToast(): AuthToastConfig {
  return {
    title: "Account Check Unavailable",
    description: "We could not verify whether this email already uses Google or needs confirmation. Please try again in a moment.",
    variant: "destructive",
  };
}

// ─── Hook interface ─────────────────────────────────────
interface UseAuthFormLogicProps {
  supabase: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void;
}

export function useAuthFormLogic({ supabase, onAuthSuccess }: UseAuthFormLogicProps) {
  // ── State ───────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [authErrorType, setAuthErrorType] = useState<string>('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Refs ────────────────────────────────────────────
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // ── Mutations ───────────────────────────────────────
  const upsertUserProfile = useMutation(api.app.upsertUserProfile);
  const markSignIn = useMutation(api.app.markSignIn);

  // ── Derived ─────────────────────────────────────────
  const authSuggestion = getAuthSuggestion(isLoginView, hasAuthError, authErrorType);

  // ── Utilities ───────────────────────────────────────
  const capitalizeFirstLetter = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ── Effects ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoginView) {
        emailRef.current?.focus();
      } else {
        firstNameRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isLoginView]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isGoogleLoading) {
        console.log("Visibility change detected, resetting Google loading state");
        setIsGoogleLoading(false);
      }
    };
    const handleWindowFocus = () => {
      if (isGoogleLoading) {
        console.log("Window focus detected, resetting Google loading state");
        setIsGoogleLoading(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isGoogleLoading]);

  useEffect(() => {
    console.log("Component mounted, resetting Google loading state");
    setIsGoogleLoading(false);
  }, []);

  // ── Handlers ────────────────────────────────────────
  const resetAuthModeState = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setHasAuthError(false);
    setAuthErrorType('');
    setShowResendConfirmation(false);
    setResendEmail('');
    setIsGoogleLoading(false);
  };

  const lookupEmailStatus = async (emailAddress: string): Promise<EmailStatusLookup> => {
    if (!supabase) {
      throw new Error("Supabase auth is not available.");
    }

    const { data, error } = await supabase.rpc('check_email_status', {
      email_to_check: emailAddress,
    });

    if (error) {
      console.warn('Email status check RPC error:', error);
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    return {
      status: normalizeEmailStatus((result as { status?: unknown } | null | undefined)?.status),
      isGoogleAccount: (result as { is_google_account?: unknown } | null | undefined)?.is_google_account === true,
    };
  };

  const verifyExistingAccountPassword = async (emailAddress: string, candidatePassword: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailAddress,
        password: candidatePassword,
      });

      if (!error) {
        await supabase.auth.signOut();
        return true;
      }

      return isEmailNotConfirmedError(error);
    } catch (err) {
      console.warn('Password verification failed:', err);
      return false;
    }
  };

  const checkIfGoogleAccount = async (emailAddress: string): Promise<{ isGoogleAccount: boolean; lookupFailed: boolean }> => {
    try {
      const accountStatus = await lookupEmailStatus(emailAddress);
      return {
        isGoogleAccount: accountStatus.isGoogleAccount,
        lookupFailed: false,
      };
    } catch (err) {
      console.warn('Google account check failed:', err);
      return {
        isGoogleAccount: false,
        lookupFailed: true,
      };
    }
  };

  const checkEmailStatusSecure = async (
    emailAddress: string,
    candidatePassword: string,
  ): Promise<EmailStatusCheckResult> => {
    let accountStatus: EmailStatusLookup;

    try {
      accountStatus = await lookupEmailStatus(emailAddress);
    } catch {
      return {
        shouldProceed: false,
        toastConfig: getAccountStatusUnavailableToast(),
        errorType: 'account_status_unavailable',
      };
    }

    console.log('Email status check result:', accountStatus);

    if (accountStatus.status === 'new') {
      return { shouldProceed: true };
    }

    if (accountStatus.isGoogleAccount) {
      return {
        shouldProceed: false,
        toastConfig: {
          title: "Detected Google Account",
          description: "This email is already associated with a Google account. Please use Continue with Google to sign in.",
          variant: "destructive",
        },
        showResendOption: false,
        errorType: 'google_account_detected',
      };
    }

    if (accountStatus.status === 'confirmed') {
      return {
        shouldProceed: false,
        toastConfig: {
          title: "Account Already Exists",
          description: "An account with this email already exists. Please sign in instead, or use Forgot Password if you need to reset your password.",
          variant: "destructive",
        },
        showResendOption: false,
        errorType: 'account_exists',
      };
    }

    if (accountStatus.status === 'unconfirmed') {
      const isPasswordCorrect = await verifyExistingAccountPassword(emailAddress, candidatePassword);

      if (isPasswordCorrect) {
        return {
          shouldProceed: false,
          toastConfig: {
            title: "Email Already Sent",
            description: "Your account exists but has not been verified yet. Check your inbox or resend the confirmation email below.",
            variant: "destructive",
          },
          showResendOption: true,
          errorType: 'unconfirmed',
        };
      }

      return {
        shouldProceed: false,
        toastConfig: {
          title: "Email Already in Use",
          description: "This email address is already associated with an account. If this is your email, check your inbox for a confirmation link or try signing in.",
          variant: "destructive",
        },
        showResendOption: false,
        errorType: 'account_exists',
      };
    }

    if (accountStatus.status === 'pending') {
      return {
        shouldProceed: false,
        toastConfig: {
          title: "Account Already Exists",
          description: "An account with this email already exists. Please sign in instead, or use Forgot Password if you need help.",
          variant: "destructive",
        },
        showResendOption: false,
        errorType: 'account_exists',
      };
    }

    return {
      shouldProceed: false,
      toastConfig: getAccountStatusUnavailableToast(),
      errorType: 'account_status_unavailable',
    };
  };

  const handleResendConfirmation = async () => {
    if (!supabase || !resendEmail || !password) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: resendEmail,
        options: {
          emailRedirectTo: AUTH_REDIRECT_URL,
        },
      });

      if (error) throw error;

      toast({
        title: "Confirmation Email Sent",
        description: "We've sent a new confirmation link to your email. Please check your inbox and spam folder.",
        variant: "default"
      });

      setShowResendConfirmation(false);
      setHasAuthError(false);
      setAuthErrorType('');
    } catch (err: any) {
      console.error("Confirmation resend error:", err);
      const { title, description } = getAuthErrorMessage(err, false);

      toast({
        title: title === "Authentication Error" ? "Unable to Resend Email" : title,
        description,
        variant: "destructive",
      });
      setHasAuthError(true);
      setAuthErrorType(err?.code || 'resend_failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (!supabase) {
      toast({ title: "Authentication Error", description: "Supabase auth is not available. Please try again later.", variant: "destructive" });
      return;
    }
    if (!normalizedEmail || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both your email address and password.",
        variant: "destructive"
      });
      return;
    }

    if (!isLoginView && (!firstName.trim() || !lastName.trim())) {
      toast({
        title: "Missing Information",
        description: "Please enter both your first name and last name to create your account.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLoginView) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) {
          if (isEmailNotConfirmedError(signInError)) {
            toast({
              title: "Email Not Verified",
              description: "Your account exists but hasn't been verified yet. Please check your email and click the verification link to activate your account before signing in.",
              variant: "destructive"
            });
            setHasAuthError(true);
            setAuthErrorType('email_not_confirmed');
            setShowResendConfirmation(true);
            setResendEmail(normalizedEmail);
            setIsLoading(false);
            return;
          }

          if (isInvalidCredentialsError(signInError)) {
            const { isGoogleAccount, lookupFailed } = await checkIfGoogleAccount(normalizedEmail);

            if (lookupFailed) {
              toast(getAccountStatusUnavailableToast());
              setHasAuthError(true);
              setAuthErrorType('account_status_unavailable');
              setIsLoading(false);
              return;
            }

            if (isGoogleAccount) {
              toast({
                title: "Detected Google Account",
                description: "This email is associated with a Google account. Please use Continue with Google to sign in instead of entering a password.",
                variant: "destructive",
              });
              setHasAuthError(true);
              setAuthErrorType('google_account_detected');
              setIsLoading(false);
              return;
            }
          }

          throw signInError;
        }

        setHasAuthError(false);
        setAuthErrorType('');
        if (data.user && onAuthSuccess) onAuthSuccess(data.user);
      } else {
        const { shouldProceed, toastConfig, showResendOption, errorType } = await checkEmailStatusSecure(
          normalizedEmail,
          password,
        );

        if (!shouldProceed) {
          if (toastConfig) {
            toast(toastConfig);
          }
          setHasAuthError(true);
          setAuthErrorType(errorType || '');
          setShowResendConfirmation(!!showResendOption);
          setResendEmail(showResendOption ? normalizedEmail : '');
          setIsLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: AUTH_REDIRECT_URL,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });

        if (signUpError) {
          console.log('Signup error details:', {
            code: signUpError.code,
            message: signUpError.message,
            hasUser: !!data.user,
            hasSession: !!data.session,
            userConfirmed: data.user ? (data.user as any).email_confirmed_at : null
          });

          if (isExistingUserError(signUpError)) {

            toast({
              title: "Account Already Exists",
              description: "An account with this email already exists. Please sign in instead, or use 'Forgot Password' if you need to reset your password.",
              variant: "destructive"
            });
            setHasAuthError(true);
            return;
          }

          throw signUpError;
        }

        console.log('Signup response:', {
          user: !!data.user,
          session: !!data.session,
          userId: data.user ? (data.user as any).id : null,
          userEmail: data.user ? (data.user as any).email : null,
          userCreated: data.user ? (data.user as any).created_at : null,
          confirmationSent: data.user ? (data.user as any).confirmation_sent_at : null
        });

        if (data.user && !data.session) {
          toast({
            title: "Check Your Email",
            description: "We've sent a confirmation link to your email. Please check your inbox and click the link to activate your account.",
            variant: "default"
          });
          setHasAuthError(false);
          return;
        }

        if (data.user && data.session) {
          try {
            await upsertUserProfile({
              supabaseUserId: data.user.id,
              email: data.user.email || normalizedEmail,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            });
          } catch (profileErr) {
            console.warn('Failed to update Convex profile during signup:', profileErr);
          }
        }

        if (data.session && data.user) {
          try {
            await markSignIn({
              supabaseUserId: data.user.id,
              email: data.user.email || normalizedEmail,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            });
          } catch (err) {
            console.error('Error updating Convex sign-in flags:', err);
          }

          setHasAuthError(false);
          setAuthErrorType('');
          if (onAuthSuccess) onAuthSuccess(data.user);
        } else {
          toast({
            title: "Check Your Email",
            description: "Please check your email and click the confirmation link to activate your account.",
            variant: "default"
          });
          setHasAuthError(false);
          setAuthErrorType('');
        }
      }
    } catch (err: any) {
      console.error("Auth error (email/password):", err);

      const { title, description } = getAuthErrorMessage(err, isLoginView);
      toast({ title, description, variant: "destructive" });
      setHasAuthError(true);
      setAuthErrorType(err?.code || '');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!supabase) {
      toast({ title: "Authentication Error", description: "Supabase auth is not available. Please try again later.", variant: "destructive" });
      return;
    }

    setShowGoogleModal(true);
  };

  const handleGoogleOAuthConfirm = async () => {
    console.log("Google OAuth: Starting authentication process");
    setIsGoogleLoading(true);

    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Google OAuth: Loading state set, isGoogleLoading should be true");

    try {
      console.log("Google OAuth: Calling signInWithOAuth");
      const { error: googleError } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          queryParams: getGoogleOAuthParams(isLoginView),
        },
      });

      if (googleError) {
        console.error("Google OAuth: Error from signInWithOAuth:", googleError);
        throw googleError;
      }

      console.log("Google OAuth: signInWithOAuth successful, user should be redirected");

      setTimeout(() => {
        console.log("Google OAuth: Timeout reached, resetting loading states");
        setIsGoogleLoading(false);
        setShowGoogleModal(false);
      }, 10000);
    } catch (err: any) {
      console.error("Google OAuth: Caught error:", err);
      const { title, description } = getAuthErrorMessage(err, isLoginView);
      toast({
        title: title.includes("Sign In") ? "Google Sign-In Error" : title,
        description: description.includes("Google") ? description : `Google Sign-In failed: ${description}`,
        variant: "destructive"
      });
      setHasAuthError(true);
      setIsGoogleLoading(false);
      setShowGoogleModal(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (showResendConfirmation) {
      setShowResendConfirmation(false);
      setResendEmail('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (showResendConfirmation) {
      setShowResendConfirmation(false);
      setResendEmail('');
    }
  };

  const toggleAuthMode = () => {
    setIsLoginView(!isLoginView);
    resetAuthModeState();
  };

  return {
    // State
    email,
    password,
    firstName,
    lastName,
    isLoginView,
    isLoading,
    isGoogleLoading,
    hasAuthError,
    authErrorType,
    showResendConfirmation,
    resendEmail,
    showGoogleModal,
    showPassword,
    authSuggestion,

    // Setters
    setEmail,
    setPassword,
    setFirstName,
    setLastName,
    setShowGoogleModal,
    setShowPassword,

    // Refs
    firstNameRef,
    emailRef,

    // Handlers
    handleSubmit,
    handleGoogleSignIn,
    handleGoogleOAuthConfirm,
    handleResendConfirmation,
    handleEmailChange,
    handlePasswordChange,
    toggleAuthMode,
    capitalizeFirstLetter,

    // Re-exported utilities
    getGoogleButtonText,
  };
}
