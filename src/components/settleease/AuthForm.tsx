
"use client";

import React, { useState } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, LogIn, UserPlus } from 'lucide-react';

interface AuthFormProps {
  db: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void; // Optional: onAuthStateChange in page.tsx should handle it
}

export default function AuthForm({ db, onAuthSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
            // emailRedirectTo: `${window.location.origin}/`, // Optional: for email confirmation
          },
        });
        if (signUpError) throw signUpError;
        toast({ title: "Signup Successful", description: "Please check your email to confirm your account if required." });
        if (data.user && onAuthSuccess) onAuthSuccess(data.user);
        // For newly signed up users, Supabase might automatically sign them in or require email confirmation
        // The onAuthStateChange listener in page.tsx will handle the user state.
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorMessage = err.message || (typeof err === 'string' ? err : "An unexpected error occurred.");
      setError(errorMessage);
      toast({ title: "Authentication Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (isLoginView ? 'Logging in...' : 'Signing up...') : (isLoginView ? <><LogIn className="mr-2 h-4 w-4" /> Login</> : <><UserPlus className="mr-2 h-4 w-4" /> Sign Up</>)}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col items-center space-y-2 pt-4 border-t">
        <Button variant="link" onClick={() => { setIsLoginView(!isLoginView); setError(null); }} disabled={isLoading} className="text-sm">
          {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </Button>
      </CardFooter>
    </Card>
  );
}
