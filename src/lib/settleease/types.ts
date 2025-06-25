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
  id: string; // Supabase ID
  description: string;
  total_amount: number;
  category: string; // This will eventually link to Category.id or use Category.name
  paid_by: PayerShare[]; // Array of PayerShare objects
  split_method: 'equal' | 'unequal' | 'itemwise';
  shares: PayerShare[]; // Calculated shares for each person (personId and amount) based on the net amount split
  items?: ExpenseItemDetail[]; // For itemwise split method
  celebration_contribution?: CelebrationContribution | null; // New field for celebration contributions
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

export interface UserProfile {
  id: string; // profile ID
  user_id: string; // maps to auth.users.id
  role: UserRole;
  // you can add other profile fields like full_name, avatar_url here
  created_at?: string;
  updated_at?: string;
}

export interface SettlementPayment {
  id: string; // Supabase ID
  debtor_id: string; // FK to people.id
  creditor_id: string; // FK to people.id
  amount_settled: number;
  settled_at: string; // ISO date string
  marked_by_user_id: string; // FK to auth.users.id
  notes?: string;
}

// Used for displaying calculated settlements
export interface CalculatedTransaction {
  from: string; // debtorId
  to: string;   // creditorId
  amount: number;
  contributingExpenseIds?: string[]; // Optional: for pairwise transactions to trace back
}


// Active view type for navigation
export type ActiveView = 'dashboard' | 'addExpense' | 'editExpenses' | 'managePeople' | 'manageCategories' | 'manageSettlements' | 'analytics';


// Analytics Specific Types

export interface EnhancedOverallStats {
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
  firstDate: Date | null;
  lastDate: Date | null;
  distinctParticipantCount: number;
  mostExpensiveCategory: { name: string; totalAmount: number };
  largestSingleExpense: { description: string; amount: number; date: string };
}

export interface MonthlyExpenseData {
  month: string;
  totalAmount: number;
}

export interface ShareVsPaidDataPoint {
  name: string;
  paid: number;
  share: number;
}

export interface CategorySpendingPieChartDataPoint {
  name: string;
  totalAmount: number; // Renamed from 'amount' for clarity if used elsewhere
}


export interface CategoryAnalyticsData {
  name: string;
  totalAmount: number;
  expenseCount: number;
  averageAmount: number;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  mostExpensiveItem: { description: string; amount: number; date: string; } | null;
  largestPayer: { name: string; amount: number; } | null;
}

export interface ParticipantAnalyticsData {
  name: string;
  totalPaid: number;
  totalShared: number;
  netBalance: number;
  expensesPaidCount: number;
  expensesSharedCount: number;
  mostFrequentCategoryShared: { name: string; amount: number; } | null;
  averageShareAmount: number;
}

export interface ExpenseAmountDistributionData {
  range: string;
  count: number;
}

export interface SpendingByDayOfWeekData {
  day: string;
  totalAmount: number;
}

export interface SplitMethodDistributionData {
  method: string;
  count: number;
}

export interface TopExpenseData extends Expense {
  // Potentially add formatted payer strings or other derived data if needed for display
  // For now, just reusing Expense type is fine if all necessary fields are there
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

