import React from 'react';
import { ANALYTICS_STYLES } from './analytics-styles';

// Helper function to create consistent empty state
export const createEmptyState = (
  _title: string,
  IconComponent: React.ComponentType<any>,
  message: string
) => {
  return (
    <div className={ANALYTICS_STYLES.chartContainer}>
      <div className="text-center">
        <IconComponent className="h-12 w-12 mx-auto mb-4 text-primary/30" />
        <p className={ANALYTICS_STYLES.emptyState}>{message}</p>
      </div>
    </div>
  );
};