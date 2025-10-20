"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, RefreshCw, Home, HandCoins, Bug, Zap, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * SettleEase-themed Error Boundary that follows the app's design language
 */
class SettleEaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SettleEase Error Boundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  handleNavigateHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onNavigateHome?.();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { size = 'medium', showIcon = true, componentName } = this.props;

      // Enhanced size-based styling with modern design
      const sizeClasses = {
        small: {
          card: 'border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 shadow-sm backdrop-blur-sm',
          title: 'text-sm font-semibold',
          icon: 'h-4 w-4',
          button: 'text-xs h-7',
          spacing: 'space-y-2',
          padding: 'p-3',
          badge: 'text-[10px] px-1.5 py-0.5'
        },
        medium: {
          card: 'border-destructive/40 bg-gradient-to-br from-destructive/8 to-destructive/15 shadow-md backdrop-blur-sm',
          title: 'text-base font-semibold',
          icon: 'h-5 w-5',
          button: 'text-sm h-9',
          spacing: 'space-y-3',
          padding: 'p-4',
          badge: 'text-xs px-2 py-1'
        },
        large: {
          card: 'border-destructive/50 bg-gradient-to-br from-destructive/10 to-destructive/20 shadow-lg backdrop-blur-sm',
          title: 'text-lg font-bold',
          icon: 'h-6 w-6',
          button: 'text-base h-10',
          spacing: 'space-y-4',
          padding: 'p-6',
          badge: 'text-sm px-2.5 py-1'
        }
      };

      const styles = sizeClasses[size];
      const isTestCrash = this.state.error?.message?.includes('[CRASH TEST]');

      // Use new modal design for medium and large sizes
      if (size === 'medium' || size === 'large') {
        return (
          <div className="space-y-4 w-full min-w-0">
            {/* Error Information Section */}
            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#EA4335]/30 dark:border-[#EA4335]/20 rounded-lg overflow-hidden w-full">
              <div className="px-3 sm:px-4 py-3 bg-[#EA4335]/10 dark:bg-[#EA4335]/5">
                <div className="flex items-center justify-between min-w-0">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <AlertTriangle className="h-4 w-4 text-[#EA4335] flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                      Error in {componentName || 'Component'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isTestCrash && (
                      <Badge variant="outline" className={`${styles.badge} border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-950`}>
                        <Bug className="w-3 h-3 mr-1" />
                        Test
                      </Badge>
                    )}
                    <Badge variant="destructive" className={`${styles.badge}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      Protected
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {size === 'large'
                    ? "A critical error occurred that prevented this feature from working properly. The error has been isolated by SettleEase's error boundary system to prevent it from affecting other parts of the application."
                    : "This component encountered an error but the rest of SettleEase continues to work normally. The error boundary has contained the issue."
                  }
                </p>
                {isTestCrash && (
                  <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/50 rounded-md border border-orange-200 dark:border-orange-800 mt-2">
                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800 dark:text-orange-200">
                      This is a simulated crash for testing error boundary coverage. In production, this would be a real error that has been safely contained.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Details Section (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-white/95 dark:bg-gray-800/95 border border-[#ff7825]/30 dark:border-[#ff7825]/20 rounded-lg overflow-hidden w-full">
                <div className="px-3 sm:px-4 py-3 bg-[#FBBC05]/10 dark:bg-[#FBBC05]/5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Bug className="h-4 w-4 text-[#EA4335] flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                      Error Details (Development Mode)
                    </span>
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                  <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                    <pre className="whitespace-pre-wrap text-destructive text-[10px] leading-relaxed">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons Section */}
            <div className="bg-white/95 dark:bg-gray-800/95 border border-[#34A853]/30 dark:border-[#34A853]/20 rounded-lg overflow-hidden w-full">
              <div className="px-3 sm:px-4 py-3 bg-[#34A853]/10 dark:bg-[#34A853]/5">
                <div className="flex items-center space-x-2 min-w-0">
                  <RefreshCw className="h-4 w-4 text-[#34A853] flex-shrink-0" />
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                    Recovery Options
                  </span>
                </div>
              </div>
              <div className="px-3 sm:px-4 py-3 bg-white/90 dark:bg-gray-800/90">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={this.handleRetry}
                    className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Try Again
                  </button>
                  {(this.props.onNavigateHome || size === 'large') && (
                    <button
                      onClick={this.handleNavigateHome}
                      className="w-full h-10 text-sm sm:h-11 sm:text-base bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:border-gray-600 rounded-md flex items-center justify-center"
                    >
                      <Home className="h-5 w-5 mr-2" />
                      Go to Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Keep original design for small size
      return (
        <Card className={`${styles.card} ${size === 'small' ? 'min-h-0' : 'min-h-[140px]'}`}>
          <CardHeader className={`${styles.padding} pb-2`}>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className={`flex items-center text-destructive ${styles.title} flex-1`}>
                <div className="flex items-center gap-2">
                  {showIcon && (
                    <div className="relative">
                      <AlertTriangle className={`${styles.icon} flex-shrink-0`} />
                    </div>
                  )}
                  <span className="break-words">Component Error</span>
                </div>
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isTestCrash && (
                  <Badge variant="outline" className={`${styles.badge} border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-950`}>
                    <Bug className="w-3 h-3 mr-1" />
                    Test
                  </Badge>
                )}
                <Badge variant="destructive" className={`${styles.badge}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  Protected
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className={`${styles.padding} pt-3 ${styles.spacing}`}>
            <div className="flex flex-col gap-1.5 pt-1">
              <Button
                onClick={this.handleRetry}
                variant="default"
                size="sm"
                className="w-full text-xs h-7 bg-primary"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again
              </Button>

              {this.props.onNavigateHome && (
                <Button
                  onClick={this.handleNavigateHome}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7 border-primary/30"
                >
                  <Home className="mr-2 h-3 w-3" />
                  Home
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default SettleEaseErrorBoundary;