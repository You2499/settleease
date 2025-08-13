"use client";

import { useCallback } from 'react';
import { toast } from "@/hooks/use-toast";

interface ErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  logError?: boolean;
  fallbackMessage?: string;
}

/**
 * Hook for consistent error handling across the application
 */
export function useErrorHandler() {
  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      toastTitle = "Something went wrong",
      logError = true,
      fallbackMessage = "An unexpected error occurred. Please try again."
    } = options;

    // Log the error
    if (logError) {
      console.error('Error handled by useErrorHandler:', error);
    }

    // Get error message
    let errorMessage = fallbackMessage;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Show toast notification
    if (showToast) {
      toast({
        title: toastTitle,
        description: errorMessage,
        variant: "destructive",
      });
    }

    return errorMessage;
  }, []);

  const handleAsyncError = useCallback(async (
    asyncOperation: () => Promise<void>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      await asyncOperation();
    } catch (error) {
      handleError(error, options);
      throw error; // Re-throw so calling code can handle it if needed
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
}

/**
 * Hook that throws an error to trigger error boundaries
 * Useful for testing error boundaries or handling critical errors
 */
export function useErrorBoundaryTrigger() {
  const triggerError = useCallback((error: Error | string) => {
    const errorToThrow = error instanceof Error ? error : new Error(error);
    throw errorToThrow;
  }, []);

  return { triggerError };
}