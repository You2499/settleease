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

      return (
        <Card className={`${styles.card} ${size === 'small' ? 'min-h-0' : 'min-h-[140px]'} transition-all duration-200 hover:shadow-lg`}>
          <CardHeader className={`${styles.padding} pb-2`}>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className={`flex items-center text-destructive ${styles.title} flex-1`}>
                <div className="flex items-center gap-2">
                  {showIcon && (
                    <div className="relative">
                      <AlertTriangle className={`${styles.icon} flex-shrink-0`} />
                      {size !== 'small' && (
                        <div className="absolute -top-1 -right-1">
                          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {size !== 'small' && (
                      <HandCoins className="h-4 w-4 text-primary/60" />
                    )}
                    <span className="break-words">
                      {size === 'small' ? 'Component Error' : 'Something went wrong'}
                      {componentName && (
                        <span className="text-muted-foreground font-normal">
                          {size === 'small' ? '' : ' in '}
                          <span className="font-medium text-destructive">{componentName}</span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isTestCrash && (
                  <Badge variant="outline" className={`${styles.badge} border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:bg-orange-950`}>
                    <Bug className="w-3 h-3 mr-1" />
                    Test
                  </Badge>
                )}
                <Badge variant="destructive" className={`${styles.badge} animate-pulse`}>
                  <Shield className="w-3 h-3 mr-1" />
                  Protected
                </Badge>
              </div>
            </div>
          </CardHeader>

          {size !== 'small' && <Separator className="mx-4" />}

          <CardContent className={`${styles.padding} pt-3 ${styles.spacing}`}>
            {size !== 'small' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {size === 'large'
                    ? "A critical error occurred that prevented this feature from working properly. The error has been isolated by SettleEase's error boundary system to prevent it from affecting other parts of the application."
                    : "This component encountered an error but the rest of SettleEase continues to work normally. The error boundary has contained the issue."
                  }
                </p>
                {isTestCrash && (
                  <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/50 rounded-md border border-orange-200 dark:border-orange-800">
                    <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-800 dark:text-orange-200">
                      This is a simulated crash for testing error boundary coverage. In production, this would be a real error that has been safely contained.
                    </p>
                  </div>
                )}
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && size !== 'small' && (
              <details className="text-xs bg-muted/50 p-3 rounded-md border border-muted-foreground/20">
                <summary className="cursor-pointer font-medium mb-2 text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center gap-2">
                    <Bug className="h-3 w-3" />
                    Error Details (Development Mode)
                  </span>
                </summary>
                <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                  <pre className="whitespace-pre-wrap text-destructive text-[10px] leading-relaxed">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}

            <div className={`flex ${size === 'small' ? 'flex-col gap-1.5' : 'flex-col sm:flex-row gap-2'} pt-1`}>
              <Button
                onClick={this.handleRetry}
                variant="default"
                size={size === 'small' ? 'sm' : 'default'}
                className={`${size === 'small' ? 'w-full' : 'flex-1'} ${styles.button} bg-primary hover:bg-primary/90 shadow-sm transition-all duration-200 hover:shadow-md`}
              >
                <RefreshCw className={`mr-2 ${size === 'small' ? 'h-3 w-3' : 'h-4 w-4'}`} />
                Try Again
              </Button>

              {(this.props.onNavigateHome || size === 'large') && (
                <Button
                  onClick={this.handleNavigateHome}
                  variant="outline"
                  size={size === 'small' ? 'sm' : 'default'}
                  className={`${size === 'small' ? 'w-full' : 'flex-1'} ${styles.button} border-primary/30 hover:bg-primary/5 hover:border-primary/50 shadow-sm transition-all duration-200 hover:shadow-md`}
                >
                  <Home className={`mr-2 ${size === 'small' ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  {size === 'small' ? 'Home' : 'Go to Dashboard'}
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