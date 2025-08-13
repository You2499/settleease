"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, HandCoins } from 'lucide-react';

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

      // Size-based styling
      const sizeClasses = {
        small: {
          card: 'border-destructive/20 bg-destructive/5',
          title: 'text-sm',
          icon: 'h-4 w-4',
          button: 'text-xs px-2 py-1',
          spacing: 'space-y-2',
          padding: 'p-3'
        },
        medium: {
          card: 'border-destructive/30 bg-destructive/10 shadow-sm',
          title: 'text-base',
          icon: 'h-5 w-5',
          button: 'text-sm px-3 py-2',
          spacing: 'space-y-3',
          padding: 'p-4'
        },
        large: {
          card: 'border-destructive bg-destructive/15 shadow-lg',
          title: 'text-lg',
          icon: 'h-6 w-6',
          button: 'text-base px-4 py-2',
          spacing: 'space-y-4',
          padding: 'p-6'
        }
      };

      const styles = sizeClasses[size];

      return (
        <Card className={`${styles.card} ${size === 'small' ? 'min-h-0' : 'min-h-[120px]'}`}>
          <CardHeader className={`${styles.padding} pb-2`}>
            <CardTitle className={`flex items-center text-destructive ${styles.title}`}>
              {showIcon && <AlertTriangle className={`mr-2 ${styles.icon} flex-shrink-0`} />}
              <div className="flex items-center">
                {size !== 'small' && (
                  <HandCoins className="mr-2 h-4 w-4 text-primary opacity-60" />
                )}
                <span>
                  {size === 'small' ? 'Error' : 'Something went wrong'}
                  {componentName && ` in ${componentName}`}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className={`${styles.padding} pt-0 ${styles.spacing}`}>
            {size !== 'small' && (
              <p className="text-sm text-muted-foreground">
                {size === 'large' 
                  ? "A critical error occurred that prevented this feature from working properly. The error has been isolated to prevent it from affecting other parts of SettleEase."
                  : "This component encountered an error but the rest of SettleEase is working normally."
                }
              </p>
            )}
            
            {process.env.NODE_ENV === 'development' && this.state.error && size !== 'small' && (
              <details className="text-xs bg-muted/50 p-2 rounded border">
                <summary className="cursor-pointer font-medium mb-1 text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="whitespace-pre-wrap text-destructive text-[10px] mt-1">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className={`flex ${size === 'small' ? 'flex-col gap-1' : 'flex-col sm:flex-row gap-2'}`}>
              <Button 
                onClick={this.handleRetry} 
                variant="default" 
                size={size === 'small' ? 'sm' : 'default'}
                className={`${size === 'small' ? 'w-full h-7' : 'flex-1'} bg-primary hover:bg-primary/90`}
              >
                <RefreshCw className={`mr-1 ${size === 'small' ? 'h-3 w-3' : 'h-4 w-4'}`} />
                Try Again
              </Button>
              
              {(this.props.onNavigateHome || size === 'large') && (
                <Button 
                  onClick={this.handleNavigateHome} 
                  variant="outline" 
                  size={size === 'small' ? 'sm' : 'default'}
                  className={`${size === 'small' ? 'w-full h-7' : 'flex-1'} border-primary/20 hover:bg-primary/5`}
                >
                  <Home className={`mr-1 ${size === 'small' ? 'h-3 w-3' : 'h-4 w-4'}`} />
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