import { Utensils, Car, ShoppingCart, PartyPopper, Lightbulb, Settings2, FileText, Home, Briefcase, Gift, Heart, Plane, Coffee, Zap, Pizza, Beer, Dumbbell, BookOpen, Film, Music, Globe, Palette, Sprout, Smile, Package, Building, Coins, Handshake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PEOPLE_TABLE = 'people';
export const EXPENSES_TABLE = 'expenses';
export const CATEGORIES_TABLE = 'categories';
export const USER_PROFILES_TABLE = 'user_profiles';
export const SETTLEMENT_PAYMENTS_TABLE = 'settlement_payments';

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#FFBB28', // Additional distinct color
  '#FF8042', // Additional distinct color
  '#00C49F', // Additional distinct color
];
