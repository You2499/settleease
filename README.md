# SettleEase

A comprehensive expense management and settlement application designed to simplify group finances. Track shared expenses, calculate settlements, and visualize financial data with real-time synchronization.

## Features

- **Real-Time Expense Tracking**: Live updates across all connected users
- **Flexible Expense Splitting**:
  - Equal split among participants
  - Unequal split with custom amounts
  - Itemized split for detailed bill breakdown
- **Smart Settlement Calculation**: Optimized debt settlement algorithm
- **Comprehensive Analytics**: Visual insights into spending patterns
- **User & Category Management**: Easy management of people and expense categories
- **Settlement Tracking**: Log payments to keep balances accurate
- **Secure Authentication**: Powered by Supabase Auth
- **Error Boundary Testing**: Visual testing interface for error handling

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time)
- **UI**: Tailwind CSS + Shadcn/UI components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- Node.js 18+
- A Supabase account

### 1. Database Setup

Create a new Supabase project and run this SQL:

```sql
-- People table
CREATE TABLE public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon_name TEXT,
    rank INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    category TEXT REFERENCES public.categories(name),
    paid_by JSONB,
    split_method TEXT NOT NULL,
    shares JSONB,
    items JSONB,
    celebration_contribution JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Settlement payments table
CREATE TABLE public.settlement_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID REFERENCES public.people(id),
    creditor_id UUID REFERENCES public.people(id),
    amount_settled NUMERIC NOT NULL,
    settled_at TIMESTAMPTZ DEFAULT now(),
    marked_by_user_id UUID REFERENCES auth.users(id),
    notes TEXT,
    status TEXT DEFAULT 'pending'
);

-- User profiles table
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id),
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### 2. Application Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd settleease

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Run development server
npm run dev
```

Visit `http://localhost:3000` to start using SettleEase.

## Project Structure

```
src/
├── app/                    # Next.js app directory
├── components/
│   ├── settleease/        # Core application components
│   └── ui/                # Reusable UI components
├── lib/
│   └── settleease/        # Types, utilities, and constants
└── hooks/                 # Custom React hooks
```

## Architecture Overview

### Component Architecture

SettleEase follows a well-structured component architecture with clear separation of concerns. Components are organized hierarchically, with larger container components broken down into smaller, focused sub-components.

#### Main Application Structure

- **App Layout** (`src/app/layout.tsx`) - Main application wrapper
- **Main Page** (`src/app/page.tsx`) - Entry point with 8 main tab views
- **Theme Provider** (`src/components/ThemeProvider.tsx`) - Theme management

#### Core Feature Components (Main Tabs)

1. **Dashboard** - Settlement calculations and expense overview
2. **Analytics** - Data visualization and spending insights
3. **Add Expense** - Expense creation with flexible splitting options
4. **Edit Expenses** - Expense modification interface
5. **Manage People** - User management (Admin only)
6. **Manage Categories** - Category management (Admin only)
7. **Manage Settlements** - Settlement tracking (Admin only)
8. **Test Error Boundaries** - Error boundary testing interface (Admin only)

### Component Decomposition Quality

#### ✅ Excellent Decomposition (5/5)

**AddExpenseTab** - Broken into 8 specialized sub-components:
- `ExpenseBasicInfo.tsx` - Description, amount, category, date inputs
- `PayerInputSection.tsx` - Payment selection
- `SplitMethodSelector.tsx` - Split method selection
- `EqualSplitSection.tsx` - Equal split participants
- `UnequalSplitSection.tsx` - Custom amount splitting
- `ItemwiseSplitSection.tsx` - Item-by-item splitting
- `CelebrationSection.tsx` - Special celebration handling
- `ExpenseFormLogic.tsx` - Form submission logic

**AnalyticsTab** - Broken into 10 specialized chart components:
- `OverallAnalyticsSnapshot.tsx` - Summary statistics
- `MonthlySpendingChart.tsx` - Monthly trends
- `ShareVsPaidComparisonChart.tsx` - Payment vs obligation comparison
- `SpendingByDayChart.tsx` - Day-of-week patterns
- `SplitMethodChart.tsx` - Split method distribution
- `TopExpensesTable.tsx` - Highest expenses
- `CategoryAnalyticsTable.tsx` - Category breakdown
- `ParticipantSummaryTable.tsx` - Per-person summary
- `CategorySpendingPieChart.tsx` - Category spending visualization
- `ExpenseDistributionChart.tsx` - Distribution analysis

**SettlementSummary** - Multi-layer breakdown with 15+ sub-components:
- Step-by-step settlement process visualization
- Comprehensive verification and debugging tools
- Per-person settlement details with 4 focused sub-components

**ExpenseDetailModal** - 4 focused sections with comprehensive error boundaries

#### ✅ Good Decomposition (4/5)

- **DashboardView** - 2 main components with extensive sub-breakdown
- **TestErrorBoundaryTab** - 3 test components with admin access control

#### ⚠️ Moderate to Minimal Decomposition

- Management tabs (People, Categories, Settlements) - Single components
- Authentication and loading screens - Appropriately scoped

### Error Boundary System

SettleEase implements a comprehensive error boundary strategy using a single, focused system:

#### SettleEaseErrorBoundary
- **Purpose**: Domain-specific error handling with SettleEase theming
- **Sizes**: `small`, `medium`, `large`
- **Features**: 
  - Custom branded error messages
  - Retry functionality
  - Size-responsive UI
  - Development error details
  - Navigation to dashboard

#### Error Boundary Coverage

**✅ Excellent Coverage:**
- **App Level**: 8 large error boundaries (one per main tab)
- **AddExpense Flow**: 13 error boundaries (4 medium + 9 small)
- **ExpenseDetail Modal**: 4 medium error boundaries
- **TestErrorBoundary Tab**: Visual testing interface

**❌ Areas Needing Improvement:**
- **Analytics Components**: No internal error boundaries
- **Dashboard Components**: Settlement calculations unprotected
- **Management Features**: Rely solely on top-level boundaries

#### Coverage Statistics

| Protection Level | Component Count | Percentage |
|-----------------|----------------|------------|
| **Fully Protected** | 3 components | 5% |
| **Well Protected** | 8 components | 13% |
| **Indirectly Protected** | 15 components | 25% |
| **Minimally Protected** | 25 components | 42% |
| **No Protection** | 10 components | 15% |

### Custom Hooks

- **useSupabaseAuth.ts** - Authentication logic
- **useSupabaseData.ts** - Data fetching logic
- **useSupabaseRealtime.ts** - Real-time updates
- **useErrorHandler.ts** - Centralized error handling
- **use-mobile.tsx** - Mobile detection
- **use-toast.ts** - Toast notifications

### UI Component Library

Comprehensive set of base UI components including:
- Form components (button, input, select, checkbox, etc.)
- Layout components (card, dialog, sheet, tabs, table)
- Navigation components (sidebar, dropdown-menu)
- Feedback components (alert, toast, skeleton)
- Data display components (badge, calendar, tooltip)

## Key Features

### Real-Time Synchronization
- Live updates across all connected users
- Automatic data refresh on changes
- Real-time settlement calculations

### Flexible Expense Management
- Multiple splitting methods (equal, unequal, itemized)
- Category-based organization
- Celebration contribution handling
- Comprehensive expense editing

### Smart Settlement Algorithm
- Optimized debt settlement calculations
- Step-by-step settlement visualization
- Payment tracking and verification
- Algorithm testing and debugging tools

### Comprehensive Analytics
- Monthly spending trends
- Category-based analysis
- Per-person spending summaries
- Visual data representation with charts

### Error Handling & Testing
- Visual error boundary testing interface
- Comprehensive error coverage analysis
- Admin-only testing tools
- Real-time crash simulation

### Mobile Optimization
- Responsive design across all components
- Mobile-first approach
- Touch-friendly interfaces
- Optimized navigation for small screens

## Development Guidelines

### Component Best Practices
1. **Single Responsibility** - Each component has a clear, focused purpose
2. **Reusability** - Sub-components can be used in different contexts
3. **Error Boundaries** - Critical flows have comprehensive error protection
4. **Mobile First** - All components are mobile-optimized
5. **Type Safety** - Comprehensive TypeScript coverage

### Error Boundary Strategy
1. **Hierarchical Protection** - Multi-level error boundary implementation
2. **Appropriate Sizing** - Large for features, medium for sections, small for inputs
3. **Descriptive Names** - Clear component names for debugging
4. **Strategic Placement** - Critical user flows are well protected

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

SettleEase works on any platform supporting Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- Self-hosted with Docker

## Development Reference

### 📋 Component Refactor and Boundary Plan
For detailed implementation guidance, current status, and future roadmap, see:
**[COMPONENT_REFACTOR_AND_BOUNDARY_PLAN.md](./COMPONENT_REFACTOR_AND_BOUNDARY_PLAN.md)**

This comprehensive document includes:
- Current implementation status for all components
- Detailed error boundary coverage analysis
- Step-by-step implementation plans with code examples
- File reference guide for quick navigation
- Testing strategies and success metrics
- Roadmap for future development phases

### 🧪 Error Boundary Testing
Use the built-in testing interface:
1. Login as admin user
2. Navigate to "Test Error Boundary" tab
3. Use visual testing tools to simulate crashes
4. Verify error boundary coverage across all components

## Contributing

1. Fork the repository
2. Create a feature branch
3. **Review the Component Refactor Plan** - Check current status and implementation guidelines
4. Make your changes following the component architecture guidelines
5. Add appropriate error boundaries for new components
6. Ensure mobile optimization using `useIsMobile` hook
7. Test error boundaries using the TestErrorBoundaryTab
8. Update the Component Refactor Plan document with your changes
9. Submit a pull request

## Architecture Assessment

**Overall Grade: A-** - Excellent component architecture with comprehensive error handling

**Strengths:**
- Excellent component decomposition in critical flows
- Comprehensive error boundary coverage in key areas
- Mobile-first responsive design
- Clear separation of concerns
- Comprehensive TypeScript coverage

**Areas for Improvement:**
- Add error boundaries to analytics components
- Enhance dashboard component error isolation
- Improve management feature error handling

## Statistics

- **Total Components**: 60+ components across 8 main feature areas
- **Error Boundary Coverage**: 25+ strategically placed boundaries
- **Mobile Optimization**: 100% responsive components
- **TypeScript Coverage**: Comprehensive type safety
- **Architecture Quality**: Excellent with focused improvements needed

This architecture results in a maintainable, testable, and scalable codebase with comprehensive error handling, mobile optimization, and clear separation of concerns.

## License

MIT License - see LICENSE file for details