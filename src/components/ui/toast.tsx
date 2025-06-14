
"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, AlertTriangle } from "lucide-react" // Added AlertTriangle for destructive toast

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
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground", // Standard background
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground", // Destructive colors
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
>(({ className, variant, duration: autoDismissTotalMs = 5000, onOpenChange, open, children, ...props }, ref) => {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = React.useRef<HTMLDivElement | null>(null);
  const timeoutRunStartTimeRef = React.useRef<number>(0);
  const remainingDurationOnPauseRef = React.useRef<number>(autoDismissTotalMs);
  const isPausedRef = React.useRef<boolean>(false);

  const setupInitialAnimation = React.useCallback(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.animation = 'none';
      progressBarRef.current.style.width = '100%'; // Explicitly set initial width
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      progressBarRef.current.offsetHeight; // Trigger reflow to apply reset
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
      if (progressBarRef.current && progressBarRef.current.style.animationPlayState === 'paused') {
         progressBarRef.current.style.animationPlayState = 'paused'; // Keep it paused if it was when closed
      } else if (progressBarRef.current) {
        // Let Radix handle visual exit; animation 'forwards' should keep it at 0% width
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
      timeoutRef.current = null; 

      const elapsedSinceTimerStart = Date.now() - timeoutRunStartTimeRef.current;
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
      startDismissTimer(remainingDurationOnPauseRef.current);
      if (progressBarRef.current) {
        progressBarRef.current.style.animationPlayState = 'running';
      }
    } else if (onOpenChange) { 
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
      duration={Infinity} 
      {...props}
    >
      {variant === "destructive" && (
        <AlertTriangle className="h-5 w-5 text-destructive-foreground mr-2 shrink-0" />
      )}
      <div className="flex-1">{children}</div> {/* Content wrapper */}
      <div
        ref={progressBarRef}
        className="toast-progress-bar" // Class defined in globals.css
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
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "group-[.destructive]:border-destructive-foreground/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive-foreground group-[.destructive]:hover:text-destructive group-[.destructive]:focus:ring-destructive-foreground",
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
      "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-70 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
      "group-[.destructive]:text-destructive-foreground/70 group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive-foreground group-[.destructive]:focus:ring-offset-destructive",
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
    className={cn("text-sm font-semibold", className)} // Adjusted padding to p-0 as parent has p-4
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
    className={cn("text-sm opacity-90", className)} // Adjusted padding to p-0
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
