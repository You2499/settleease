
import { Utensils, Car, ShoppingCart, PartyPopper, Lightbulb, Settings2, FileText, Home, Briefcase, Gift, Heart, Plane, Coffee, Zap, Pizza, Beer, Dumbbell, BookOpen, Film, Music, Globe, Palette, Sprout, Smile, Package, Building, Coins } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const PEOPLE_TABLE = 'people';
export const EXPENSES_TABLE = 'expenses';
export const CATEGORIES_TABLE = 'categories';

export const supabaseUrl = "https://pzednvgbxgixonpvbdsx.supabase.co";
export const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6ZWRudmdieGdpeG9ucHZiZHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NjMwNTgsImV4cCI6MjA2NTMzOTA1OH0.O1t0484ROMUbVNPWmuEvOLU1Z6IO4svK65Q0d-3h_Og";


export interface AvailableCategoryIcon {
  iconKey: string; // e.g., "Utensils"
  IconComponent: LucideIcon;
  label: string; // User-friendly label for selection, e.g., "Utensils (Food)"
}

// List of icons available for users to select when managing categories
export const AVAILABLE_CATEGORY_ICONS: AvailableCategoryIcon[] = [
  { iconKey: 'Utensils', IconComponent: Utensils, label: 'Utensils (Food/Dining)' },
  { iconKey: 'Pizza', IconComponent: Pizza, label: 'Pizza (Fast Food)' },
  { iconKey: 'Coffee', IconComponent: Coffee, label: 'Coffee (Cafe/Drinks)' },
  { iconKey: 'Beer', IconComponent: Beer, label: 'Beer (Bar/Pub)' },
  { iconKey: 'Car', IconComponent: Car, label: 'Car (Transport/Auto)' },
  { iconKey: 'Plane', IconComponent: Plane, label: 'Plane (Travel/Flights)' },
  { iconKey: 'ShoppingCart', IconComponent: ShoppingCart, label: 'Shopping Cart (General Shopping)' },
  { iconKey: 'Package', IconComponent: Package, label: 'Package (Gifts/Online Orders)' },
  { iconKey: 'PartyPopper', IconComponent: PartyPopper, label: 'Party Popper (Entertainment/Events)' },
  { iconKey: 'Film', IconComponent: Film, label: 'Film (Movies/Cinema)' },
  { iconKey: 'Music', IconComponent: Music, label: 'Music (Concerts/Streaming)' },
  { iconKey: 'Lightbulb', IconComponent: Lightbulb, label: 'Lightbulb (Utilities/Ideas)' },
  { iconKey: 'Zap', IconComponent: Zap, label: 'Zap (Electricity/Energy)' },
  { iconKey: 'FileText', IconComponent: FileText, label: 'File Text (Bills/Documents)' },
  { iconKey: 'Home', IconComponent: Home, label: 'Home (Rent/Mortgage)' },
  { iconKey: 'Building', IconComponent: Building, label: 'Building (Housing/Office)' },
  { iconKey: 'Briefcase', IconComponent: Briefcase, label: 'Briefcase (Work/Business)' },
  { iconKey: 'Gift', IconComponent: Gift, label: 'Gift (Presents)' },
  { iconKey: 'Heart', IconComponent: Heart, label: 'Heart (Health/Donations)' },
  { iconKey: 'Dumbbell', IconComponent: Dumbbell, label: 'Dumbbell (Fitness/Gym)' },
  { iconKey: 'BookOpen', IconComponent: BookOpen, label: 'Book Open (Education/Reading)' },
  { iconKey: 'Globe', IconComponent: Globe, label: 'Globe (Internet/Misc Travel)' },
  { iconKey: 'Palette', IconComponent: Palette, label: 'Palette (Hobbies/Art)' },
  { iconKey: 'Sprout', IconComponent: Sprout, label: 'Sprout (Gardening/Nature)' },
  { iconKey: 'Smile', IconComponent: Smile, label: 'Personal Care/Wellbeing)' },
  { iconKey: 'Coins', IconComponent: Coins, label: 'Coins (Savings/Investments)' },
  { iconKey: 'Settings2', IconComponent: Settings2, label: 'Settings (Miscellaneous/Other)' },
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

