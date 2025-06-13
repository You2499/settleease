
export interface PayerShare {
  personId: string;
  amount: number;
}

export interface ExpenseItemDetail {
  id: string; // Can be a temporary ID during form input, or db ID if editing
  name: string;
  price: number | string; // Allow string for input, convert to number for storage/calculation
  sharedBy: string[]; // Array of person IDs
}

export interface Expense {
  id: string; // Supabase ID
  description: string;
  total_amount: number;
  category: string; // This will eventually link to Category.id or use Category.name
  paid_by: PayerShare[]; // Array of PayerShare objects
  split_method: 'equal' | 'unequal' | 'itemwise';
  shares: PayerShare[]; // Calculated shares for each person (personId and amount)
  items?: ExpenseItemDetail[]; // For itemwise split method
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
}

export interface Person {
  id: string; // Supabase ID
  name: string;
  created_at?: string; // ISO date string
}

export interface Category {
  id: string; // Supabase ID
  name: string;
  icon_name: string; // e.g., "Utensils", "Car"
  created_at?: string; // ISO date string
}

// Used in AddExpenseTab for form state
export interface PayerInputRow {
  id: string; // Temporary client-side ID for list rendering
  personId: string;
  amount: string; // Input string
}
