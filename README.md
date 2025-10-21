# SettleEase

A comprehensive expense management and settlement application for groups, built with Next.js 15, TypeScript, and Supabase.

## 🌟 Overview

SettleEase is a modern web application designed to simplify group expense management and settlement calculations. Whether you're managing expenses for roommates, travel groups, or any shared financial arrangements, SettleEase provides an intuitive interface to track expenses, calculate settlements, and manage group finances efficiently.

## ✨ Key Features

### 📊 **Advanced Expense Management**
- **Multiple Split Methods**: Equal split, unequal split, and itemwise splitting with per-item categories
- **Dynamic Categories**: Customizable expense categories with 1000+ Lucide icons and drag-and-drop ranking
- **Celebration Contributions**: Special handling for celebration expenses with automatic adjustment calculations
- **Real-time Updates**: Live synchronization across all users with Supabase realtime subscriptions
- **Comprehensive Expense Details**: Rich expense detail modal with payment analysis and net effect summaries

### 🧮 **Smart Settlement Calculations**
- **Optimized Algorithms**: Minimized transaction calculations to reduce settlement complexity
- **Pairwise Transactions**: Direct debt tracking between specific people with contributing expense traceability
- **Settlement History**: Complete audit trail of all payments with user attribution
- **Net Balance Tracking**: Real-time balance calculations for all participants
- **Custom Settlement Forms**: Manual settlement entry with validation and conflict resolution

### 👥 **User Management & Authentication**
- **Role-based Access Control**: Admin and user roles with granular permissions
- **Google OAuth Integration**: Seamless authentication with automatic name parsing from Google profiles
- **User Profiles**: Customizable first and last names with intelligent Google name extraction
- **Multi-user Support**: Designed for group collaboration with secure data isolation

### 📈 **Comprehensive Analytics Dashboard**
- **Dual View Modes**: Group analytics and personal insights with person-specific filtering
- **20+ Chart Types**: Including heatmaps, trend analysis, distribution charts, and velocity tracking
- **Category Analytics**: Detailed spending breakdown by category with most expensive items and largest payers
- **Participant Analytics**: Individual spending patterns, net balances, and category preferences
- **Time-based Analysis**: Monthly trends, day-of-week patterns, and expense frequency timelines
- **Advanced Metrics**: Debt/credit balance over time, expense velocity, and size distribution analysis

## 🏗️ Architecture

### **Frontend Stack**
- **Next.js 15.3.3**: React framework with App Router and optimized package imports
- **TypeScript 5**: Full type safety with strict mode enabled throughout the application
- **Tailwind CSS 3.4**: Utility-first CSS framework with custom design system and animations
- **Radix UI**: Accessible component primitives with comprehensive keyboard navigation
- **Lucide React 0.523**: Beautiful icon library with 1000+ icons and automated build process
- **Recharts 2.15**: Powerful charting library for advanced analytics visualization
- **Shadcn/ui**: Modern component library built on Radix UI primitives

### **Backend & Database**
- **Supabase**: Backend-as-a-Service with PostgreSQL 12.2.3 database
- **Row Level Security (RLS)**: Comprehensive security policies for all tables
- **Real-time Subscriptions**: Live data synchronization with automatic reconnection
- **Database Functions**: Custom PostgreSQL functions for admin checks and email validation
- **Automated Triggers**: User profile creation with Google OAuth name parsing

### **State Management & Performance**
- **Custom React Hooks**: Modular state management with optimized re-renders
- **Real-time Sync**: Automatic data synchronization with conflict resolution
- **Error Boundaries**: Component-level error handling with recovery mechanisms
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Indexed Database Queries**: Performance-optimized queries with proper indexing

## 🗄️ Database Schema

### **Core Tables**

#### `people`
- **Purpose**: Stores group participants for expense attribution
- **Key Fields**: `id` (UUID), `name` (text), `created_at`
- **Features**: Simple name-based identification, foreign key relationships to settlements
- **RLS**: Full read/write access for authenticated users

#### `expenses`
- **Purpose**: Central expense tracking with flexible JSONB structure
- **Key Fields**: `description`, `total_amount`, `category`, `paid_by` (JSONB), `shares` (JSONB), `items` (JSONB)
- **Split Methods**: Equal, unequal, and itemwise with per-item categories
- **Special Features**: Celebration contributions, automatic share calculations
- **RLS**: Comprehensive policies for secure multi-user access

#### `categories`
- **Purpose**: Customizable expense categories with visual icons
- **Key Fields**: `name` (unique), `icon_name` (Lucide icon), `rank` (custom ordering)
- **Features**: Drag-and-drop ranking, 1000+ icon choices, foreign key to expenses
- **RLS**: Full CRUD operations for authenticated users

#### `settlement_payments`
- **Purpose**: Tracks actual payments between people with full audit trail
- **Key Fields**: `debtor_id`, `creditor_id`, `amount_settled`, `marked_by_user_id`, `notes`
- **Features**: User attribution, timestamped records, optional notes
- **Relationships**: Foreign keys to people and auth.users tables
- **RLS**: Secure access with user-specific policies

#### `user_profiles`
- **Purpose**: Extended user information and role management
- **Key Fields**: `user_id` (FK to auth.users), `role` (admin/user), `first_name`, `last_name`
- **Features**: Automatic profile creation via triggers, Google OAuth name parsing
- **Security**: Admin role validation functions, infinite recursion prevention
- **RLS**: User-specific access with admin override capabilities

### **Database Functions**
- `is_current_user_admin()`: Role validation for admin operations
- `check_email_exists()`: Email existence validation
- `check_email_status()`: Comprehensive email status with Google OAuth detection

### **Removed Systems**
- **Feature Flags System**: Removed in favor of simpler role-based access
- **Activity Feed System**: Removed to reduce complexity and improve performance
- **Notification System**: Simplified to focus on core expense management features

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Supabase account** and project
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd settleease
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Apply the database migrations (70+ migrations available)
   - Configure Row Level Security policies (automatically applied)
   - Set up Google OAuth provider in Supabase Auth settings

5. **Build Lucide Icons** (Required for categories)
   ```bash
   npm run prebuild
   ```
   This downloads 1000+ Lucide icons and generates metadata for the category system.

6. **Start Development Server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Development Commands

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run prebuild` - Download Lucide icons and generate metadata

## 🔧 Configuration

### **MCP (Model Context Protocol) Integration**
The application includes MCP integration for enhanced development capabilities:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=your_project_ref"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your_access_token"
      },
      "autoApprove": ["list_tables", "execute_sql", "list_extensions", "list_migrations", "apply_migration"]
    }
  }
}
```

### **Role-Based Access Control**
Access is controlled through user roles in the `user_profiles` table:
- **Admin Role**: Full access to all features including expense management, category management, and settlements
- **User Role**: Read-only access to dashboard and analytics
- **Automatic Assignment**: New users default to 'user' role

### **Google OAuth Configuration**
Set up Google OAuth in your Supabase project:
1. Configure Google OAuth provider in Supabase Auth settings
2. Add your domain to authorized redirect URLs
3. The app automatically parses Google profile names into first/last name fields

### **Theme Configuration**
The application supports light and dark themes with a custom design system:
- **Primary Colors**: Forest Green palette with HSL variables
- **Typography**: System fonts with Inter fallback
- **Charts**: 5-color coordinated scheme for data visualization
- **Responsive Design**: Mobile-first approach with adaptive layouts

### **Build Configuration**
- **TypeScript**: Strict mode enabled with build error ignoring for deployment
- **ESLint**: Configured with Next.js rules, build warnings ignored
- **Tailwind**: Custom configuration with animations and sidebar components
- **Next.js**: Optimized package imports for Lucide React icons

## 📱 User Interface & Experience

### **Modern Design System**
- **Sidebar Navigation**: Collapsible sidebar with role-based menu items
- **Mobile-First**: Responsive design with touch-friendly interfaces
- **Dark/Light Themes**: System preference detection with manual toggle
- **Loading States**: Comprehensive loading screens with contextual messages

### **Advanced Components**
- **Drag & Drop**: Category ranking with @dnd-kit integration
- **Rich Modals**: Expense detail modal with tabbed information views
- **Interactive Charts**: 20+ chart types with hover states and tooltips
- **Smart Forms**: Multi-step expense forms with validation and auto-calculation

### **Accessibility & Performance**
- **WCAG 2.1 Compliant**: Full keyboard navigation and screen reader support
- **Error Boundaries**: Component-level error handling with recovery options
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Real-time Sync**: Live data updates with connection status indicators

### **Mobile Experience**
- **Touch Gestures**: Swipe-friendly interfaces for mobile devices
- **Responsive Tables**: Horizontal scrolling with sticky headers
- **Mobile Navigation**: Collapsible sidebar with hamburger menu
- **Optimized Performance**: Lazy loading and code splitting for faster mobile loads

## 🔐 Security

### **Authentication**
- Supabase Auth with Google OAuth integration
- Automatic user profile creation via database triggers
- Session management with automatic token refresh

### **Authorization**
- Role-based access control (Admin/User)
- Row Level Security (RLS) policies on all tables
- Feature-level permissions via feature flags

### **Data Protection**
- All sensitive operations require authentication
- Database-level security with RLS
- Input validation and sanitization

## 🧪 Development Features

### **Error Handling**
- Comprehensive error boundaries with component-level recovery
- Toast notifications for user feedback
- Detailed error logging for debugging

### **Development Tools**
- TypeScript for type safety
- ESLint for code quality
- Comprehensive debug interfaces
- Real-time data synchronization testing

### **Build Process**
- Automated Lucide icon processing
- TypeScript compilation with strict mode
- Optimized production builds with Next.js

## 📊 Analytics & Insights

The analytics dashboard provides comprehensive insights with dual viewing modes:

### **Group Analytics**
- **Overall Statistics**: Total expenses, averages, participant counts, date ranges
- **Monthly Trends**: Spending patterns over time with trend analysis
- **Category Breakdown**: Detailed spending by category with most expensive items
- **Participant Summary**: Individual spending patterns and net balances
- **Visual Charts**: 20+ chart types including heatmaps, pie charts, and distribution analysis

### **Personal Analytics**
- **Individual Focus**: Person-specific spending analysis and insights
- **Personal Trends**: Individual monthly spending and category preferences
- **Share vs. Paid**: Comparison of what you paid vs. what you owe
- **Category Insights**: Your most frequent categories and spending patterns
- **Debt/Credit Tracking**: Balance changes over time with settlement history

### **Advanced Analytics Features**
- **Transaction Heatmap**: Calendar view of expense frequency and amounts
- **Expense Velocity**: Rate of spending over time periods
- **Size Distribution**: Analysis of expense amounts and patterns
- **Split Method Analysis**: Breakdown of how expenses are typically split
- **Time-based Patterns**: Day-of-week and monthly spending trends
- **Category Trends**: Monthly category spending evolution

## 🔄 Real-time Features

### **Live Data Synchronization**
- **Supabase Realtime**: Automatic updates when expenses are added/modified by any user
- **Settlement Calculations**: Real-time balance updates and transaction optimization
- **Connection Management**: Automatic reconnection handling with status indicators
- **Conflict Resolution**: Optimistic updates with server reconciliation

### **User Feedback Systems**
- **Toast Notifications**: Success, error, and informational messages
- **Loading Indicators**: Context-aware loading states throughout the application
- **Error Recovery**: Graceful error handling with retry mechanisms
- **Sync Status**: Visual indicators for data synchronization status

## 🛠️ Customization & Flexibility

### **Category Management**
- **Custom Categories**: Add unlimited expense categories with unique names
- **Icon Selection**: Choose from 1000+ Lucide icons with search and preview
- **Drag & Drop Ranking**: Reorder categories with intuitive drag-and-drop interface
- **Per-Item Categories**: Assign different categories to individual items in itemwise splits

### **Settlement Flexibility**
- **Multiple Split Methods**: Equal, unequal, and itemwise splitting with automatic calculations
- **Celebration Handling**: Special contributions that don't affect regular splits
- **Custom Settlements**: Manual settlement entry with validation and notes
- **Transaction Optimization**: Automatic minimization of required payments between people

### **User Experience Customization**
- **Profile Management**: Customizable first/last names with Google OAuth integration
- **Theme Preferences**: System-aware dark/light mode with manual override
- **Mobile Optimization**: Touch-friendly interfaces with responsive design
- **Role-Based Views**: Different interfaces for admin and user roles

## 📈 Performance & Scalability

### **Database Optimization**
- **Efficient JSONB Usage**: Flexible data structures for expenses, payments, and items
- **Strategic Indexing**: Performance-optimized queries on frequently accessed columns
- **Row Level Security**: Secure, scalable multi-user data access patterns
- **Connection Pooling**: Supabase-managed database connections for high concurrency

### **Frontend Performance**
- **Code Splitting**: Component-level lazy loading with Next.js App Router
- **Optimized Re-renders**: Memoized calculations and efficient React hooks
- **Bundle Optimization**: Lucide icon tree-shaking and package import optimization
- **Real-time Efficiency**: Selective subscription management to minimize bandwidth

### **Scalability Features**
- **Role-Based Architecture**: Simplified access control without complex feature flag systems
- **Modular Components**: Reusable, maintainable component architecture
- **Error Boundaries**: Isolated error handling preventing application-wide crashes
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with React

## 🤝 Contributing

### **Development Workflow**
1. **Fork the repository** and clone locally
2. **Create a feature branch** from main
3. **Install dependencies** with `npm install`
4. **Run prebuild** to download Lucide icons: `npm run prebuild`
5. **Set up environment** variables for Supabase
6. **Make your changes** with proper TypeScript types
7. **Test thoroughly** including mobile responsiveness and error cases
8. **Run type checking** with `npm run typecheck`
9. **Submit a pull request** with detailed description

### **Code Standards**
- **TypeScript Strict Mode**: Full type safety with proper interfaces
- **Component Patterns**: Consistent use of Radix UI primitives and custom hooks
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Mobile-First Design**: Responsive layouts with touch-friendly interfaces
- **Accessibility**: WCAG 2.1 compliance with keyboard navigation
- **Performance**: Optimized re-renders and efficient state management

### **Testing Guidelines**
- Test all expense split methods (equal, unequal, itemwise)
- Verify real-time synchronization across multiple browser tabs
- Test role-based access control (admin vs user permissions)
- Validate mobile responsiveness on various screen sizes
- Check error boundary recovery mechanisms

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support & Troubleshooting

### **Common Issues**
1. **Lucide Icons Not Loading**: Run `npm run prebuild` to download icon metadata
2. **Real-time Updates Not Working**: Check Supabase connection and RLS policies
3. **Google OAuth Issues**: Verify OAuth configuration in Supabase Auth settings
4. **Permission Errors**: Ensure user has correct role in `user_profiles` table

### **Debug Resources**
- **Error Boundaries**: Component-level error information with stack traces
- **Network Tab**: Monitor Supabase API calls and real-time subscriptions
- **Console Logs**: Detailed logging for authentication and data synchronization
- **Database Logs**: Check Supabase dashboard for query performance and errors

### **Getting Help**
1. Check the application's built-in error boundaries for detailed error information
2. Review the database schema and RLS policies in Supabase dashboard
3. Examine real-time subscription status in browser developer tools
4. Contact the development team with detailed error information and reproduction steps

## 📋 Project Status

- **Version**: 2.0.0
- **Status**: Active Development
- **Database Migrations**: 70+ migrations applied
- **Features**: Core expense management, analytics, and settlement calculations
- **Removed**: Feature flags and activity feed systems (simplified for better performance)

## 🔐 In-Depth Feature Deep Dives

### **SettleSecure** - Advanced Authentication System

SettleEase's authentication system "SettleSecure", provides enterprise-grade security with a seamless user experience.

#### **Multi-Modal Authentication**
- **Email/Password Authentication**: Traditional signup with comprehensive validation
- **Google OAuth Integration**: One-click authentication with automatic profile creation
- **Hybrid Account Detection**: Intelligent detection of existing Google vs email accounts

#### **Advanced Security Features**
- **Email Status Verification**: Database-level email existence checking with `check_email_status()` function
- **Account Hijacking Prevention**: Secure password verification for unconfirmed accounts
- **Google Account Detection**: Prevents password-based signup for existing Google OAuth users
- **Rate Limiting Protection**: Built-in protection against brute force attacks

#### **Smart User Experience**
- **Contextual Error Messages**: Detailed, actionable error messages with suggestions
- **Auto-Focus Management**: Intelligent form field focusing based on user flow
- **Loading State Management**: Comprehensive loading indicators with timeout handling
- **Confirmation Email Resending**: Secure resend functionality with password verification

#### **Profile Management**
- **Automatic Name Parsing**: Google OAuth profiles automatically parsed into first/last names
- **Name Capitalization**: Intelligent name formatting with proper capitalization
- **Profile Completion Modal**: Guided setup for incomplete profiles
- **Session Management**: Secure session handling with automatic cleanup

#### **Technical Implementation**
- **Database Functions**: Custom PostgreSQL functions for secure email validation
- **Row Level Security**: Comprehensive RLS policies for user data protection
- **Real-time Validation**: Client-side validation with server-side verification
- **Error Boundary Integration**: Graceful error handling with recovery mechanisms

#### **OAuth Flow Management**
- **Confirmation Modal**: User-friendly OAuth consent with clear explanations
- **Redirect Handling**: Secure redirect management with production URL configuration
- **State Management**: Proper OAuth state handling with timeout protection
- **Cross-Tab Synchronization**: Handles OAuth completion across browser tabs

### **AnalyticsEngine** - Advanced Data Visualization System

SettleEase's analytics system provides comprehensive insights through 20+ interactive visualizations with dual viewing modes.

#### **Dual Analytics Modes**
- **Group Analytics**: Complete overview of all group expenses and participant behavior
- **Personal Analytics**: Individual-focused insights with person-specific calculations
- **Dynamic Filtering**: Real-time switching between group and personal perspectives
- **Context-Aware Calculations**: Different calculation methods based on selected mode

#### **Advanced Chart Types**
- **Monthly/Weekly Trends**: Time-series analysis with toggleable granularity
- **Transaction Heatmap Calendar**: GitHub-style activity calendar with intensity mapping
- **Category Deep Dive**: Comprehensive category analysis with largest items and top payers
- **Balance Over Time**: Debt/credit tracking with settlement integration
- **Expense Distribution**: Size-based expense categorization and patterns
- **Split Method Analysis**: Breakdown of how expenses are typically divided

#### **Intelligent Data Processing**
- **Itemwise Calculation Engine**: Complex per-item category analysis for itemwise splits
- **Celebration Contribution Handling**: Automatic adjustment for celebration expenses
- **Proportional Attribution**: Smart allocation of payments to categories and items
- **Real-time Aggregation**: Live calculation updates with expense changes

#### **Interactive Features**
- **Responsive Charts**: Mobile-optimized visualizations with touch-friendly interactions
- **Detailed Tooltips**: Rich hover information with transaction breakdowns
- **Empty State Management**: Contextual messages for missing data scenarios
- **Loading State Handling**: Smooth transitions during data processing

#### **Design System Integration**
- **Consistent Styling**: Centralized analytics styles with semantic color coding
- **Accessibility Compliance**: Screen reader compatible with keyboard navigation
- **Theme Integration**: Automatic dark/light mode support for all visualizations
- **Mobile-First Design**: Responsive layouts with progressive enhancement

#### **Performance Optimizations**
- **Memoized Calculations**: Efficient re-computation only when data changes
- **Data Aggregation**: Smart grouping to reduce chart complexity
- **Lazy Loading**: Component-level code splitting for faster initial loads
- **Memory Management**: Proper cleanup of chart instances and event listeners

#### **Technical Implementation**
- **Recharts Integration**: Professional-grade charting with customizable components
- **TypeScript Safety**: Fully typed data structures and calculation functions
- **Error Boundaries**: Isolated error handling for individual chart components
- **Real-time Updates**: Automatic refresh when underlying data changes

### **ExpenseForge** - Advanced Expense Management System

SettleEase's expense management system provides sophisticated tools for creating, editing, and analyzing complex expense scenarios.

#### **Multi-Modal Split Methods**
- **Equal Split**: Automatic division among selected participants with real-time calculations
- **Unequal Split**: Custom amount allocation with validation and balance checking
- **Itemwise Split**: Per-item category assignment with proportional celebration adjustments
- **Hybrid Combinations**: Support for celebration contributions across all split methods

#### **Intelligent Form Management**
- **Dynamic Validation**: Real-time form validation with contextual error messages
- **Auto-Population**: Smart defaults based on user patterns and previous expenses
- **State Persistence**: Form state management during navigation and editing
- **Error Recovery**: Graceful handling of validation failures with guided corrections

#### **Advanced Payment Handling**
- **Multiple Payers**: Support for complex payment scenarios with automatic validation
- **Celebration Contributions**: Special handling for partial payments (treats, gifts, etc.)
- **Payment Verification**: Automatic balance checking between total amount and payer contributions
- **Proportional Adjustments**: Intelligent adjustment of itemwise splits when celebrations are involved

#### **Sophisticated Itemwise Engine**
- **Per-Item Categories**: Individual category assignment for each item in itemwise splits
- **Dynamic Item Management**: Add/remove items with automatic recalculation
- **Shared-By Selection**: Flexible participant selection per item with visual feedback
- **Proportional Calculation**: Complex algorithms for celebration contribution adjustments

#### **Comprehensive Expense Details**
- **Rich Detail Modal**: Multi-section expense breakdown with tabbed information
- **Net Effect Analysis**: Complete financial impact analysis per participant
- **Payment Breakdown**: Detailed view of who paid what and why
- **Split Visualization**: Clear representation of how amounts were divided

#### **Edit & Delete Operations**
- **In-Place Editing**: Seamless transition from view to edit mode
- **Data Preservation**: Intelligent form population from existing expense data
- **Validation Continuity**: Consistent validation rules between add and edit modes
- **Safe Deletion**: Confirmation dialogs with expense details for safe removal

#### **Form Logic & Validation**
- **Comprehensive Validation**: Multi-layer validation covering all edge cases
- **Balance Verification**: Automatic checking of payment vs. split totals
- **Category Validation**: Ensures all items have valid categories assigned
- **Participant Validation**: Verifies all selected participants exist and are valid

#### **Technical Architecture**
- **Custom Hook Logic**: Centralized form logic with `useExpenseFormLogic` hook
- **Error Boundary Integration**: Component-level error isolation with recovery
- **TypeScript Safety**: Fully typed interfaces for all expense-related data structures
- **Real-time Calculations**: Live updates of totals, shares, and balances during input

### **PeopleHub** - Intelligent Participant Management System

SettleEase's people management system provides sophisticated tools for managing group participants with comprehensive safety checks.

#### **Smart Participant Management**
- **Real-time Validation**: Instant name validation with duplicate prevention
- **In-line Editing**: Seamless edit mode with save/cancel functionality
- **Hover Interactions**: Progressive disclosure of edit/delete actions
- **Auto-focus Management**: Intelligent focus handling for optimal user experience

#### **Advanced Safety Systems**
- **Transaction Dependency Checking**: Comprehensive validation before allowing deletions
- **Multi-table Verification**: Checks expenses, settlements, and payment records
- **Detailed Conflict Resolution**: Clear explanations when deletions are blocked
- **Graceful Error Handling**: User-friendly error messages with actionable guidance

#### **Intelligent Deletion Protection**
- **Expense Involvement Detection**: Scans all expenses for payer and share relationships
- **Settlement History Verification**: Checks both debtor and creditor roles in settlements
- **JSONB Field Analysis**: Deep inspection of complex payment and share structures
- **Referential Integrity**: Maintains data consistency across all related tables

#### **User Experience Features**
- **Progressive Enhancement**: Hover states reveal available actions
- **Loading State Management**: Clear feedback during database operations
- **Confirmation Dialogs**: Safe deletion workflows with detailed warnings
- **Responsive Design**: Optimized for both desktop and mobile interactions

### **SettlementEngine** - Advanced Debt Resolution System

SettleEase's settlement system provides sophisticated algorithms for debt calculation and payment tracking with multiple resolution methods.

#### **Intelligent Settlement Algorithms**
- **Simplified Transaction Optimization**: Minimizes the number of required payments
- **Real-time Balance Calculation**: Live updates based on expenses and recorded payments
- **Multi-source Data Integration**: Combines expense data with manual payment records
- **Debt Consolidation**: Automatically consolidates complex multi-party debts

#### **Dual Settlement Modes**
- **Automated Settlements**: System-calculated optimal payment paths
- **Custom Payment Recording**: Manual entry for direct payments between participants
- **Hybrid Tracking**: Seamless integration of both automated and manual payments
- **Historical Audit Trail**: Complete record of all settlement activities

#### **Advanced Payment Management**
- **Payment Verification**: Confirmation dialogs with detailed payment breakdowns
- **Reversible Operations**: Safe unmark functionality for recorded payments
- **Payment Attribution**: Clear distinction between auto-settlements and custom payments
- **Notes and Context**: Optional notes for custom payments with full context tracking

#### **Real-time Debt Calculation**
- **Dynamic Balance Updates**: Live recalculation as expenses and payments change
- **Celebration Contribution Integration**: Automatic adjustment for special contributions
- **Multi-currency Support**: Flexible amount handling with proper validation
- **Precision Handling**: Accurate decimal calculations with proper rounding

#### **Settlement Visualization**
- **Visual Payment Flow**: Clear representation of who owes whom
- **Color-coded Participants**: Visual distinction between debtors and creditors
- **Amount Highlighting**: Prominent display of settlement amounts
- **Status Indicators**: Clear differentiation between outstanding and completed payments

#### **Technical Implementation**
- **Optimized Algorithms**: Efficient debt consolidation with minimal transaction paths
- **Database Integrity**: Proper foreign key relationships and constraint validation
- **Error Recovery**: Comprehensive error handling with user-friendly messages
- **Real-time Synchronization**: Automatic updates when underlying data changes

### **CategoryForge** - Advanced Category Management System

SettleEase's category system provides sophisticated tools for organizing expenses with visual icons and intelligent ranking.

#### **Comprehensive Icon Integration**
- **1000+ Lucide Icons**: Complete integration with the Lucide React icon library
- **Intelligent Search**: Multi-faceted search by name, tags, and categories
- **Live Preview**: Real-time icon preview with metadata display
- **Icon Metadata**: Rich information including tags, categories, and usage examples
- **Dynamic Loading**: Lazy-loaded icon components for optimal performance

#### **Advanced Category Management**
- **Duplicate Prevention**: Smart validation to prevent category name conflicts
- **In-line Editing**: Seamless edit mode with icon and name modification
- **Usage Validation**: Comprehensive checks before allowing category deletion
- **Dependency Tracking**: Scans all expenses to prevent orphaned references

#### **Sophisticated Ranking System**
- **Drag-and-Drop Ordering**: Intuitive Reddit-style up/down ranking controls
- **Visual Feedback**: Clear indication of ranking changes with disabled states
- **Batch Operations**: Efficient database updates for rank modifications
- **Persistent Ordering**: Maintains custom category order across sessions

#### **Icon Picker Modal**
- **Advanced Search**: Hybrid search across icon names, tags, and categories
- **Grid Layout**: Responsive grid with hover states and focus management
- **Metadata Display**: Rich preview panel with icon details and external links
- **Copy Functionality**: One-click SVG and JSX code copying
- **Accessibility**: Full keyboard navigation and screen reader support

#### **Smart Validation Systems**
- **Expense Dependency Checking**: Prevents deletion of categories in use
- **Real-time Feedback**: Immediate validation with detailed error messages
- **Conflict Resolution**: Clear guidance when operations are blocked
- **Data Integrity**: Maintains referential integrity across all operations

#### **User Experience Features**
- **Progressive Enhancement**: Hover states reveal available actions
- **Loading State Management**: Clear feedback during database operations
- **Responsive Design**: Optimized layouts for desktop and mobile
- **Visual Consistency**: Consistent icon rendering across all components

#### **Technical Architecture**
- **Dynamic Icon Loading**: Lazy-loaded React components with Suspense boundaries
- **Metadata Integration**: Pre-built icon metadata for enhanced search capabilities
- **Build Process Integration**: Automated icon downloading and metadata generation
- **TypeScript Safety**: Fully typed icon components and category structures

### **DebugMaster** - Advanced Development & Testing System

SettleEase's debug system provides comprehensive testing tools and detailed system insights for development and troubleshooting.

#### **Sophisticated Error Boundary Testing**
- **Multi-Level Testing**: Tab-level, section-level, and component-level error boundary validation
- **Crash Test Manager**: Centralized state management for controlled component crashes
- **Real-time Monitoring**: Live subscription system for crash state changes
- **Risk Assessment**: Color-coded risk levels (critical, high, medium, low) for different components

#### **Comprehensive Debug Dashboard**
- **Multi-Tab Interface**: Organized debug information across Overview, Balances, Transactions, Per Person, Expenses, and Raw JSON
- **Real-time Calculations**: Live settlement calculations with efficiency metrics
- **Balance Tracking**: Detailed per-person financial breakdowns with net balance calculations
- **Transaction Analysis**: Both simplified and pairwise transaction views with optimization metrics

#### **Advanced Testing Categories**
- **Tab Level Boundaries**: Large-scale error boundaries protecting entire application sections
- **Section Level Boundaries**: Medium-scale boundaries for major UI sections
- **Modal Section Boundaries**: Specialized boundaries for modal dialog components
- **Input Field Boundaries**: Fine-grained boundaries for individual form components

#### **Intelligent Test Management**
- **Progressive Disclosure**: Hover states and visual feedback for test interactions
- **Navigation Integration**: Direct links to affected tabs for immediate testing
- **State Persistence**: Maintains test states across navigation and sessions
- **Batch Operations**: Reset all tests functionality with comprehensive cleanup

#### **Detailed System Insights**
- **Financial Analytics**: Complete breakdown of payments, shares, and net balances
- **Settlement Optimization**: Efficiency calculations showing transaction reduction percentages
- **Per-Person Analysis**: Individual financial summaries with expense involvement tracking
- **Data Export**: JSON export functionality for external analysis and debugging

#### **Mobile-Optimized Debug Interface**
- **Responsive Design**: Adaptive layouts for mobile and desktop debugging
- **Sheet Integration**: Full-screen debug interface for mobile devices
- **Touch-Friendly Controls**: Optimized interaction patterns for mobile testing
- **Collapsible Sections**: Space-efficient information organization

#### **Developer Experience Features**
- **Visual Test Results**: Clear pass/fail indicators with color-coded feedback
- **Error Simulation**: Realistic error scenarios with proper error boundary recovery
- **Component Isolation**: Individual component testing without affecting others
- **Recovery Testing**: Validation of error boundary recovery mechanisms

#### **Technical Implementation**
- **Crash Test Context**: Global state management with React Context and custom hooks
- **Subscription System**: Event-driven updates for real-time test state synchronization
- **Error Boundary Integration**: Seamless integration with existing error boundary components
- **Performance Monitoring**: Efficient state management with minimal re-renders

---

**SettleEase** - Making group expense management simple, transparent, and efficient through modern web technologies and intelligent design.