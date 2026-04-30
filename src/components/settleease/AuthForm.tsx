"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import {
  BadgeCheck,
  ChartNoAxesCombined,
  Eye,
  EyeOff,
  HandCoins,
  Lightbulb,
  LogIn,
  PartyPopper,
  PieChart,
  ReceiptText,
  ScanLine,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  Split,
  UserPlus,
  Users,
  WalletCards,
  Zap,
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getGoogleButtonText, getGoogleOAuthParams, getAuthErrorMessage, getAuthSuggestion } from '@/lib/settleease/authUtils';
import GoogleOAuthModal from './GoogleOAuthModal';
import packageJson from '../../../package.json';
import { GoogleMark } from './BrandAssets';

interface AuthFormProps {
  supabase: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void;
}

type AuthDesign = 'beta' | 'classic';
type AuthSurface = 'beta' | 'classic';
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

const AUTH_DESIGN_STORAGE_KEY = 'settleease-auth-design';
const AUTH_REDIRECT_URL = "https://settleease-navy.vercel.app/";

const betaBenefits = [
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

const classicBenefits = [
  {
    icon: Zap,
    label: "AI-Powered Insights:",
    copy: "Get intelligent summaries of your spending patterns.",
  },
  {
    icon: Users,
    label: "Flexible Splitting:",
    copy: "Equal, unequal, or item-by-item splits with ease.",
  },
  {
    icon: PieChart,
    label: "Advanced Analytics:",
    copy: "Visualize spending with charts, heatmaps, and trends.",
  },
  {
    icon: PartyPopper,
    label: "Smart Settlements:",
    copy: "Optimized payment plans that minimize transactions.",
  },
  {
    icon: Settings2,
    label: "Customizable:",
    copy: "Choose from 1000+ icons and personalize categories.",
  },
];

function isAuthDesign(value: string | null): value is AuthDesign {
  return value === 'beta' || value === 'classic';
}

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

export default function AuthForm({ supabase, onAuthSuccess }: AuthFormProps) {
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
  const [authDesign, setAuthDesign] = useState<AuthDesign>('beta');

  const upsertUserProfile = useMutation(api.app.upsertUserProfile);
  const markSignIn = useMutation(api.app.markSignIn);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const isBetaDesign = authDesign === 'beta';
  const authSuggestion = getAuthSuggestion(isLoginView, hasAuthError, authErrorType);

  const capitalizeFirstLetter = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const storedDesign = window.localStorage.getItem(AUTH_DESIGN_STORAGE_KEY);
    if (isAuthDesign(storedDesign)) {
      setAuthDesign(storedDesign);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoginView) {
        emailRef.current?.focus();
      } else {
        firstNameRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoginView, authDesign]);

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

  const updateAuthDesign = (nextDesign: AuthDesign) => {
    setAuthDesign(nextDesign);
    window.localStorage.setItem(AUTH_DESIGN_STORAGE_KEY, nextDesign);
  };

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

  const renderDesignToggle = (className?: string) => (
    <div className={cn("inline-flex items-center rounded-full border border-border/70 bg-background/85 p-1 shadow-sm backdrop-blur-md", className)} aria-label="Auth design preference">
      {(['beta', 'classic'] as AuthDesign[]).map((design) => (
        <Button
          key={design}
          type="button"
          size="sm"
          variant={authDesign === design ? "default" : "ghost"}
          className={cn(
            "h-8 rounded-full px-3 text-xs capitalize",
            authDesign === design ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => updateAuthDesign(design)}
          aria-pressed={authDesign === design}
        >
          {design === 'beta' ? 'Beta' : 'Classic'}
        </Button>
      ))}
    </div>
  );

  const renderAuthControls = (surface: AuthSurface) => {
    const isBetaSurface = surface === 'beta';
    const inputClassName = isBetaSurface
      ? "h-11 rounded-full border-border/80 bg-background/95 px-4 shadow-sm focus-visible:ring-ring"
      : "h-10 sm:h-11";
    const passwordInputClassName = isBetaSurface
      ? "h-11 rounded-full border-border/80 bg-background/95 pl-4 pr-12 shadow-sm focus-visible:ring-ring"
      : "h-10 sm:h-11 pr-10";
    const labelClassName = isBetaSurface
      ? "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
      : "text-sm";

    if (isBetaSurface) {
      return (
        <>
          <form onSubmit={handleSubmit} className="auth-beta-form space-y-4">
            <div className="auth-beta-name-slot">
              <div
                className={cn(
                  "grid grid-cols-2 gap-3 transition-all duration-200",
                  isLoginView && "pointer-events-none -translate-y-1 opacity-0",
                )}
                aria-hidden={isLoginView}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className={labelClassName}>First Name</Label>
                  <Input
                    ref={firstNameRef}
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(capitalizeFirstLetter(e.target.value))}
                    disabled={isLoading || isGoogleLoading || isLoginView}
                    required={!isLoginView}
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className={labelClassName}>Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(capitalizeFirstLetter(e.target.value))}
                    disabled={isLoading || isGoogleLoading || isLoginView}
                    required={!isLoginView}
                    className={inputClassName}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className={labelClassName}>Email Address</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (showResendConfirmation) {
                    setShowResendConfirmation(false);
                    setResendEmail('');
                  }
                }}
                disabled={isLoading || isGoogleLoading}
                required
                className={inputClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className={labelClassName}>Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLoginView ? "current-password" : "new-password"}
                  placeholder={isLoginView ? "Password" : "Password - min. 6 characters"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (showResendConfirmation) {
                      setShowResendConfirmation(false);
                      setResendEmail('');
                    }
                  }}
                  disabled={isLoading || isGoogleLoading}
                  required
                  minLength={6}
                  className={passwordInputClassName}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-0 h-full rounded-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isGoogleLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="auth-beta-action-slot">
              {showResendConfirmation ? (
                <div className="flex h-full flex-col justify-between rounded-2xl border border-amber-300/60 bg-[#fff8e7] p-3 text-center shadow-sm dark:bg-amber-950/20">
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {isLoginView ? "Email Not Verified" : "Account Exists - Email Confirmation Needed"}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                      Your account exists but has not been verified yet. Resend the confirmation email below.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                    className="h-10 w-full rounded-full bg-black text-sm font-semibold text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground"
                  >
                    {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  className="auth-beta-primary-button h-11 w-full rounded-full text-sm font-semibold shadow-[rgba(78,50,23,0.08)_0px_10px_24px] sm:text-base"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    isLoginView ? 'Logging in...' : 'Creating Account...'
                  ) : isLoginView ? (
                    <>
                      <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Create Account
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

          <div className="relative my-3 sm:my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 tracking-[0.16em] text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-full border border-border/80 bg-white/95 text-sm text-foreground shadow-sm hover:bg-muted dark:bg-card dark:text-card-foreground sm:text-base"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            <GoogleMark size={18} />
            <span className="ml-2.5">
              {getGoogleButtonText(isLoginView, isGoogleLoading)}
            </span>
          </Button>

          <div className="auth-beta-status-slot">
            {hasAuthError && !showResendConfirmation && authSuggestion ? (
              <div className="rounded-2xl border border-border/70 bg-muted/60 p-2 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center space-x-2">
                  <Lightbulb className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{authSuggestion.text}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="auth-beta-switch-slot">
            <Button
              type="button"
              variant="link"
              onClick={() => {
                setIsLoginView(!isLoginView);
                resetAuthModeState();
              }}
              disabled={isLoading || isGoogleLoading}
              className="h-auto rounded-full px-3 py-2 text-sm text-foreground underline-offset-8 hover:text-primary/80"
            >
              {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {!isLoginView && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className={labelClassName}>First Name</Label>
                <Input
                  ref={firstNameRef}
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(capitalizeFirstLetter(e.target.value))}
                  disabled={isLoading || isGoogleLoading}
                  required
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className={labelClassName}>Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(capitalizeFirstLetter(e.target.value))}
                  disabled={isLoading || isGoogleLoading}
                  required
                  className={inputClassName}
                />
              </div>
            </div>
          )}
          <div className="space-y-1 sm:space-y-1.5">
            <Label htmlFor="email" className={labelClassName}>Email Address</Label>
            <Input
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (showResendConfirmation) {
                  setShowResendConfirmation(false);
                  setResendEmail('');
                }
              }}
              disabled={isLoading || isGoogleLoading}
              required
              className={inputClassName}
            />
          </div>
          <div className="space-y-1 sm:space-y-1.5">
            <Label htmlFor="password" className={labelClassName}>Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLoginView ? "current-password" : "new-password"}
                placeholder={isLoginView ? "Password" : "Password - min. 6 characters"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (showResendConfirmation) {
                    setShowResendConfirmation(false);
                    setResendEmail('');
                  }
                }}
                disabled={isLoading || isGoogleLoading}
                required
                minLength={6}
                className={passwordInputClassName}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isGoogleLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {showResendConfirmation ? (
            <div className={cn(
              "space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20",
            )}>
              <div className="text-center">
                <h3 className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {isLoginView ? "Email Not Verified" : "Account Exists - Email Confirmation Needed"}
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your account exists but hasn't been verified yet. Please check your email for the confirmation link, or resend it below.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isLoading}
                className={cn(
                  "h-10 w-full text-sm font-semibold sm:h-11 sm:text-base",
                  "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800",
                )}
              >
                {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              className={cn(
                "h-10 w-full text-sm font-semibold sm:h-11 sm:text-base",
              )}
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                isLoginView ? 'Logging in...' : 'Creating Account...'
              ) : isLoginView ? (
                <>
                  <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Create Account
                </>
              )}
            </Button>
          )}
        </form>

        <div className="relative my-3 sm:my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <Button
          type="button"
          className={cn(
            "h-10 w-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:h-11 sm:text-base",
          )}
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
        >
          <GoogleMark size={18} />
          <span className="ml-2.5">
            {getGoogleButtonText(isLoginView, isGoogleLoading)}
          </span>
        </Button>

        {hasAuthError && !showResendConfirmation && authSuggestion && (
          <div className={cn(
            "mt-3 rounded-md border border-blue-200 bg-blue-50 p-2 text-center text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300",
          )}>
            <div className="flex items-center justify-center space-x-2">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span>{authSuggestion.text}</span>
            </div>
          </div>
        )}

        <Button
          type="button"
          variant="link"
          onClick={() => {
            setIsLoginView(!isLoginView);
            resetAuthModeState();
          }}
          disabled={isLoading || isGoogleLoading}
          className="text-sm text-primary hover:text-primary/80"
        >
          {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </Button>
      </>
    );
  };

  const renderClassicLayout = () => (
    <>
      <div className="fixed right-4 top-4 z-50">
        {renderDesignToggle()}
      </div>
      <Card className="w-full max-w-4xl overflow-hidden rounded-lg shadow-xl md:h-[680px] md:min-h-[680px]">
        <div className="h-full md:flex md:h-[680px] md:min-h-[680px]">
          <div className={cn(
            "flex h-full min-h-[400px] flex-col px-6 py-8 transition-colors duration-300 ease-in-out sm:px-10 sm:py-10 md:h-[680px] md:min-h-[680px] md:w-2/5",
            isLoginView ? "bg-secondary/20 text-primary" : "bg-primary text-primary-foreground",
          )}>
            <div className="flex h-full min-h-0 flex-1 flex-col justify-center">
              {isLoginView ? (
                <div className="flex h-full flex-1 flex-col items-center justify-center px-2 text-center">
                  <HandCoins className="mx-auto mb-4 h-16 w-16 text-primary sm:mb-6 sm:h-20 sm:w-20" />
                  <h1 className="font-headline text-2xl font-bold text-primary sm:text-3xl">Welcome Back!</h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
                    Sign in to continue simplifying your group expenses.
                  </p>

                  <div className="mt-6 space-y-2 md:hidden">
                    <div className="flex items-center justify-center space-x-2 rounded-full border border-border/50 bg-background/80 px-3 py-2 shadow-sm backdrop-blur-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Protected by <span className="font-semibold text-primary">SettleSecure</span>
                      </span>
                    </div>
                    <p className="text-center text-xs text-muted-foreground/70">SettleEase v{packageJson.version}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 text-center sm:mb-7 md:text-left">
                    <HandCoins className="mx-auto mb-3 h-12 w-12 text-primary-foreground/90 sm:mb-4 sm:h-16 sm:w-16 md:mx-0" />
                    <h1 className="font-headline text-3xl font-bold sm:text-4xl">SettleEase</h1>
                    <p className="mt-1 text-md text-primary-foreground/90 sm:mt-2 sm:text-lg">
                      The smartest way to manage shared expenses.
                    </p>
                  </div>
                  <h3 className="mb-4 text-center text-lg font-semibold sm:mb-5 sm:text-xl md:text-left">Why SettleEase?</h3>
                  <ul className="space-y-3 text-xs sm:space-y-3.5 sm:text-sm">
                    {classicBenefits.map(({ icon: Icon, label, copy }) => (
                      <li key={label} className="flex items-start">
                        <Icon className="mr-3 mt-0.5 h-4 w-4 shrink-0 text-primary-foreground/80 sm:mr-3.5 sm:h-5 sm:w-5" />
                        <span><strong>{label}</strong> {copy}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 md:h-[680px] md:min-h-[680px] md:w-3/5">
            <div className="flex h-full min-h-0 flex-1 flex-col justify-center">
              <CardHeader className="px-0 pb-4 pt-0 text-center">
                <CardTitle className="flex items-center text-xl font-bold sm:text-2xl">
                  {isLoginView ? 'Sign In' : 'Create your Account'}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3 px-0 pb-0 sm:space-y-4">
                {renderAuthControls('classic')}
              </CardContent>
            </div>
          </div>
        </div>
      </Card>

      <div className="fixed bottom-4 left-1/2 z-40 hidden -translate-x-1/2 transform space-y-2 md:block">
        <div className="flex items-center space-x-2 rounded-full border border-border/50 bg-background/80 px-3 py-2 shadow-sm backdrop-blur-sm">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Protected by <span className="font-semibold text-primary">SettleSecure</span>
          </span>
        </div>
        <p className="text-center text-xs text-muted-foreground/70">SettleEase v{packageJson.version}</p>
      </div>
    </>
  );

  const renderBetaAtmosphere = () => (
    <div className="auth-beta-atmosphere" aria-hidden="true">
      <svg className="auth-beta-lines" viewBox="0 0 1200 720" fill="none" preserveAspectRatio="none">
        <path d="M90 520 C250 380 365 620 520 470 C690 305 790 418 930 265 C1020 167 1100 186 1160 92" />
        <path d="M44 178 C210 116 314 240 452 170 C612 90 720 194 858 140 C996 86 1080 98 1176 46" />
        <path d="M170 660 C300 594 420 640 552 572 C700 496 800 552 938 468 C1044 404 1114 412 1190 360" />
      </svg>
      <div className="auth-beta-orbit auth-beta-orbit-1">
        <ReceiptText />
      </div>
      <div className="auth-beta-orbit auth-beta-orbit-2">
        <Split />
      </div>
      <div className="auth-beta-orbit auth-beta-orbit-3">
        <ChartNoAxesCombined />
      </div>
      <div className="auth-beta-orbit auth-beta-orbit-4">
        <ShieldCheck />
      </div>
      <div className="auth-beta-orbit auth-beta-orbit-5">
        <Sparkles />
      </div>
    </div>
  );

  const renderBetaLayout = () => (
    <div
      className="auth-beta-shell relative min-h-svh w-full overflow-x-hidden px-4 py-3 text-foreground sm:px-6 lg:h-svh lg:max-h-svh lg:overflow-hidden lg:px-8"
      data-auth-mode={isLoginView ? "signin" : "signup"}
    >
      {renderBetaAtmosphere()}

      <div className="relative z-10 mx-auto flex h-12 w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/85 shadow-sm backdrop-blur-md">
            <HandCoins className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5">SettleEase</p>
            <p className="truncate text-xs text-muted-foreground">v{packageJson.version}</p>
          </div>
        </div>
        {renderDesignToggle()}
      </div>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-4 py-3 lg:h-[calc(100svh-72px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.78fr)] lg:items-center lg:gap-8 lg:overflow-hidden">
        <section className="hidden min-w-0 space-y-4 lg:block">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-foreground" />
              Built for shared money without the awkward follow-up
            </div>
            <div className="space-y-4">
              <h1 className="auth-beta-hero-title max-w-3xl text-[clamp(2.45rem,5.4vw,4.65rem)] font-light leading-[0.98] tracking-tight text-foreground">
                Settle shared expenses without the after-trip math.
              </h1>
              <p className="max-w-2xl text-base leading-7 tracking-[0.01em] text-muted-foreground sm:text-lg">
                Add people, scan receipts, split precisely, and leave with a clean settlement plan. The form is right here when you are ready.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {betaBenefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="auth-beta-benefit rounded-2xl border border-border/70 bg-background/72 p-3.5 shadow-sm backdrop-blur-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-[#f5f2ef]/80 text-foreground shadow-sm dark:bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold tracking-[0.01em]">{title}</h2>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="auth-beta-proof-row grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3 py-2 shadow-sm backdrop-blur-md">
              <BadgeCheck className="h-4 w-4 text-foreground" />
              Admin controls
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3 py-2 shadow-sm backdrop-blur-md">
              <ScanLine className="h-4 w-4 text-foreground" />
              Smart receipts
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/65 px-3 py-2 shadow-sm backdrop-blur-md">
              <WalletCards className="h-4 w-4 text-foreground" />
              Clear settlements
            </div>
          </div>
        </section>

        <section className="min-h-0">
          <Card className="auth-beta-card mx-auto flex w-full max-w-[460px] flex-col overflow-hidden rounded-[1.75rem] border-border/70 bg-card/95 shadow-xl backdrop-blur-xl">
            <CardHeader className="auth-beta-card-header space-y-4 p-6 pb-3 sm:p-8 sm:pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="auth-beta-card-mark flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-[#f5f2ef]/85 shadow-sm dark:bg-muted">
                  <HandCoins className="h-6 w-6" />
                </div>
                <div className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {isLoginView ? "Returning" : "New account"}
                </div>
              </div>
              <div>
                <CardTitle className="auth-beta-card-title text-3xl font-light leading-tight tracking-tight sm:text-4xl">
                  {isLoginView ? "Welcome back." : "Create your account."}
                </CardTitle>
                <p className="auth-beta-card-copy mt-2 text-sm leading-6 text-muted-foreground">
                  {isLoginView
                    ? "Sign in to manage expenses, settlements, and reports."
                    : "Start with your name, then invite the group once you are inside."}
                </p>
              </div>
            </CardHeader>
            <CardContent className="auth-beta-card-content flex min-h-0 flex-1 flex-col px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
              <div className="flex flex-col">
                {renderAuthControls('beta')}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="auth-beta-mobile-story lg:hidden" aria-label="SettleEase highlights">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Why SettleEase
            </p>
            <h2 className="text-2xl font-light tracking-tight">
              Shared money without the after-trip math.
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Add people, scan receipts, split precisely, and leave with a clean settlement plan.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {betaBenefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="auth-beta-mobile-benefit">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );

  return (
    <>
      {isBetaDesign ? renderBetaLayout() : renderClassicLayout()}

      <GoogleOAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onConfirm={handleGoogleOAuthConfirm}
        isSignIn={isLoginView}
        isLoading={isGoogleLoading}
      />
    </>
  );
}
