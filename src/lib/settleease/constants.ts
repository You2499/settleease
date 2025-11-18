// Database table names

export const PEOPLE_TABLE = 'people';
export const EXPENSES_TABLE = 'expenses';
export const CATEGORIES_TABLE = 'categories';
export const USER_PROFILES_TABLE = 'user_profiles';
export const SETTLEMENT_PAYMENTS_TABLE = 'settlement_payments';
export const MANUAL_SETTLEMENT_OVERRIDES_TABLE = 'manual_settlement_overrides';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const CHART_COLORS = [
  '#1f77b4', // Blue
  '#ff7f0e', // Orange
  '#2ca02c', // Green
  '#d62728', // Red
  '#9467bd', // Purple
  '#8c564b', // Brown
  '#e377c2', // Pink
  '#7f7f7f', // Gray
  // fallback to theme palette after these, if more are needed
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#FFBB28',
  '#FF8042',
  '#00C49F',
];
