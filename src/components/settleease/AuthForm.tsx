"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, HandCoins, Zap, Users, PieChart, PartyPopper, Settings2, AlertTriangle, Lightbulb, Shield, Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getGoogleButtonText, getGoogleOAuthParams, getAuthErrorMessage, getAuthSuggestion } from '@/lib/settleease/authUtils';
import GoogleOAuthModal from './GoogleOAuthModal';
import packageJson from '../../../package.json';
import { GoogleMark } from './BrandAssets';


interface AuthFormProps {
  supabase: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void;
}

export default function AuthForm({ supabase, onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoginView, setIsLoginView] = useState(true); // Changed default to true (Sign In)
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
  // Refs for auto-focus
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Helper function to properly capitalize names (first letter uppercase, rest lowercase)
  const capitalizeFirstLetter = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Auto-focus effect when view changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoginView) {
        // Focus on email for sign in
        emailRef.current?.focus();
      } else {
        // Focus on first name for sign up
        firstNameRef.current?.focus();
      }
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, [isLoginView]);

  // Reset Google loading state on component mount and when user navigates back
  useEffect(() => {
    // Listen for page visibility changes (when user returns from OAuth)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isGoogleLoading) {
        // User returned to the page, reset the loading state
        console.log("Visibility change detected, resetting Google loading state");
        setIsGoogleLoading(false);
      }
    };

    // Listen for focus events (when user returns to the tab/window)
    const handleWindowFocus = () => {
      if (isGoogleLoading) {
        // User returned to the window, reset the loading state
        console.log("Window focus detected, resetting Google loading state");
        setIsGoogleLoading(false);
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Cleanup event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isGoogleLoading]);

  // Reset Google loading state only on initial mount
  useEffect(() => {
    console.log("Component mounted, resetting Google loading state");
    setIsGoogleLoading(false);
  }, []); // Empty dependency array means this only runs once on mount

  // Handle resending confirmation email (only for verified accounts)
  const handleResendConfirmation = async () => {
    if (!supabase || !resendEmail || !password) return;

    setIsLoading(true);
    try {
      // Use the original password that was verified to trigger email resend
      const { error } = await supabase.auth.signUp({
        email: resendEmail,
        password: password, // Use the actual password that was verified
      });

      // Show success toast
      toast({
        title: "Confirmation Email Sent",
        description: "We've sent a new confirmation link to your email. Please check your inbox and spam folder.",
        variant: "default"
      });

      setShowResendConfirmation(false);
      setHasAuthError(false);
      setAuthErrorType('');

    } catch (err) {
      // Show success toast (email likely sent even if API "fails")
      toast({
        title: "Confirmation Email Sent",
        description: "We've sent a new confirmation link to your email. Please check your inbox and spam folder.",
        variant: "default"
      });

      setShowResendConfirmation(false);
      setHasAuthError(false);
      setAuthErrorType('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: "Authentication Error", description: "Supabase auth is not available. Please try again later.", variant: "destructive" });
      return;
    }
    if (!email || !password) {
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

    const productionSiteUrl = "https://settleease-navy.vercel.app/";

    try {
      if (isLoginView) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          // Check if this is an unconfirmed email error
          if (signInError.code === 'email_not_confirmed' || signInError.message.toLowerCase().includes('email not confirmed')) {
            // SECURITY NOTE: Supabase only returns 'email_not_confirmed' when BOTH email and password are correct
            // If password was wrong, Supabase would return 'invalid_credentials' instead
            // Therefore, it's safe to show resend option here - user has proven they own the account
            toast({
              title: "Email Not Verified",
              description: "Your account exists but hasn't been verified yet. Please check your email and click the verification link to activate your account before signing in.",
              variant: "destructive"
            });
            setHasAuthError(true);
            setAuthErrorType('email_not_confirmed');
            setShowResendConfirmation(true);
            setResendEmail(email);
            setIsLoading(false);
            return;
          }

          throw signInError;
        }

        // Don't show toast here for returning users
        // Let page.tsx handle the "Welcome back!" toast so it can show the appropriate message.
        setHasAuthError(false);
        setAuthErrorType('');
        if (data.user && onAuthSuccess) onAuthSuccess(data.user);
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: productionSiteUrl,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
          },
        });

        // Handle specific signup errors
        if (signUpError) {
          console.log('Signup error details:', {
            code: signUpError.code,
            message: signUpError.message,
            hasUser: !!data.user,
            hasSession: !!data.session,
            userConfirmed: data.user ? (data.user as any).email_confirmed_at : null
          });

          // For existing user errors, always show "account exists" message
          if (signUpError.message?.toLowerCase().includes('already') ||
            signUpError.code === 'user_already_exists' ||
            signUpError.code === 'email_exists') {

            toast({
              title: "Account Already Exists",
              description: "An account with this email already exists. Please sign in instead, or use 'Forgot Password' if you need to reset your password.",
              variant: "destructive"
            });
            setHasAuthError(true);
            return;
          }

          // For other errors, throw them to be handled by the catch block
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

        // Handle the case where user exists but no session is created
        if (data.user && !data.session) {
          // This should now only happen for legitimate new signups requiring email confirmation
          toast({
            title: "Check Your Email",
            description: "We've sent a confirmation link to your email. Please check your inbox and click the link to activate your account.",
            variant: "default"
          });
          setHasAuthError(false);
          return;
        }

        // If signup successful and we have a user, update their profile with names
        if (data.user && data.session) {
          try {
            await upsertUserProfile({
              supabaseUserId: data.user.id,
              email: data.user.email || undefined,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            });
          } catch (profileErr) {
            console.warn('Failed to update Convex profile during signup:', profileErr);
          }
        }

        // Handle successful signup with immediate session
        if (data.session && data.user) {
          // NO toast here - page.tsx handles all welcome toasts centrally
          // Set flag to show welcome toast
          try {
            await markSignIn({
              supabaseUserId: data.user.id,
              email: data.user.email || undefined,
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
          // This case should be handled above, but keeping as fallback
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

    // Show confirmation modal
    setShowGoogleModal(true);
  };

  const handleGoogleOAuthConfirm = async () => {
    console.log("Google OAuth: Starting authentication process");
    setIsGoogleLoading(true);

    // Add a small delay to ensure the loading state is rendered before redirect
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Google OAuth: Loading state set, isGoogleLoading should be true");

    const productionSiteUrl = "https://settleease-navy.vercel.app/";

    try {
      console.log("Google OAuth: Calling signInWithOAuth");
      const { error: googleError } = await supabase!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: productionSiteUrl,
          queryParams: getGoogleOAuthParams(isLoginView),
        },
      });

      if (googleError) {
        console.error("Google OAuth: Error from signInWithOAuth:", googleError);
        throw googleError;
      }

      console.log("Google OAuth: signInWithOAuth successful, user should be redirected");

      // Set a timeout to reset states if OAuth doesn't complete
      // This handles cases where user closes the OAuth popup or navigates back
      setTimeout(() => {
        console.log("Google OAuth: Timeout reached, resetting loading states");
        setIsGoogleLoading(false);
        setShowGoogleModal(false);
      }, 10000); // Reset after 10 seconds

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

  return (
    <>


      <Card className="w-full max-w-4xl shadow-xl rounded-lg overflow-hidden min-h-screen md:min-h-[680px] md:h-[680px]">
        <div className="md:flex h-full md:min-h-[680px] md:h-[680px]"> {/* Fixed height for modal and flex container on md+ */}
          {/* Left Pane: Branding & Features */}
          <div className={`md:w-2/5 flex flex-col px-6 py-8 sm:px-10 sm:py-10 transition-colors duration-300 ease-in-out min-h-[400px] md:min-h-[680px] md:h-[680px] h-full` + (isLoginView ? ' bg-secondary/20 text-primary' : ' bg-primary text-primary-foreground')}>
            <div className="flex flex-col flex-1 justify-center min-h-0 h-full">
              {isLoginView ? (
                <div className="flex flex-col flex-1 items-center justify-center text-center h-full px-2">
                  <HandCoins className="h-16 sm:h-20 w-16 sm:w-20 mx-auto mb-4 sm:mb-6 text-primary" />
                  <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">Welcome Back!</h1>
                  <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">
                    Sign in to continue simplifying your group expenses.
                  </p>

                  {/* Mobile Security Badge - Only show on mobile for login view */}
                  <div className="md:hidden mt-6 space-y-2">
                    <div className="flex items-center justify-center space-x-2 px-3 py-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full shadow-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Protected by <span className="text-primary font-semibold">SettleSecure</span>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 text-center">SettleEase v{packageJson.version}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 sm:mb-7 text-center md:text-left">
                    <HandCoins className="h-12 sm:h-16 w-12 sm:w-16 mx-auto md:mx-0 mb-3 sm:mb-4 text-primary-foreground/90" />
                    <h1 className="text-3xl sm:text-4xl font-bold font-headline">SettleEase</h1>
                    <p className="mt-1 sm:mt-2 text-md sm:text-lg text-primary-foreground/90">
                      The smartest way to manage shared expenses.
                    </p>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 text-center md:text-left">Why SettleEase?</h3>
                  <ul className="space-y-3 sm:space-y-3.5 text-xs sm:text-sm">
                    <li className="flex items-start"><Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-3 sm:mr-3.5 mt-0.5 text-primary-foreground/80 shrink-0" /> <span><strong>AI-Powered Insights:</strong> Get intelligent summaries of your spending patterns.</span></li>
                    <li className="flex items-start"><Users className="h-4 w-4 sm:h-5 sm:w-5 mr-3 sm:mr-3.5 mt-0.5 text-primary-foreground/80 shrink-0" /> <span><strong>Flexible Splitting:</strong> Equal, unequal, or item-by-item splits with ease.</span></li>
                    <li className="flex items-start"><PieChart className="h-4 w-4 sm:h-5 sm:w-5 mr-3 sm:mr-3.5 mt-0.5 text-primary-foreground/80 shrink-0" /> <span><strong>Advanced Analytics:</strong> Visualize spending with charts, heatmaps, and trends.</span></li>
                    <li className="flex items-start"><PartyPopper className="h-4 w-4 sm:h-5 sm:w-5 mr-3 sm:mr-3.5 mt-0.5 text-primary-foreground/80 shrink-0" /> <span><strong>Smart Settlements:</strong> Optimized payment plans that minimize transactions.</span></li>
                    <li className="flex items-start"><Settings2 className="h-4 w-4 sm:h-5 sm:w-5 mr-3 sm:mr-3.5 mt-0.5 text-primary-foreground/80 shrink-0" /> <span><strong>Customizable:</strong> Choose from 1000+ icons and personalize categories.</span></li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Right Pane: Form */}
          <div className="md:w-3/5 px-6 py-8 sm:px-10 sm:py-10 flex flex-col justify-center min-h-0 md:min-h-[680px] md:h-[680px] h-full">
            <div className="flex flex-col justify-center flex-1 min-h-0 h-full">
              <CardHeader className="px-0 pt-0 pb-4 text-center">
                <CardTitle className="flex items-center text-xl sm:text-2xl font-bold">
                  {isLoginView ? 'Sign In' : 'Create your Account'}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-0 pb-0 space-y-3 sm:space-y-4">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  {!isLoginView && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 sm:space-y-1.5">
                        <Label htmlFor="firstName" className="text-sm">First Name</Label>
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
                          className="h-10 sm:h-11"
                        />
                      </div>
                      <div className="space-y-1 sm:space-y-1.5">
                        <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                        <Input
                          id="lastName"
                          type="text"
                          autoComplete="family-name"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(capitalizeFirstLetter(e.target.value))}
                          disabled={isLoading || isGoogleLoading}
                          required
                          className="h-10 sm:h-11"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="email" className="text-sm">Email Address</Label>
                    <Input
                      ref={emailRef}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // Reset resend confirmation when email changes
                        if (showResendConfirmation) {
                          setShowResendConfirmation(false);
                          setResendEmail('');
                        }
                      }}
                      disabled={isLoading || isGoogleLoading}
                      required
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isLoginView ? "current-password" : "new-password"}
                        placeholder={isLoginView ? "••••••••" : "•••••••• (min. 6 characters)"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          // Reset resend confirmation when password changes
                          if (showResendConfirmation) {
                            setShowResendConfirmation(false);
                            setResendEmail('');
                          }
                        }}
                        disabled={isLoading || isGoogleLoading}
                        required
                        minLength={6}
                        className="h-10 sm:h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading || isGoogleLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {/* Conditional button/resend section */}
                  {showResendConfirmation ? (
                    // Show resend section instead of Sign In/Create Account button
                    <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <div className="text-center">
                        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                          {isLoginView ? "Email Not Verified" : "Account Exists - Email Confirmation Needed"}
                        </h3>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Your account exists but hasn't been verified yet. Please check your email for the confirmation link, or resend it below.
                        </p>
                      </div>
                      <Button
                        onClick={handleResendConfirmation}
                        disabled={isLoading}
                        className="w-full h-10 text-sm sm:h-11 sm:text-base font-semibold bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
                      >
                        {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
                      </Button>
                    </div>
                  ) : (
                    // Show normal submit button
                    <Button type="submit" className="w-full h-10 text-sm sm:h-11 sm:text-base font-semibold" disabled={isLoading || isGoogleLoading}>
                      {isLoading ? (isLoginView ? 'Logging in...' : 'Creating Account...') : (isLoginView ? <><LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Sign In</> : <><UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Create Account</>)}
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
                  className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                >
                  <GoogleMark size={18} />
                  <span className="ml-2.5">
                    {getGoogleButtonText(isLoginView, isGoogleLoading)}
                  </span>
                </Button>


              </CardContent>

              <CardFooter className="px-0 pt-3 sm:pt-4 pb-0 flex-col items-center">


                {hasAuthError && !showResendConfirmation && getAuthSuggestion(isLoginView, hasAuthError, authErrorType) && (
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-700 dark:text-blue-300 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Lightbulb className="h-4 w-4 shrink-0" />
                      <span>{getAuthSuggestion(isLoginView, hasAuthError, authErrorType)?.text}</span>
                    </div>
                  </div>
                )}
                <Button variant="link" onClick={() => {
                  setIsLoginView(!isLoginView);
                  // Clear form fields when switching views
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setPassword('');
                  setHasAuthError(false); // Reset error state
                  setAuthErrorType(''); // Reset error type
                  setShowResendConfirmation(false); // Reset resend state
                  setResendEmail('');
                  setIsGoogleLoading(false); // Reset Google loading state
                }} disabled={isLoading || isGoogleLoading} className="text-sm text-primary hover:text-primary/80">
                  {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </Button>
              </CardFooter>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Branding Footer - Hidden on mobile */}
      <div className="hidden md:block fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 space-y-2">
        <div className="flex items-center space-x-2 px-3 py-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full shadow-sm">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground font-medium">
            Protected by <span className="text-primary font-semibold">SettleSecure</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground/70 text-center">SettleEase v{packageJson.version}</p>
      </div>

      {/* Google OAuth Confirmation Modal */}
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
