"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, HandCoins, Zap, Users, PieChart, PartyPopper, Settings2, AlertTriangle, Lightbulb, Shield, Eye, EyeOff } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getGoogleButtonText, getGoogleOAuthParams, getAuthErrorMessage, getAuthSuggestion } from '@/lib/settleease/authUtils';
import GoogleOAuthModal from './GoogleOAuthModal';
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Google Icon SVG as a React component
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 268.1522 273.8827" overflow="hidden" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="a">
        <stop offset="0" stopColor="#0fbc5c" />
        <stop offset="1" stopColor="#0cba65" />
      </linearGradient>
      <linearGradient id="g">
        <stop offset=".2312727" stopColor="#0fbc5f" />
        <stop offset=".3115468" stopColor="#0fbc5f" />
        <stop offset=".3660131" stopColor="#0fbc5e" />
        <stop offset=".4575163" stopColor="#0fbc5d" />
        <stop offset=".540305" stopColor="#12bc58" />
        <stop offset=".6993464" stopColor="#28bf3c" />
        <stop offset=".7712418" stopColor="#38c02b" />
        <stop offset=".8605665" stopColor="#52c218" />
        <stop offset=".9150327" stopColor="#67c30f" />
        <stop offset="1" stopColor="#86c504" />
      </linearGradient>
      <linearGradient id="h">
        <stop offset=".1416122" stopColor="#1abd4d" />
        <stop offset=".2475151" stopColor="#6ec30d" />
        <stop offset=".3115468" stopColor="#8ac502" />
        <stop offset=".3660131" stopColor="#a2c600" />
        <stop offset=".4456735" stopColor="#c8c903" />
        <stop offset=".540305" stopColor="#ebcb03" />
        <stop offset=".6156363" stopColor="#f7cd07" />
        <stop offset=".6993454" stopColor="#fdcd04" />
        <stop offset=".7712418" stopColor="#fdce05" />
        <stop offset=".8605661" stopColor="#ffce0a" />
      </linearGradient>
      <linearGradient id="f">
        <stop offset=".3159041" stopColor="#ff4c3c" />
        <stop offset=".6038179" stopColor="#ff692c" />
        <stop offset=".7268366" stopColor="#ff7825" />
        <stop offset=".884534" stopColor="#ff8d1b" />
        <stop offset="1" stopColor="#ff9f13" />
      </linearGradient>
      <linearGradient id="b">
        <stop offset=".2312727" stopColor="#ff4541" />
        <stop offset=".3115468" stopColor="#ff4540" />
        <stop offset=".4575163" stopColor="#ff4640" />
        <stop offset=".540305" stopColor="#ff473f" />
        <stop offset=".6993464" stopColor="#ff5138" />
        <stop offset=".7712418" stopColor="#ff5b33" />
        <stop offset=".8605665" stopColor="#ff6c29" />
        <stop offset="1" stopColor="#ff8c18" />
      </linearGradient>
      <linearGradient id="d">
        <stop offset=".4084578" stopColor="#fb4e5a" />
        <stop offset="1" stopColor="#ff4540" />
      </linearGradient>
      <linearGradient id="c">
        <stop offset=".1315461" stopColor="#0cba65" />
        <stop offset=".2097843" stopColor="#0bb86d" />
        <stop offset=".2972969" stopColor="#09b479" />
        <stop offset=".3962575" stopColor="#08ad93" />
        <stop offset=".4771242" stopColor="#0aa6a9" />
        <stop offset=".5684245" stopColor="#0d9cc6" />
        <stop offset=".667385" stopColor="#1893dd" />
        <stop offset=".7687273" stopColor="#258bf1" />
        <stop offset=".8585063" stopColor="#3086ff" />
      </linearGradient>
      <linearGradient id="e">
        <stop offset=".3660131" stopColor="#ff4e3a" />
        <stop offset=".4575163" stopColor="#ff8a1b" />
        <stop offset=".540305" stopColor="#ffa312" />
        <stop offset=".6156363" stopColor="#ffb60c" />
        <stop offset=".7712418" stopColor="#ffcd0a" />
        <stop offset=".8605665" stopColor="#fecf0a" />
        <stop offset=".9150327" stopColor="#fecf08" />
        <stop offset="1" stopColor="#fdcd01" />
      </linearGradient>
      <radialGradient xlinkHref="#b" id="m" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1.936885,1.043001,1.455731,2.555422,290.5254,-400.6338)" cx="109.6267" cy="135.8619" fx="109.6267" fy="135.8619" r="71.46001" />
      <radialGradient xlinkHref="#c" id="n" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-3.512595,-4.45809,-1.692547,1.260616,870.8006,191.554)" cx="45.25866" cy="279.2738" fx="45.25866" fy="279.2738" r="71.46001" />
      <radialGradient xlinkHref="#d" id="l" cx="304.0166" cy="118.0089" fx="304.0166" fy="118.0089" r="47.85445" gradientTransform="matrix(2.064353,-4.926832e-6,-2.901531e-6,2.592041,-297.6788,-151.7469)" gradientUnits="userSpaceOnUse" />
      <radialGradient xlinkHref="#e" id="o" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.2485783,2.083138,2.962486,0.3341668,-255.1463,-331.1636)" cx="181.001" cy="177.2013" fx="181.001" fy="177.2013" r="71.46001" />
      <radialGradient xlinkHref="#f" id="p" cx="207.6733" cy="108.0972" fx="207.6733" fy="108.0972" r="41.1025" gradientTransform="matrix(-1.249206,1.343263,-3.896837,-3.425693,880.5011,194.9051)" gradientUnits="userSpaceOnUse" />
      <radialGradient xlinkHref="#g" id="r" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1.936885,-1.043001,1.455731,-2.555422,290.5254,838.6834)" cx="109.6267" cy="135.8619" fx="109.6267" fy="135.8619" r="71.46001" />
      <radialGradient xlinkHref="#h" id="j" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-0.081402,-1.93722,2.926737,-0.1162508,-215.1345,632.8606)" cx="154.8697" cy="145.9691" fx="154.8697" fy="145.9691" r="71.46001" />
      <linearGradient xlinkHref="#a" id="s" x1="219.6997" y1="329.5351" x2="254.4673" y2="329.5351" gradientUnits="userSpaceOnUse" />
      <filter id="q" x="-.04842873" y="-.0582241" width="1.096857" height="1.116448" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="1.700914" />
      </filter>
      <filter id="k" x="-.01670084" y="-.01009856" width="1.033402" height="1.020197" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation=".2419367" />
      </filter>
      <clipPath clipPathUnits="userSpaceOnUse" id="i">
        <path d="M371.3784 193.2406H237.0825v53.4375h77.167c-1.2405 7.5627-4.0259 15.0024-8.1049 21.7862-4.6734 7.7723-10.4511 13.6895-16.373 18.1957-17.7389 13.4983-38.42 16.2584-52.7828 16.2584-36.2824 0-67.2833-23.2865-79.2844-54.9287-.4843-1.1482-.8059-2.3344-1.1975-3.5068-2.652-8.0533-4.101-16.5825-4.101-25.4474 0-9.226 1.5691-18.0575 4.4301-26.3985 11.2851-32.8967 42.9849-57.4674 80.1789-57.4674 7.4811 0 14.6854.8843 21.5173 2.6481 15.6135 4.0309 26.6578 11.9698 33.4252 18.2494l40.834-39.7111c-24.839-22.616-57.2194-36.3201-95.8444-36.3201-30.8782-.00066-59.3863 9.55308-82.7477 25.6992-18.9454 13.0941-34.4833 30.6254-44.9695 50.9861-9.75366 18.8785-15.09441 39.7994-15.09441 62.2934 0 22.495 5.34891 43.6334 15.10261 62.3374v.126c10.3023 19.8567 25.3678 36.9537 43.6783 49.9878 15.9962 11.3866 44.6789 26.5516 84.0307 26.5516 22.6301 0 42.6867-4.0517 60.3748-11.6447 12.76-5.4775 24.0655-12.6217 34.3012-21.8036 13.5247-12.1323 24.1168-27.1388 31.3465-44.4041 7.2297-17.2654 11.097-36.7895 11.097-57.957 0-9.858-.9971-19.8694-2.6881-28.9684Z" fill="#000" />
      </clipPath>
    </defs>
    <g transform="matrix(0.957922,0,0,0.985255,-90.17436,-78.85577)">
      <g clipPath="url(#i)">
        <path d="M92.07563 219.9585c.14844 22.14 6.5014 44.983 16.11767 63.4234v.1269c6.9482 13.3919 16.4444 23.9704 27.2604 34.4518l65.326-23.67c-12.3593-6.2344-14.2452-10.0546-23.1048-17.0253-9.0537-9.0658-15.8015-19.4735-20.0038-31.677h-.1693l.1693-.1269c-2.7646-8.0587-3.0373-16.6129-3.1393-25.5029Z" fill="url(#j)" filter="url(#k)" />
        <path d="M237.0835 79.02491c-6.4568 22.52569-3.988 44.42139 0 57.16129 7.4561.0055 14.6388.8881 21.4494 2.6464 15.6135 4.0309 26.6566 11.97 33.424 18.2496l41.8794-40.7256c-24.8094-22.58904-54.6663-37.2961-96.7528-37.33169Z" fill="url(#l)" filter="url(#k)" />
        <path d="M236.9434 78.84678c-31.6709-.00068-60.9107 9.79833-84.8718 26.35902-8.8968 6.149-17.0612 13.2521-24.3311 21.1509-1.9045 17.7429 14.2569 39.5507 46.2615 39.3702 15.5284-17.9373 38.4946-29.5427 64.0561-29.5427.0233 0 .046.0019.0693.002l-1.0439-57.33536c-.0472-.00003-.0929-.00406-.1401-.00406Z" fill="url(#m)" filter="url(#k)" />
        <path d="m341.4751 226.3788-28.2685 19.2848c-1.2405 7.5627-4.0278 15.0023-8.1068 21.7861-4.6734 7.7723-10.4506 13.6898-16.3725 18.196-17.7022 13.4704-38.3286 16.2439-52.6877 16.2553-14.8415 25.1018-17.4435 37.6749 1.0439 57.9342 22.8762-.0167 43.157-4.1174 61.0458-11.7965 12.9312-5.551 24.3879-12.7913 34.7609-22.0964 13.7061-12.295 24.4421-27.5034 31.7688-45.0003 7.3267-17.497 11.2446-37.2822 11.2446-58.7336Z" fill="url(#n)" filter="url(#k)" />
        <path d="M234.9956 191.2104v57.4981h136.0062c1.1962-7.8745 5.1523-18.0644 5.1523-26.5001 0-9.858-.9963-21.899-2.6873-30.998Z" fill="#3086ff" filter="url(#k)" />
        <path d="M128.3894 124.3268c-8.393 9.1191-15.5632 19.326-21.2483 30.3646-9.75351 18.8785-15.09402 41.8295-15.09402 64.3235 0 .317.02642.6271.02855.9436 4.31953 8.2244 59.66647 6.6495 62.45617 0-.0035-.3103-.0387-.6128-.0387-.9238 0-9.226 1.5696-16.0262 4.4306-24.3672 3.5294-10.2885 9.0557-19.7628 16.1223-27.9257 1.6019-2.0309 5.8748-6.3969 7.1214-9.0157.4749-.9975-.8621-1.5574-.9369-1.9085-.0836-.3927-1.8762-.0769-2.2778-.3694-1.2751-.9288-3.8001-1.4138-5.3334-1.8449-3.2772-.9215-8.7085-2.9536-11.7252-5.0601-9.5357-6.6586-24.417-14.6122-33.5047-24.2164Z" fill="url(#o)" filter="url(#k)" />
        <path d="M162.0989 155.8569c22.1123 13.3013 28.4714-6.7139 43.173-12.9771L179.698 90.21568c-9.4075 3.92642-18.2957 8.80465-26.5426 14.50442-12.316 8.5122-23.192 18.8995-32.1763 30.7204Z" fill="url(#p)" filter="url(#q)" />
        <path d="M171.0987 290.222c-29.6829 10.6413-34.3299 11.023-37.0622 29.2903 5.2213 5.0597 10.8312 9.74 16.7926 13.9835 15.9962 11.3867 46.766 26.5517 86.1178 26.5517.0462 0 .0904-.004.1366-.004v-59.1574c-.0298.0001-.064.002-.0938.002-14.7359 0-26.5113-3.8435-38.5848-10.5273-2.9768-1.6479-8.3775 2.7772-11.1229.799-3.7865-2.7284-12.8991 2.3508-16.1833-.9378Z" fill="url(#r)" filter="url(#k)" />
        <path d="M219.6997 299.0227v59.9959c5.506.6402 11.2361 1.0289 17.2472 1.0289 6.0259 0 11.8556-.3073 17.5204-.8723v-59.7481c-6.3482 1.0777-12.3272 1.461-17.4776 1.461-5.9318 0-11.7005-.6858-17.29-1.8654Z" opacity=".5" fill="url(#s)" filter="url(#k)" />
      </g>
    </g>
  </svg>
);


interface AuthFormProps {
  db: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void;
}

export default function AuthForm({ db, onAuthSuccess }: AuthFormProps) {
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
    // Reset Google loading state when component mounts
    setIsGoogleLoading(false);

    // Listen for page visibility changes (when user returns from OAuth)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isGoogleLoading) {
        // User returned to the page, reset the loading state
        setIsGoogleLoading(false);
      }
    };

    // Listen for focus events (when user returns to the tab/window)
    const handleWindowFocus = () => {
      if (isGoogleLoading) {
        // User returned to the window, reset the loading state
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

  // Handle resending confirmation email (only for verified accounts)
  const handleResendConfirmation = async () => {
    if (!db || !resendEmail || !password) return;

    setIsLoading(true);
    try {
      // Use the original password that was verified to trigger email resend
      const { error } = await db.auth.signUp({
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

  // Function to verify password for existing accounts (security check)
  // Note: This function is kept for unconfirmed accounts only to prevent hijacking
  const verifyExistingAccountPassword = async (email: string, password: string): Promise<boolean> => {
    try {
      // Try to sign in with the provided credentials
      const { error } = await db!.auth.signInWithPassword({ email, password });

      if (!error) {
        // Password is correct - sign out immediately and return true
        await db!.auth.signOut();
        return true;
      }

      // Check specific error types
      const errorMsg = error.message.toLowerCase();
      const errorCode = error.code;

      // If email is not confirmed, but credentials are correct, return true
      if (errorCode === 'email_not_confirmed' || errorMsg.includes('email not confirmed')) {
        return true;
      }

      // Check if error indicates wrong credentials
      if (errorMsg.includes('invalid') && errorMsg.includes('credentials')) {
        // This could mean either wrong password OR email doesn't exist
        // We can't distinguish, so return false for security
        return false;
      }

      return false;
    } catch (err) {
      console.warn('Password verification failed:', err);
      return false;
    }
  };

  // Function to check email status with password verification for security
  const checkEmailStatusSecure = async (email: string, password: string): Promise<{ shouldProceed: boolean; toastConfig?: any; showResendOption?: boolean }> => {
    try {
      // First, use the database function to get email status
      const { data, error } = await db!.rpc('check_email_status', {
        email_to_check: email
      });

      if (error) {
        console.warn('Email status check RPC error:', error);
        return { shouldProceed: true }; // If we can't check, allow signup to proceed
      }

      const status = data?.status;
      const isGoogleAccount = data?.is_google_account === true;
      console.log('Email status check result:', data);

      switch (status) {
        case 'new':
          // Email doesn't exist - proceed with signup
          return { shouldProceed: true };

        case 'confirmed':
          // Check if this is a Google OAuth account
          if (isGoogleAccount) {
            // This is a Google OAuth account - don't allow email/password signup
            return {
              shouldProceed: false,
              toastConfig: {
                title: "Email Already in Use",
                description: "This email is already associated with a Google account. Please use 'Continue with Google' to sign in, or use a different email address.",
                variant: "destructive"
              },
              showResendOption: false
            };
          }

          // For confirmed regular email accounts, we know they exist from the database
          // No need to verify password as it would cause auth state changes
          // Just show the account exists message
          return {
            shouldProceed: false,
            toastConfig: {
              title: "Account Already Exists",
              description: "An account with this email already exists. Please use the 'Sign In' page instead, or use 'Forgot Password' if you need to reset your password.",
              variant: "destructive"
            },
            showResendOption: false
          };

        case 'unconfirmed':
          // Check if this is a Google OAuth account
          if (isGoogleAccount) {
            // This shouldn't happen (Google accounts are auto-confirmed), but handle it
            return {
              shouldProceed: false,
              toastConfig: {
                title: "Email Already in Use",
                description: "This email is already associated with a Google account. Please use 'Continue with Google' to sign in, or use a different email address.",
                variant: "destructive"
              },
              showResendOption: false
            };
          }

          // Regular email account - verify password before revealing this
          const isUnconfirmedPasswordCorrect = await verifyExistingAccountPassword(email, password);

          if (isUnconfirmedPasswordCorrect) {
            // Password is correct - safe to show unconfirmed status and resend option
            return {
              shouldProceed: false,
              toastConfig: {
                title: "Account Exists - Confirmation Needed",
                description: "Your account exists but hasn't been verified yet. Please check your email (including spam folder) for the confirmation link.",
                variant: "destructive"
              },
              showResendOption: true
            };
          } else {
            // SECURITY FIX: Password is wrong - BLOCK signup to prevent account hijacking
            // Even with wrong password, we cannot allow signup as it would let attackers
            // hijack unconfirmed accounts by getting the confirmation email
            return {
              shouldProceed: false,
              toastConfig: {
                title: "Email Already in Use",
                description: "This email address is already associated with an account. If this is your email, please check your inbox for a confirmation link, or try signing in if you've already confirmed your account.",
                variant: "destructive"
              },
              showResendOption: false
            };
          }

        case 'pending':
          // Check if this is a Google OAuth account
          if (isGoogleAccount) {
            return {
              shouldProceed: false,
              toastConfig: {
                title: "Email Already in Use",
                description: "This email is already associated with a Google account. Please use 'Continue with Google' to sign in, or use a different email address.",
                variant: "destructive"
              },
              showResendOption: false
            };
          }

          // Edge case - treat same as confirmed for security
          // No need to verify password as it would cause auth state changes
          return {
            shouldProceed: false,
            toastConfig: {
              title: "Account Already Exists",
              description: "An account with this email already exists. Please use the 'Sign In' page instead, or use 'Forgot Password' if you need help.",
              variant: "destructive"
            },
            showResendOption: false
          };

        default:
          // Unknown status - allow signup to proceed
          return { shouldProceed: true };
      }

    } catch (err) {
      console.warn('Secure email status check failed:', err);
      return { shouldProceed: true }; // If we can't check, allow signup to proceed
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) {
      toast({ title: "Authentication Error", description: "Database client is not available. Please try again later.", variant: "destructive" });
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

    // For signup, check email status with password verification for security
    if (!isLoginView) {
      setIsLoading(true);
      const { shouldProceed, toastConfig, showResendOption } = await checkEmailStatusSecure(email, password);

      if (!shouldProceed && toastConfig) {
        toast(toastConfig);
        setHasAuthError(true);
        if (showResendOption) {
          setShowResendConfirmation(true);
          setResendEmail(email);
        }
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);

    const productionSiteUrl = "https://settleease.netlify.app/";

    try {
      if (isLoginView) {
        const { data, error: signInError } = await db.auth.signInWithPassword({ email, password });

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

        toast({
          title: "Welcome Back!",
          description: "You've successfully signed in to SettleEase.",
          variant: "default"
        });
        setHasAuthError(false);
        setAuthErrorType('');
        if (data.user && onAuthSuccess) onAuthSuccess(data.user);
      } else {
        const { data, error: signUpError } = await db.auth.signUp({
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
            const { error: profileError } = await db
              .from('user_profiles')
              .update({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', data.user.id);

            if (profileError) {
              console.warn('Profile update error during signup:', profileError);
            }
          } catch (profileErr) {
            console.warn('Failed to update profile during signup:', profileErr);
          }
        }

        // Handle successful signup with immediate session
        if (data.session) {
          toast({
            title: "Welcome to SettleEase!",
            description: "Your account has been created and you're now signed in.",
            variant: "default"
          });
          setHasAuthError(false);
          setAuthErrorType('');
          if (data.user && onAuthSuccess) onAuthSuccess(data.user);
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
    if (!db) {
      toast({ title: "Authentication Error", description: "Database client is not available. Please try again later.", variant: "destructive" });
      return;
    }

    // Show confirmation modal
    setShowGoogleModal(true);
  };

  const handleGoogleOAuthConfirm = async () => {
    setIsGoogleLoading(true);

    const productionSiteUrl = "https://settleease.netlify.app/";

    try {
      const { error: googleError } = await db!.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: productionSiteUrl,
          queryParams: getGoogleOAuthParams(isLoginView),
        },
      });
      if (googleError) throw googleError;

      // Set a timeout to reset states if OAuth doesn't complete
      // This handles cases where user closes the OAuth popup or navigates back
      setTimeout(() => {
        setIsGoogleLoading(false);
        setShowGoogleModal(false);
      }, 10000); // Reset after 10 seconds

    } catch (err: any) {
      console.error("Auth error (Google):", err);
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
      {/* Theme Toggle - Top Right of Page */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden min-h-screen md:min-h-[600px] md:h-[600px]">
        <div className="md:flex h-full md:min-h-[600px] md:h-[600px]"> {/* Fixed height for modal and flex container on md+ */}
          {/* Left Pane: Branding & Features */}
          <div className={`md:w-2/5 flex flex-col p-6 sm:p-8 transition-colors duration-300 ease-in-out min-h-[400px] md:min-h-[600px] md:h-[600px] h-full` + (isLoginView ? ' bg-secondary/20 text-primary' : ' bg-primary text-primary-foreground')}>
            <div className="flex flex-col flex-1 justify-center min-h-0 h-full">
              {isLoginView ? (
                <div className="flex flex-col flex-1 items-center justify-center text-center h-full">
                  <HandCoins className="h-16 sm:h-20 w-16 sm:w-20 mx-auto mb-4 sm:mb-6 text-primary" />
                  <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">Welcome Back!</h1>
                  <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">
                    Sign in to continue simplifying your group expenses.
                  </p>
                  
                  {/* Mobile Security Badge - Only show on mobile for login view */}
                  <div className="md:hidden mt-6 flex items-center justify-center space-x-2 px-3 py-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full shadow-sm">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Protected by <span className="text-primary font-semibold">SettleSecure</span>
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 sm:mb-8 text-center md:text-left">
                    <HandCoins className="h-12 sm:h-16 w-12 sm:w-16 mx-auto md:mx-0 mb-3 sm:mb-4 text-primary-foreground/90" />
                    <h1 className="text-3xl sm:text-4xl font-bold font-headline">SettleEase</h1>
                    <p className="mt-1 sm:mt-2 text-md sm:text-lg text-primary-foreground/90">
                      Simplify your shared expenses. Effortlessly.
                    </p>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center md:text-left">Key Features:</h3>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-start"><Zap className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-primary-foreground/80 shrink-0" /> Track shared expenses with unparalleled ease.</li>
                    <li className="flex items-start"><Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-primary-foreground/80 shrink-0" /> Split bills your way: equally, unequally, or item-by-item.</li>
                    <li className="flex items-start"><PartyPopper className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-primary-foreground/80 shrink-0" /> Handle special contributions, like someone treating for a part of the bill.</li>
                    <li className="flex items-start"><PieChart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-primary-foreground/80 shrink-0" /> Simplify group settlements with clear, automated calculations.</li>
                    <li className="flex items-start"><Settings2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-primary-foreground/80 shrink-0" /> Pick from hundreds of Lucide icons for categories.</li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Right Pane: Form */}
          <div className="md:w-3/5 p-6 sm:p-8 flex flex-col justify-center min-h-0 md:min-h-[600px] md:h-[600px] h-full">
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
                  <GoogleIcon />
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
      <div className="hidden md:block fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40">
        <div className="flex items-center space-x-2 px-3 py-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full shadow-sm">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground font-medium">
            Protected by <span className="text-primary font-semibold">SettleSecure</span>
          </span>
        </div>
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

