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
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Split,
  UserPlus,
  WalletCards,
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

const AUTH_REDIRECT_URL = "https://settleease-navy.vercel.app/";

const authBenefits = [
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

  const upsertUserProfile = useMutation(api.app.upsertUserProfile);
  const markSignIn = useMutation(api.app.markSignIn);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const authSuggestion = getAuthSuggestion(isLoginView, hasAuthError, authErrorType);

  const capitalizeFirstLetter = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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

  const renderAuthControls = () => {
    const inputClassName = "h-11 rounded-full border-border/80 bg-background/95 px-4 shadow-sm focus-visible:ring-ring";
    const passwordInputClassName = "h-11 rounded-full border-border/80 bg-background/95 pl-4 pr-12 shadow-sm focus-visible:ring-ring";
    const labelClassName = "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";

    return (
      <>
        <form onSubmit={handleSubmit} className="auth-page-form space-y-4">
            <div className="auth-page-name-slot">
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

            <div className="auth-page-action-slot">
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
                  className="auth-page-primary-button h-11 w-full rounded-full text-sm font-semibold shadow-[rgba(78,50,23,0.08)_0px_10px_24px] sm:text-base"
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

        <div className="auth-page-status-slot">
          {hasAuthError && !showResendConfirmation && authSuggestion ? (
            <div className="rounded-2xl border border-border/70 bg-muted/60 p-2 text-center text-xs text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{authSuggestion.text}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="auth-page-switch-slot">
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
  };

  const renderAuthAtmosphere = () => (
    <div className="auth-page-atmosphere" aria-hidden="true">
      <svg className="auth-page-lines" viewBox="0 0 1200 720" fill="none" preserveAspectRatio="none">
        <path d="M90 520 C250 380 365 620 520 470 C690 305 790 418 930 265 C1020 167 1100 186 1160 92" />
        <path d="M44 178 C210 116 314 240 452 170 C612 90 720 194 858 140 C996 86 1080 98 1176 46" />
        <path d="M170 660 C300 594 420 640 552 572 C700 496 800 552 938 468 C1044 404 1114 412 1190 360" />
      </svg>
      <div className="auth-page-orbit auth-page-orbit-1">
        <ReceiptText />
      </div>
      <div className="auth-page-orbit auth-page-orbit-2">
        <Split />
      </div>
      <div className="auth-page-orbit auth-page-orbit-3">
        <ChartNoAxesCombined />
      </div>
      <div className="auth-page-orbit auth-page-orbit-4">
        <ShieldCheck />
      </div>
      <div className="auth-page-orbit auth-page-orbit-5">
        <Sparkles />
      </div>
    </div>
  );

  const renderAuthLayout = () => (
    <div
      className="auth-page-shell relative min-h-svh w-full overflow-x-hidden px-4 py-3 text-foreground sm:px-6 lg:h-svh lg:max-h-svh lg:overflow-hidden lg:px-8"
      data-auth-mode={isLoginView ? "signin" : "signup"}
    >
      {renderAuthAtmosphere()}

      <div className="relative z-10 mx-auto flex h-12 w-full max-w-7xl items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/85 shadow-sm backdrop-blur-md">
            <HandCoins className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-5">SettleEase</p>
            <p className="truncate text-xs text-muted-foreground">v{packageJson.version}</p>
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-4 py-3 lg:h-[calc(100svh-72px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.78fr)] lg:items-center lg:gap-8 lg:overflow-hidden">
        <section className="hidden min-w-0 space-y-4 lg:block">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-foreground" />
              Built for shared money without the awkward follow-up
            </div>
            <div className="space-y-4">
              <h1 className="auth-page-hero-title max-w-3xl text-[clamp(2.45rem,5.4vw,4.65rem)] font-light leading-[0.98] tracking-tight text-foreground">
                Settle shared expenses without the after-trip math.
              </h1>
              <p className="max-w-2xl text-base leading-7 tracking-[0.01em] text-muted-foreground sm:text-lg">
                Add people, scan receipts, split precisely, and leave with a clean settlement plan. The form is right here when you are ready.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {authBenefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="auth-page-benefit rounded-2xl border border-border/70 bg-background/72 p-3.5 shadow-sm backdrop-blur-md">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-[#f5f2ef]/80 text-foreground shadow-sm dark:bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold tracking-[0.01em]">{title}</h2>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="auth-page-proof-row grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
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
          <Card className="auth-page-card mx-auto flex w-full max-w-[460px] flex-col overflow-hidden rounded-[1.75rem] border-border/70 bg-card/95 shadow-xl backdrop-blur-xl">
            <CardHeader className="auth-page-card-header space-y-4 p-6 pb-3 sm:p-8 sm:pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="auth-page-card-mark flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-[#f5f2ef]/85 shadow-sm dark:bg-muted">
                  <HandCoins className="h-6 w-6" />
                </div>
                <div className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {isLoginView ? "Returning" : "New account"}
                </div>
              </div>
              <div>
                <CardTitle className="auth-page-card-title text-3xl font-light leading-tight tracking-tight sm:text-4xl">
                  {isLoginView ? "Welcome back." : "Create your account."}
                </CardTitle>
                <p className="auth-page-card-copy mt-2 text-sm leading-6 text-muted-foreground">
                  {isLoginView
                    ? "Sign in to manage expenses, settlements, and reports."
                    : "Start with your name, then invite the group once you are inside."}
                </p>
              </div>
            </CardHeader>
            <CardContent className="auth-page-card-content flex min-h-0 flex-1 flex-col px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
              <div className="flex flex-col">
                {renderAuthControls()}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="auth-page-mobile-story lg:hidden" aria-label="SettleEase highlights">
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
            {authBenefits.map(({ icon: Icon, title, description }) => (
              <div key={title} className="auth-page-mobile-benefit">
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
      {renderAuthLayout()}

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
