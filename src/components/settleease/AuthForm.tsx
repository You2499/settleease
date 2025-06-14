
"use client";

import React, { useState } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, LogIn, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Simple Google Icon SVG as a React component
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);


interface AuthFormProps {
  db: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void; // Optional: onAuthStateChange in page.tsx should handle it
}

export default function AuthForm({ db, onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
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

    const productionSiteUrl = "https://studio--settleease-hseuo.us-central1.hosted.app/";

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

    const productionSiteUrl = "https://studio--settleease-hseuo.us-central1.hosted.app/";
    
    try {
      const { error: googleError } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: productionSiteUrl, // Ensure Supabase redirects back here after Google auth
        },
      });
      if (googleError) throw googleError;
      // Note: signInWithOAuth redirects the user. If successful, onAuthStateChange will handle the session.
      // If there's an immediate error (e.g., misconfiguration), it's caught here.
    } catch (err: any) {
      console.error("Auth error (Google):", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : "An unexpected error occurred with Google Sign-In.");
      setError(errorMessage);
      toast({ title: "Google Sign-In Error", description: errorMessage, variant: "destructive" });
      setIsGoogleLoading(false);
    }
    // setIsLoading(false) is not set here because a successful call redirects
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary">
          {isLoginView ? 'Welcome Back to SettleEase' : 'Join SettleEase'}
        </CardTitle>
        <CardDescription>
          {isLoginView ? 'Sign in to manage your expenses.' : 'Create an account to get started.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm flex items-start">
            <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isGoogleLoading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isLoginView ? "current-password" : "new-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || isGoogleLoading}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? (isLoginView ? 'Logging in...' : 'Signing up...') : (isLoginView ? <><LogIn className="mr-2 h-4 w-4" /> Login</> : <><UserPlus className="mr-2 h-4 w-4" /> Sign Up</>)}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
        >
          {isGoogleLoading ? (
            "Redirecting to Google..."
          ) : (
            <>
              <GoogleIcon /> <span className="ml-2">Sign {isLoginView ? 'in' : 'up'} with Google</span>
            </>
          )}
        </Button>

      </CardContent>
      <CardFooter className="flex-col items-center space-y-2 pt-4 border-t">
        <Button variant="link" onClick={() => { setIsLoginView(!isLoginView); setError(null); }} disabled={isLoading || isGoogleLoading} className="text-sm">
          {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </Button>
      </CardFooter>
    </Card>
  );
}
