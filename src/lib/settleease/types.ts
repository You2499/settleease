export interface PayerShare {
  personId: string;
  amount: number;
}

export interface ExpenseItemDetail {
  id: string; // Can be a temporary ID during form input, or db ID if editing
  name: string;
  price: number | string; // Allow string for input, convert to number for storage/calculation
  sharedBy: string[]; // Array of person IDs
  categoryName?: string; // Optional: Category specific to this item
}

export interface CelebrationContribution {
  personId: string;
  amount: number;
}

export interface Expense {
  id: string; // Convex document ID mapped to the legacy DTO shape
  description: string;
  total_amount: number;
  category: string; // This will eventually link to Category.id or use Category.name
  paid_by: PayerShare[]; // Array of PayerShare objects
  split_method: 'equal' | 'unequal' | 'itemwise';
  shares: PayerShare[]; // Calculated shares for each person (personId and amount) based on the net amount split
  items?: ExpenseItemDetail[]; // For itemwise split method
  celebration_contribution?: CelebrationContribution | null; // New field for celebration contributions
  exclude_from_settlement?: boolean; // When true, expense is excluded from settlement calculations but still counted in analytics
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
}

export interface Person {
  id: string; // Convex document ID mapped to the legacy DTO shape
  name: string;
  created_at?: string; // ISO date string
}

export interface Category {
  id: string; // Convex document ID mapped to the legacy DTO shape
  name: string;
  icon_name: string; // e.g., "Utensils", "Car"
  created_at?: string; // ISO date string
  rank?: number; // For custom ordering
}

// Used in AddExpenseTab for form state
export interface PayerInputRow {
  id: string; // Temporary client-side ID for list rendering
  personId: string;
  amount: string; // Input string
}

// User Roles
export type UserRole = 'admin' | 'user' | null;

// Font Preferences
export type FontPreference = 'geist' | 'system' | 'inter' | 'google-sans';

export interface UserProfile {
  id: string; // profile ID
  user_id: string; // maps to auth.users.id
  role: UserRole;
  first_name?: string | null;
  last_name?: string | null;
  font_preference?: FontPreference;
  theme_preference?: string;
  last_active_view?: ActiveView;
  has_seen_welcome_toast?: boolean;
  should_show_welcome_toast?: boolean;
  last_sign_in_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SettlementPayment {
  id: string; // Convex document ID mapped to the legacy DTO shape
  debtor_id: string; // FK to people.id
  creditor_id: string; // FK to people.id
  amount_settled: number;
  settled_at: string; // ISO date string
  marked_by_user_id: string; // FK to auth.users.id
  notes?: string;
}

export interface ManualSettlementOverride {
  id: string; // Convex document ID mapped to the legacy DTO shape
  debtor_id: string; // FK to people.id - who owes
  creditor_id: string; // FK to people.id - who is owed
  amount: number; // Amount to be paid in this manual path
  notes?: string | null;
  created_by_user_id?: string | null; // FK to auth.users.id
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  is_active: boolean; // Whether this override is currently active
}

// Used for displaying calculated settlements
export interface CalculatedTransaction {
  from: string; // debtorId
  to: string;   // creditorId
  amount: number;
  contributingExpenseIds?: string[]; // Optional: for pairwise transactions to trace back
}


// Active view type for navigation
export type ActiveView = 'dashboard' | 'addExpense' | 'editExpenses' | 'managePeople' | 'manageCategories' | 'manageSettlements' | 'analytics' | 'exportExpense' | 'scanReceipt' | 'settings';

export interface ParsedReceiptData {
  restaurant_name: string | null;
  date: string | null;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category_hint: 'food' | 'drinks' | 'alcohol' | 'other';
  }[];
  subtotals: { label: string; amount: number }[];
  taxes: { label: string; amount: number }[];
  total_amount: number;
  currency: string;
  additional_charges: { label: string; amount: number }[];
}


// Used in ExpenseDetailModal for itemwise breakdown
export interface PersonItemShareDetails {
  itemName: string;
  originalItemPrice: number;
  adjustedItemPriceForSplit: number;
  shareForPerson: number;
  sharedByCount: number;
  itemId: string;
  itemCategoryName?: string; // Added for per-item category display
}

export interface PersonAggregatedItemShares {
  [personId: string]: {
    items: PersonItemShareDetails[];
    totalShareOfAdjustedItems: number;
  };
}
