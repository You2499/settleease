import React from 'react';
import { ANALYTICS_STYLES } from '@/lib/settleease/analytics-styles';

interface EmptyStateProps {
  IconComponent: React.ComponentType<any>;
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ IconComponent, message }) => {
  return (
    <div className={ANALYTICS_STYLES.chartContainer}>
      <div className="text-center">
        <IconComponent className="h-12 w-12 mx-auto mb-4 text-primary/30" />
        <p className={ANALYTICS_STYLES.emptyState}>{message}</p>
      </div>
    </div>
  );
};

// Helper function for backward compatibility
export const createEmptyState = (
  _title: string,
  IconComponent: React.ComponentType<any>,
  message: string
) => {
  return <EmptyState IconComponent={IconComponent} message={message} />;
};