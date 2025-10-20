import React from 'react';

/**
 * Analytics Design System Constants
 * 
 * This file contains all standardized styles for analytics visualizations.
 * Use these constants to ensure consistency across all analytics components.
 * 
 * Last Updated: Stage 6 - Design Audit Fixes
 */
export const ANALYTICS_STYLES = {
  // Card styles - Apply to all Card components
  card: "shadow-lg rounded-lg",
  
  // Header styles - Apply to CardHeader and CardTitle
  header: "px-4 py-3",
  title: "flex items-center text-xl sm:text-2xl font-bold",
  icon: "mr-2 h-4 w-4 sm:h-5 sm:w-5 text-primary",
  subtitle: "text-sm text-muted-foreground mt-1",
  
  // Content styles - Apply to CardContent based on content type
  chartContent: "h-[280px] sm:h-[320px] p-4 pt-0 pb-2", // For chart containers
  tableContent: "p-4 pt-0", // For table containers
  snapshotContent: "p-4 pt-0", // For snapshot/stats grids
  
  // Chart specific - Use with Recharts components
  chartContainer: "w-full h-full flex items-center justify-center",
  chartMargins: { top: 5, right: 10, left: 0, bottom: 0 }, // Standard charts (LineChart, BarChart, AreaChart)
  chartMarginsCompact: { top: 5, right: 5, left: 0, bottom: 0 }, // Compact charts with rotated labels or horizontal layout
  chartMarginsPie: { top: 0, right: 0, bottom: 0, left: 0 }, // Pie charts
  
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
  
  // Axis styles - Use with XAxis and YAxis tick prop
  axisTick: { fill: 'hsl(var(--muted-foreground))', fontSize: 9 }, // Standard axis labels
  axisTickSmall: { fill: 'hsl(var(--muted-foreground))', fontSize: 8 }, // Compact charts or rotated labels
  
  // Grid styles - Use with CartesianGrid
  grid: { strokeDasharray: "3 3", stroke: "hsl(var(--border))" },
  
  // Table styles - Apply to TableCell and TableHead
  tableCell: "py-1.5 px-2 text-xs",
  tableHeader: "py-2 px-2 text-xs",
  
  // Snapshot card styles - Use for stat cards in snapshot grids
  snapshotCard: "p-2.5 sm:p-3 bg-card/50 rounded-md shadow-sm border border-border/40 space-y-0.5",
  snapshotLabel: "text-xs text-muted-foreground",
  snapshotValue: "text-md sm:text-lg font-bold",
  
  // Bar chart styles - Use with Bar component barSize prop
  barSize: 20, // Standard vertical bar charts
  barSizeCompact: 15, // Horizontal or compact bar charts
  
  // Semantic color styles - Use for balance/status indicators
  positiveColor: "hsl(142, 76%, 36%)", // Green for positive balances/credits
  negativeColor: "hsl(0, 84%, 60%)", // Red for negative balances/debts
  
  // Animation styles - Use for smooth transitions
  transition: "transition-all duration-200 ease-in-out",
} as const;

/**
 * Usage Guidelines:
 * 
 * 1. Charts: Always use chartMargins, axisTick, grid, and tooltip styles
 * 2. Tables: Always use tableCell and tableHeader for consistent sizing
 * 3. Cards: Always use card, header, title, and icon for consistent headers
 * 4. Truncation: Use max-w-[120px] for names, max-w-[150px] for secondary, max-w-[200px] for descriptions
 * 5. Responsive Hiding: Use 'hidden sm:table-cell' for less important columns, 'hidden md:table-cell' for optional columns
 * 6. Bar Charts: Use barSize for standard charts, barSizeCompact for horizontal/compact layouts
 * 7. Colors: Use positiveColor/negativeColor for balance indicators instead of hardcoded values
 */

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