"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
  ArrowRightLeft,
  BadgeCheck,
  BarChart3,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  HandCoins,
  Landmark,
  Lightbulb,
  LogIn,
  PiggyBank,
  ReceiptText,
  ScanLine,
  Scale,
  ShieldCheck,
  Split,
  TrendingUp,
  UserPlus,
  Wallet,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { cn } from "@/lib/utils";
import GoogleOAuthModal from './GoogleOAuthModal';
import packageJson from '../../../package.json';
import { GoogleMark } from './BrandAssets';
import { useAuthFormLogic, authBenefits } from '@/hooks/useAuthFormLogic';

// --- Floating icon configuration ----------------------
// Each icon is hand-placed with unique position, delay, duration for organic feel.
interface FloatingIconConfig {
  Icon: LucideIcon;
  top: string;
  left: string;
  delay: string;   // animation-delay
  dur: string;      // animation-duration
  size: number;     // pill container size in px
  iconSize: number; // icon size in px
  mobile?: boolean; // show on mobile?
}

const floatingIcons: FloatingIconConfig[] = [
  { Icon: Wallet,           top: '8%',  left: '3%',  delay: '0s',     dur: '11s', size: 54, iconSize: 20, mobile: true },
  { Icon: ReceiptText,      top: '14%', left: '18%', delay: '-3.2s',  dur: '9s',  size: 50, iconSize: 18, mobile: true },
  { Icon: PiggyBank,        top: '5%',  left: '34%', delay: '-7.1s',  dur: '13s', size: 56, iconSize: 20 },
  { Icon: Calculator,       top: '22%', left: '48%', delay: '-1.8s',  dur: '10s', size: 48, iconSize: 18 },
  { Icon: TrendingUp,       top: '6%',  left: '62%', delay: '-5.5s',  dur: '12s', size: 52, iconSize: 19 },
  { Icon: BarChart3,        top: '18%', left: '78%', delay: '-9.2s',  dur: '11s', size: 50, iconSize: 18 },
  { Icon: CreditCard,       top: '35%', left: '5%',  delay: '-2.4s',  dur: '14s', size: 52, iconSize: 19, mobile: true },
  { Icon: Landmark,         top: '40%', left: '22%', delay: '-6.8s',  dur: '10s', size: 48, iconSize: 17 },
  { Icon: CircleDollarSign, top: '32%', left: '38%', delay: '-4.3s',  dur: '12s', size: 56, iconSize: 21 },
  { Icon: Coins,            top: '45%', left: '55%', delay: '-8.1s',  dur: '9s',  size: 50, iconSize: 18 },
  { Icon: ArrowRightLeft,   top: '28%', left: '70%', delay: '-1.1s',  dur: '13s', size: 48, iconSize: 17 },
  { Icon: Scale,            top: '42%', left: '85%', delay: '-5.9s',  dur: '11s', size: 54, iconSize: 20, mobile: true },
  { Icon: FileSpreadsheet,  top: '58%', left: '8%',  delay: '-3.7s',  dur: '10s', size: 50, iconSize: 18, mobile: true },
  { Icon: ClipboardCheck,   top: '62%', left: '28%', delay: '-7.5s',  dur: '12s', size: 48, iconSize: 17 },
  { Icon: ShieldCheck,      top: '55%', left: '45%', delay: '-0.6s',  dur: '14s', size: 52, iconSize: 19 },
  { Icon: Split,            top: '68%', left: '62%', delay: '-4.8s',  dur: '9s',  size: 56, iconSize: 21, mobile: true },
  { Icon: ScanLine,         top: '72%', left: '80%', delay: '-2.9s',  dur: '11s', size: 50, iconSize: 18 },
  { Icon: HandCoins,        top: '78%', left: '15%', delay: '-6.2s',  dur: '13s', size: 54, iconSize: 20, mobile: true },
  { Icon: WalletCards,      top: '82%', left: '42%', delay: '-8.8s',  dur: '10s', size: 48, iconSize: 17 },
  { Icon: ChartNoAxesCombined, top: '85%', left: '72%', delay: '-1.5s', dur: '12s', size: 52, iconSize: 19 },
];

// Connection lines between specific icon pairs (indices into floatingIcons)
const connectionPairs: [number, number][] = [
  [0, 1], [1, 2], [2, 4], [3, 4], [5, 10],
  [6, 7], [7, 8], [8, 9], [9, 10], [10, 11],
  [12, 13], [13, 14], [14, 15], [15, 16],
  [17, 18], [18, 19],
];

interface AuthFormProps {
  supabase: SupabaseClient | undefined;
  onAuthSuccess?: (user: SupabaseUser) => void;
}

interface LineSegment {
  d: string;
  key: string;
}

interface ConnectionCurveSeed {
  phase: number;
  amplitude: number;
  speed: number;
  direction: 1 | -1;
}

const connectionCurveSeeds: ConnectionCurveSeed[] = connectionPairs.map(([a, b], index) => {
  const seed = (a + 1) * 37 + (b + 1) * 17 + index * 13;
  const phase = (seed % 360) * (Math.PI / 180);
  const amplitude = 1 + (seed % 10) * 0.09; // medium random intensity
  const speed = 0.6 + (seed % 7) * 0.08;
  const direction: 1 | -1 = seed % 2 === 0 ? 1 : -1;
  return { phase, amplitude, speed, direction };
});

const clampToViewBox = (value: number) => Math.min(98, Math.max(2, value));

export default function AuthForm({ supabase, onAuthSuccess }: AuthFormProps) {
  const {
    email,
    password,
    firstName,
    lastName,
    isLoginView,
    isLoading,
    isGoogleLoading,
    hasAuthError,
    showResendConfirmation,
    showGoogleModal,
    showPassword,
    rememberMe,
    authSuggestion,
    setShowGoogleModal,
    setShowPassword,
    setRememberMe,
    firstNameRef,
    emailRef,
    handleSubmit,
    handleGoogleSignIn,
    handleGoogleOAuthConfirm,
    handleResendConfirmation,
    handleEmailChange,
    handlePasswordChange,
    toggleAuthMode,
    capitalizeFirstLetter,
    getGoogleButtonText,
    setFirstName,
    setLastName,
  } = useAuthFormLogic({ supabase, onAuthSuccess });

  const [hasMounted, setHasMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [connectionLines, setConnectionLines] = useState<LineSegment[]>([]);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    // Small delay so the CSS entrance animation triggers after paint
    const raf = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreferenceChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleMotionPreferenceChange();
    mediaQuery.addEventListener('change', handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
    };
  }, []);

  useEffect(() => {
    let rafId: number | undefined;

    const updateConnectionLines = () => {
      const shell = shellRef.current;
      if (!shell) return;

      const shellRect = shell.getBoundingClientRect();
      if (shellRect.width === 0 || shellRect.height === 0) return;

      const nowSeconds = performance.now() / 1000;
      const nextLines = connectionPairs.flatMap(([a, b], pairIndex) => {
        const fromEl = iconRefs.current[a];
        const toEl = iconRefs.current[b];
        if (!fromEl || !toEl) return [];

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        if (fromRect.width === 0 || fromRect.height === 0 || toRect.width === 0 || toRect.height === 0) {
          return [];
        }

        const x1 = ((fromRect.left + fromRect.width / 2 - shellRect.left) / shellRect.width) * 100;
        const y1 = ((fromRect.top + fromRect.height / 2 - shellRect.top) / shellRect.height) * 100;
        const x2 = ((toRect.left + toRect.width / 2 - shellRect.left) / shellRect.width) * 100;
        const y2 = ((toRect.top + toRect.height / 2 - shellRect.top) / shellRect.height) * 100;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lineLength = Math.hypot(dx, dy);
        if (lineLength < 0.001) return [];

        const seed = connectionCurveSeeds[pairIndex];
        const normalX = -dy / lineLength;
        const normalY = dx / lineLength;
        const tangentX = dx / lineLength;
        const tangentY = dy / lineLength;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const baseCurve = Math.min(6.4, Math.max(1.6, lineLength * 0.16));
        const jitter = prefersReducedMotion
          ? 0
          : Math.sin(nowSeconds * seed.speed + seed.phase) * seed.amplitude
              + Math.cos(nowSeconds * (seed.speed * 0.66) + seed.phase * 1.3) * (seed.amplitude * 0.36);
        const normalOffset = baseCurve * seed.direction + jitter;
        const alongOffset = prefersReducedMotion
          ? 0
          : Math.sin(nowSeconds * (seed.speed * 0.52) + seed.phase) * Math.min(1.8, lineLength * 0.08);

        const controlX = clampToViewBox(midX + normalX * normalOffset + tangentX * alongOffset);
        const controlY = clampToViewBox(midY + normalY * normalOffset + tangentY * alongOffset);
        const d = `M ${x1.toFixed(3)} ${y1.toFixed(3)} Q ${controlX.toFixed(3)} ${controlY.toFixed(3)} ${x2.toFixed(3)} ${y2.toFixed(3)}`;

        return [{ d, key: `${a}-${b}` }];
      });

      setConnectionLines(nextLines);
    };

    const tick = () => {
      updateConnectionLines();
      if (!prefersReducedMotion) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    updateConnectionLines();
    window.addEventListener('resize', updateConnectionLines);

    if (!prefersReducedMotion) {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', updateConnectionLines);
      if (rafId !== undefined) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [prefersReducedMotion]);

  const inputClassName = "h-11 rounded-full border-border/80 bg-background/95 px-4 shadow-sm focus-visible:ring-ring";
  const passwordInputClassName = "h-11 rounded-full border-border/80 bg-background/95 pl-4 pr-12 shadow-sm focus-visible:ring-ring";
  const labelClassName = "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";

  return (
    <>
      <div
        ref={shellRef}
        className="auth-page-shell relative flex min-h-svh w-full flex-col overflow-x-hidden text-foreground lg:h-svh lg:max-h-svh lg:overflow-hidden"
        data-auth-mode={isLoginView ? "signin" : "signup"}
      >
        {/* -- Layer 1: Dot grid ---------------------------- */}
        <div className="auth-page-dot-grid" aria-hidden="true" />

        {/* -- Layer 2: Gradient mesh ----------------------- */}
        <div className="auth-page-gradient-mesh" aria-hidden="true" />

        {/* -- Layer 3: Connection lines SVG ---------------- */}
        <svg
          className="auth-page-lines"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {connectionLines.map(({ d, key }) => (
            <path
              key={key}
              d={d}
            />
          ))}
        </svg>

        {/* -- Layer 4: Floating icons ---------------------- */}
        <div className="auth-page-icons-field" aria-hidden="true">
          {floatingIcons.map(({ Icon, top, left, delay, dur, size, iconSize, mobile }, i) => (
            <div
              key={i}
              ref={(node) => {
                iconRefs.current[i] = node;
              }}
              className={cn(
                'auth-page-icon',
                !mobile && 'auth-page-icon-desktop-only',
              )}
              style={{
                top,
                left,
                width: size,
                height: size,
                animationDelay: delay,
                animationDuration: dur,
              }}
            >
              <Icon style={{ width: iconSize, height: iconSize }} />
            </div>
          ))}
        </div>

        {/* -- Main content --------------------------------- */}
        <main className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-5 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.78fr)] lg:items-center lg:gap-8 lg:overflow-hidden lg:px-8">

          {/* -- Left: Hero + benefits (desktop) ------------ */}
          <section className="hidden min-w-0 space-y-5 lg:block">
            <div className="max-w-3xl space-y-4">
              <div className="space-y-4">
                <h1 className="max-w-3xl text-[clamp(2.45rem,5.4vw,4.65rem)] font-light leading-[0.98] tracking-tight text-foreground">
                  Settle shared expenses without the after-trip math.
                </h1>
                <p className="max-w-2xl text-base leading-7 tracking-[0.01em] text-muted-foreground sm:text-lg">
                  Add people, scan receipts, split precisely, and leave with a clean settlement plan. The form is right here when you are ready.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {authBenefits.map(({ icon: Icon, title, description }, i) => (
                <div
                  key={title}
                  className="auth-page-benefit rounded-2xl border border-border/70 bg-background/72 p-3.5 shadow-sm backdrop-blur-md"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
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

          {/* -- Right: Auth card --------------------------- */}
          <section className="min-h-0 flex items-center justify-center">
            <Card
              className={cn(
                'auth-page-card mx-auto flex w-full max-w-[460px] flex-col overflow-hidden rounded-[2rem] border-border/70 bg-card/95 shadow-2xl backdrop-blur-2xl transition-all duration-300',
                hasMounted && 'auth-page-card-entered',
              )}
            >
              {/* Header Container */}
              <div className="auth-page-card-header p-6 pb-2 sm:p-8 sm:pb-3 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="auth-page-card-mark flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-[#f5f2ef]/85 shadow-sm dark:bg-muted transition-colors duration-300">
                    <HandCoins className="h-5.5 w-5.5" />
                  </div>
                  <div className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {isLoginView ? "Returning" : "New account"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="auth-page-card-title text-2xl sm:text-3xl font-light tracking-tight transition-colors duration-300">
                    {isLoginView ? "Welcome back." : "Create your account."}
                  </CardTitle>
                  <p className="auth-page-card-copy text-xs leading-5 text-muted-foreground">
                    {isLoginView
                      ? "Sign in to manage expenses, settlements, and reports."
                      : "Start with your name, then invite the group once you are inside."}
                  </p>
                </div>
              </div>

              {/* Form Container */}
              <CardContent className="auth-page-card-content p-6 pt-2 sm:p-8 sm:pt-3 flex flex-col space-y-4">
                <form onSubmit={handleSubmit} className="auth-page-form flex flex-col space-y-4">
                  
                  {/* Name Slot (Transition ready and fixed height to prevent layout shift) */}
                  <div className="auth-page-name-slot h-[74px] relative overflow-hidden transition-all duration-200">
                    <div
                      className={cn(
                        "grid grid-cols-2 gap-3 absolute inset-x-0 top-0 transition-all duration-300",
                        isLoginView 
                          ? "pointer-events-none -translate-y-2 opacity-0 scale-95" 
                          : "opacity-100 translate-y-0 scale-100"
                      )}
                      aria-hidden={isLoginView}
                    >
                      <div className="space-y-1">
                        <Label htmlFor="auth-firstName" className={labelClassName}>First Name</Label>
                        <Input
                          ref={firstNameRef}
                          id="auth-firstName"
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
                      <div className="space-y-1">
                        <Label htmlFor="auth-lastName" className={labelClassName}>Last Name</Label>
                        <Input
                          id="auth-lastName"
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

                  {/* Email Section */}
                  <div className="space-y-1">
                    <Label htmlFor="auth-email" className={labelClassName}>Email Address</Label>
                    <Input
                      ref={emailRef}
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      disabled={isLoading || isGoogleLoading}
                      required
                      className={inputClassName}
                    />
                  </div>

                  {/* Password Section */}
                  <div className="space-y-1">
                    <Label htmlFor="auth-password" className={labelClassName}>Password</Label>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isLoginView ? "current-password" : "new-password"}
                        placeholder={isLoginView ? "Password" : "Password - min. 6 characters"}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
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

                  {/* Integrated Sub-Actions Row (Fixed h-7 container for absolute zero layout shift) */}
                  <div className="h-7 flex items-center px-0.5 justify-between">
                    {isLoginView ? (
                      <div className="flex items-center space-x-2">
                        <input
                          id="remember-me"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-3.5 w-3.5 cursor-pointer rounded border-border bg-background/95 text-foreground accent-black focus:ring-ring"
                        />
                        <Label
                          htmlFor="remember-me"
                          className="cursor-pointer text-[11px] font-normal leading-none text-muted-foreground select-none hover:text-foreground transition-colors"
                        >
                          Keep me signed in on this device
                        </Label>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 opacity-60">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Passwords are encrypted end-to-end
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Slot */}
                  <div className="pt-1">
                    {showResendConfirmation ? (
                      <div className="flex flex-col space-y-2 rounded-2xl border border-amber-300/60 bg-[#fff8e7] p-3 text-center shadow-sm dark:bg-amber-950/20">
                        <div>
                          <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                            {isLoginView ? "Email Not Verified" : "Account Exists - Email Confirmation Needed"}
                          </h3>
                          <p className="text-[10px] leading-4 text-amber-700 dark:text-amber-300 mt-1">
                            Your account exists but has not been verified yet. Check your inbox or resend verification.
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={isLoading}
                          className="h-9 w-full rounded-full bg-black text-xs font-semibold text-white hover:bg-black/90 dark:bg-primary dark:text-primary-foreground"
                        >
                          {isLoading ? 'Sending...' : 'Resend Confirmation Email'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        className="auth-page-primary-button h-11 w-full rounded-full text-sm font-semibold shadow-md transition-all duration-300"
                        disabled={isLoading || isGoogleLoading}
                      >
                        {isLoading ? (
                          isLoginView ? 'Logging in...' : 'Creating Account...'
                        ) : isLoginView ? (
                          <>
                            <LogIn className="mr-2 h-4.5 w-4.5" />
                            Sign In
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4.5 w-4.5" />
                            Create Account
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>

                {/* -- Separator ---------------------------- */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-[10px] tracking-[0.16em] text-muted-foreground transition-colors duration-300">
                      Or
                    </span>
                  </div>
                </div>

                {/* -- Google OAuth ------------------------- */}
                <Button
                  type="button"
                  className="h-11 w-full rounded-full border border-border/80 bg-white/95 text-sm text-foreground shadow-sm hover:bg-muted dark:bg-card dark:text-card-foreground transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                >
                  <GoogleMark size={18} />
                  <span className="ml-2.5 font-medium">
                    {getGoogleButtonText(isLoginView, isGoogleLoading)}
                  </span>
                </Button>

                {/* -- Suggestion --------------------------- */}
                {hasAuthError && !showResendConfirmation && authSuggestion ? (
                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-2 text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2">
                      <Lightbulb className="h-4 w-4 shrink-0" />
                      <span className="line-clamp-2 text-[11px]">{authSuggestion.text}</span>
                    </div>
                  </div>
                ) : null}

                {/* -- Switch auth mode --------------------- */}
                <div className="flex items-center justify-center pt-2">
                  <Button
                    type="button"
                    variant="link"
                    onClick={toggleAuthMode}
                    disabled={isLoading || isGoogleLoading}
                    className="h-auto rounded-full px-3 py-1.5 text-xs text-foreground underline-offset-8 hover:text-primary/80 transition-colors"
                  >
                    {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* -- Mobile: benefit cards ----------------------- */}
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

        <footer className="relative z-10 flex shrink-0 justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center justify-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 shadow-sm backdrop-blur-md">
              <HandCoins className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold leading-5">SettleEase</p>
              <p className="truncate text-xs text-muted-foreground">v{packageJson.version}</p>
            </div>
          </div>
        </footer>
      </div>

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
