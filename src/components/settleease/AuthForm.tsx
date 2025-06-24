"use client";

import React, { useState } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, LogIn, UserPlus, HandCoins, Zap, Users, PieChart, Handshake as HandshakeIcon, PartyPopper } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Google Icon SVG as a React component
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);


interface AuthFormProps {
  db: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void;
}

export default function AuthForm({ db, onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db) {
      setError("Database client is not available. Please try again later.");
      return;
    }
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const productionSiteUrl = "https://settleease.netlify.app/";

    try {
      if (isLoginView) {
        const { data, error: signInError } = await db.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        toast({ title: "Login Successful", description: "Welcome back!" });
        if (data.user && onAuthSuccess) onAuthSuccess(data.user);
      } else {
        const { data, error: signUpError } = await db.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: productionSiteUrl,
          },
        });
        if (signUpError) throw signUpError;
        toast({ title: "Signup Successful", description: "Please check your email to confirm your account if required." });
        if (data.user && onAuthSuccess) onAuthSuccess(data.user);
      }
    } catch (err: any) {
      console.error("Auth error (email/password):", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : "An unexpected error occurred.");
      setError(errorMessage);
      toast({ title: "Authentication Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!db) {
      setError("Database client is not available. Please try again later.");
      return;
    }
    setIsGoogleLoading(true);
    setError(null);
    
    const productionSiteUrl = "https://settleease.netlify.app/";

    try {
      const { error: googleError } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: productionSiteUrl, 
        },
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      console.error("Auth error (Google):", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : "An unexpected error occurred with Google Sign-In.");
      setError(errorMessage);
      toast({ title: "Google Sign-In Error", description: errorMessage, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl shadow-xl rounded-lg overflow-hidden min-h-screen md:min-h-[580px]">
      <div className="md:flex h-full md:min-h-[580px]"> {/* Added md:min-h-[580px] here */}
        {/* Left Pane: Branding & Features */}
        <div className={`md:w-2/5 flex flex-col p-6 sm:p-8 transition-colors duration-300 ease-in-out
                         ${isLoginView ? 'bg-secondary/20 text-primary' : 'bg-primary text-primary-foreground'}`}>
          <div className="flex flex-col flex-1 justify-center min-h-0"> 
            {isLoginView ? (
              <div className="flex flex-col flex-1 items-center justify-center text-center">
                <HandCoins className="h-16 sm:h-20 w-16 sm:w-20 mx-auto mb-4 sm:mb-6 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold font-headline text-primary">Welcome Back!</h1>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base text-muted-foreground">
                  Sign in to continue simplifying your group expenses.
                </p>
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
                  <li className="flex items-start"><HandshakeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 text-primary-foreground/80 shrink-0" /> Collaborate securely with friends, family, or housemates.</li>
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Right Pane: Form */}
        <div className="md:w-3/5 p-6 sm:p-8 flex flex-col justify-center min-h-0">
          <div className="flex flex-col justify-center flex-1 min-h-0"> 
            <CardHeader className="px-0 pt-0 pb-4 text-center">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
                {isLoginView ? 'Sign In' : 'Create your Account'}
              </CardTitle>
            </CardHeader>

            <CardContent className="px-0 pb-0 space-y-3 sm:space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="email" className="text-sm">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    required
                    className="h-10 text-sm sm:h-11 sm:text-base"
                  />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isLoginView ? "current-password" : "new-password"}
                    placeholder={isLoginView ? "••••••••" : "•••••••• (min. 6 characters)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || isGoogleLoading}
                    required
                    minLength={6}
                    className="h-10 text-sm sm:h-11 sm:text-base"
                  />
                </div>
                <Button type="submit" className="w-full h-10 text-sm sm:h-11 sm:text-base font-semibold" disabled={isLoading || isGoogleLoading}>
                  {isLoading ? (isLoginView ? 'Logging in...' : 'Creating Account...') : (isLoginView ? <><LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Sign In</> : <><UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Create Account</>)}
                </Button>
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
                {isGoogleLoading ? (
                  "Redirecting to Google..."
                ) : (
                  <>
                    <GoogleIcon /> <span className="ml-2.5">Sign {isLoginView ? 'in' : 'up'} with Google</span>
                  </>
                )}
              </Button>
            </CardContent>

            <CardFooter className="px-0 pt-3 sm:pt-4 pb-0 flex-col items-center">
              <Button variant="link" onClick={() => { setIsLoginView(!isLoginView); setError(null); }} disabled={isLoading || isGoogleLoading} className="text-sm text-primary hover:text-primary/80">
                {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Button>
            </CardFooter>
          </div>
        </div>
      </div>
    </Card>
  );
}

