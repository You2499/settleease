"use client";

import React, { ComponentType } from 'react';
import SettleEaseErrorBoundary from './SettleEaseErrorBoundary';

interface WithSettleEaseErrorBoundaryOptions {
  componentName?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  fallback?: React.ReactNode;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

/**
 * Higher-order component that wraps a component with SettleEase-themed error boundary
 */
export function withSettleEaseErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithSettleEaseErrorBoundaryOptions = {}
) {
  const WrappedComponent = (props: P) => (
    <SettleEaseErrorBoundary 
      componentName={options.componentName || Component.displayName || Component.name}
      size={options.size || 'medium'}
      showIcon={options.showIcon}
      fallback={options.fallback}
      onReset={options.onReset}
      onNavigateHome={options.onNavigateHome}
    >
      <Component {...props} />
    </SettleEaseErrorBoundary>
  );

  WrappedComponent.displayName = `withSettleEaseErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook-like function to wrap JSX with SettleEase error boundary
 */
export function useSettleEaseErrorBoundary(
  children: React.ReactNode,
  options: WithSettleEaseErrorBoundaryOptions = {}
) {
  return (
    <SettleEaseErrorBoundary 
      componentName={options.componentName}
      size={options.size || 'medium'}
      showIcon={options.showIcon}
      fallback={options.fallback}
      onReset={options.onReset}
      onNavigateHome={options.onNavigateHome}
    >
      {children}
    </SettleEaseErrorBoundary>
  );
}

/**
 * Utility function to determine appropriate error boundary size based on component type
 */
export function getErrorBoundarySize(componentName?: string): 'small' | 'medium' | 'large' {
  if (!componentName) return 'medium';
  
  const name = componentName.toLowerCase();
  
  // Large components (main features)
  if (name.includes('tab') || name.includes('view') || name.includes('dashboard') || name.includes('analytics')) {
    return 'large';
  }
  
  // Small components (form fields, buttons, etc.)
  if (name.includes('input') || name.includes('button') || name.includes('select') || 
      name.includes('checkbox') || name.includes('label') || name.includes('icon')) {
    return 'small';
  }
  
  // Medium components (sections, cards, etc.)
  return 'medium';
}

/**
 * Auto-sizing error boundary wrapper
 */
export function withAutoSizedSettleEaseErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: Omit<WithSettleEaseErrorBoundaryOptions, 'size'> = {}
) {
  const componentName = options.componentName || Component.displayName || Component.name;
  const size = getErrorBoundarySize(componentName);
  
  return withSettleEaseErrorBoundary(Component, {
    ...options,
    componentName,
    size,
  });
}