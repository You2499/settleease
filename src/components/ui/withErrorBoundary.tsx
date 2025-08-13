"use client";

import React, { ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface WithErrorBoundaryOptions {
  componentName?: string;
  fallback?: React.ReactNode;
}

/**
 * Higher-order component that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      componentName={options.componentName || Component.displayName || Component.name}
      fallback={options.fallback}
    >
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook-like function to wrap JSX with error boundary
 */
export function useErrorBoundary(
  children: React.ReactNode,
  options: WithErrorBoundaryOptions = {}
) {
  return (
    <ErrorBoundary 
      componentName={options.componentName}
      fallback={options.fallback}
    >
      {children}
    </ErrorBoundary>
  );
}