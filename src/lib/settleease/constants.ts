
import { Utensils, Car, ShoppingCart, PartyPopper, Lightbulb, Settings2, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PEOPLE_TABLE = 'people';
export const EXPENSES_TABLE = 'expenses';

export const supabaseUrl = "https://pzednvgbxgixonpvbdsx.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6ZWRudmdieGdpeG9ucHZiZHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjMwNTgsImV4cCI6MjA2NTMzOTA1OH0.O1t0484ROMUbVNPWmuEvOLU1Z6IO4svK65Q0d-3h_Og";

export interface CategoryConfig {
  name: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryConfig[] = [
  { name: 'Food', icon: Utensils },
  { name: 'Transport', icon: Car },
  { name: 'Shopping', icon: ShoppingCart },
  { name: 'Entertainment', icon: PartyPopper },
  { name: 'Utilities', icon: Lightbulb },
  { name: 'Groceries', icon: ShoppingCart },
  { name: 'Bills', icon: FileText },
  { name: 'Other', icon: Settings2 },
];

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
