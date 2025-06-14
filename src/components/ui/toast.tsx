
"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & { duration?: number }
>(({ className, variant, duration: autoDismissTotalMs = 5000, onOpenChange, open, ...props }, ref) => {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = React.useRef<HTMLDivElement | null>(null);
  const timeoutRunStartTimeRef = React.useRef<number>(0);
  const remainingDurationOnPauseRef = React.useRef<number>(autoDismissTotalMs);
  const isPausedRef = React.useRef<boolean>(false);

  const setupInitialAnimation = React.useCallback(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.animation = 'none';
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      progressBarRef.current.offsetHeight; // Trigger reflow to apply reset
      progressBarRef.current.style.transformOrigin = 'left';
      progressBarRef.current.style.animation = `toast-progress ${autoDismissTotalMs}ms linear forwards`;
      progressBarRef.current.style.animationPlayState = 'running';
    }
  }, [autoDismissTotalMs]);

  const startDismissTimer = React.useCallback((duration: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRunStartTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      if (onOpenChange && !isPausedRef.current) {
        onOpenChange(false);
      }
    }, duration);
  }, [onOpenChange]);

  React.useEffect(() => {
    if (open) {
      isPausedRef.current = false;
      remainingDurationOnPauseRef.current = autoDismissTotalMs;
      setupInitialAnimation();
      startDismissTimer(autoDismissTotalMs);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Optionally stop animation if progressBarRef.current exists and is paused
      if (progressBarRef.current && progressBarRef.current.style.animationPlayState === 'paused') {
         // It might already be 'none' or handled by unmount, but defensive stop.
         progressBarRef.current.style.animationPlayState = 'paused';
      } else if (progressBarRef.current) {
        // If closing while running, setting to none might be abrupt,
        // Radix data-[state=closed] handles visual exit.
        // Consider if explicit animation stop is needed beyond Radix's exit.
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [open, autoDismissTotalMs, setupInitialAnimation, startDismissTimer]);

  const handleMouseEnter = () => {
    if (!open || isPausedRef.current) return;

    isPausedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null; // Important: Mark timer as cleared

      const elapsedSinceTimerStart = Date.now() - timeoutRunStartTimeRef.current;
      // remainingDurationOnPauseRef should have been set to the duration this timer was supposed to run for
      // So we update it based on how much of *that* specific timer duration has passed.
      // This was the error in prior logic. remainingDurationOnPauseRef should reflect the current running segment's total intended run time before this pause.
      // The value it *had* when startDismissTimer was last called is what we subtract from.
      // Let's simplify: timeoutRunStartTimeRef tracks start of current segment. remainingDurationOnPauseRef has the *actual* remaining time for the toast.
      const newRemaining = remainingDurationOnPauseRef.current - elapsedSinceTimerStart;
      remainingDurationOnPauseRef.current = Math.max(0, newRemaining);
    }
    if (progressBarRef.current) {
      progressBarRef.current.style.animationPlayState = 'paused';
    }
  };

  const handleMouseLeave = () => {
    if (!open || !isPausedRef.current) return;

    isPausedRef.current = false;
    if (remainingDurationOnPauseRef.current > 0) {
      // Restart the JS timer for the *truly remaining* duration
      startDismissTimer(remainingDurationOnPauseRef.current);
      if (progressBarRef.current) {
        // Resume the CSS animation; it will continue from its paused point
        progressBarRef.current.style.animationPlayState = 'running';
      }
    } else if (onOpenChange) { // If duration effectively ran out
      onOpenChange(false);
    }
  };
  
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      open={open}
      onOpenChange={onOpenChange}
      duration={Infinity} // We handle duration manually
      {...props}
    >
      {props.children}
      <div
        ref={progressBarRef}
        className="toast-progress-bar"
      />
    </ToastPrimitives.Root>
  );
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
