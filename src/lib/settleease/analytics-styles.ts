import React from 'react';

// Analytics Design System Constants
export const ANALYTICS_STYLES = {
  // Card styles
  card: "shadow-lg rounded-lg",
  
  // Header styles
  header: "px-4 py-3",
  title: "flex items-center text-xl sm:text-2xl font-bold",
  icon: "mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary",
  subtitle: "text-sm text-muted-foreground mt-1",
  
  // Content styles
  chartContent: "h-[280px] sm:h-[320px] p-4 pt-0 pb-2",
  tableContent: "p-4 pt-0",
  snapshotContent: "p-4 pt-0",
  
  // Chart specific
  chartContainer: "w-full h-full flex items-center justify-center",
  chartMargins: { top: 5, right: 10, left: -10, bottom: 0 },
  chartMarginsCompact: { top: 5, right: 5, left: -5, bottom: 0 },
  
  // Empty state
  emptyState: "text-muted-foreground text-xs sm:text-sm text-center",
  
  // Tooltip styles
  tooltip: {
    contentStyle: { 
      backgroundColor: 'hsl(var(--popover))', 
      borderColor: 'hsl(var(--border))', 
      borderRadius: 'var(--radius)', 
      fontSize: '11px', 
      padding: '8px', 
      color: 'hsl(var(--popover-foreground))' 
    },
    labelStyle: { color: 'hsl(var(--popover-foreground))' },
    itemStyle: { color: 'hsl(var(--popover-foreground))' }
  },
  
  // Legend styles
  legend: { fontSize: "10px", paddingTop: "5px" },
  
  // Axis styles
  axisTick: { fill: 'hsl(var(--muted-foreground))', fontSize: 9 },
  
  // Grid styles
  grid: { strokeDasharray: "3 3", stroke: "hsl(var(--border))" },
  
  // Table styles
  tableCell: "py-1.5 px-2 text-xs",
  tableHeader: "py-2 px-2 text-xs",
  
  // Snapshot card styles
  snapshotCard: "p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5",
  snapshotLabel: "text-xs text-muted-foreground",
  snapshotValue: "text-md sm:text-lg font-bold"
} as const;

// Helper function to create consistent empty state
export const createEmptyState = (
  _title: string,
  IconComponent: React.ComponentType<any>,
  message: string
) => {
  return React.createElement('div', { className: ANALYTICS_STYLES.chartContainer },
    React.createElement('div', { className: 'text-center' },
      React.createElement(IconComponent, { className: 'h-12 w-12 mx-auto mb-4 text-primary/30' }),
      React.createElement('p', { className: ANALYTICS_STYLES.emptyState }, message)
    )
  );
};