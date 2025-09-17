# SettleEase

A comprehensive expense management and settlement application for groups, built with Next.js, TypeScript, and Supabase.

## 🌟 Overview

SettleEase is a modern web application designed to simplify group expense management and settlement calculations. Whether you're managing expenses for roommates, travel groups, or any shared financial arrangements, SettleEase provides an intuitive interface to track expenses, calculate settlements, and manage group finances efficiently.

## ✨ Key Features

### 📊 **Expense Management**
- **Multiple Split Methods**: Equal split, unequal split, and itemwise splitting
- **Dynamic Categories**: Customizable expense categories with Lucide icons
- **Celebration Contributions**: Special handling for celebration expenses
- **Real-time Updates**: Live synchronization across all users

### 🧮 **Smart Settlement Calculations**
- **Simplified Transactions**: Optimized settlement calculations to minimize transactions
- **Pairwise Transactions**: Direct debt tracking between specific people
- **Settlement History**: Complete audit trail of all payments
- **Net Balance Tracking**: Real-time balance calculations for all participants

### 👥 **User Management**
- **Role-based Access Control**: Admin and user roles with different permissions
- **Google OAuth Integration**: Seamless authentication with automatic name parsing
- **User Profiles**: Customizable first and last names
- **Multi-user Support**: Designed for group collaboration

### 📈 **Advanced Analytics** (Feature Flag Controlled)
- **Spending Patterns**: Comprehensive analytics and insights
- **Category Breakdown**: Detailed spending analysis by category
- **Participant Analytics**: Individual spending and sharing patterns
- **Visual Charts**: Interactive charts using Recharts library

### 🔔 **Activity Feed** (Feature Flag Controlled)
- **Real-time Activity**: Live feed of all expense updates and user actions
- **Comprehensive Logging**: Detailed activity tracking with metadata
- **User Attribution**: Clear visibility of who made what changes

### 🎛️ **Feature Management**
- **Feature Flags**: Granular control over feature availability per user
- **Real-time Notifications**: Instant notifications when features are enabled/disabled
- **Admin Controls**: Complete feature rollout management interface

## 🏗️ Architecture

### **Frontend Stack**
- **Next.js 15.3.3**: React framework with App Router
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Radix UI**: Accessible component primitives
- **Lucide React**: Beautiful icon library with 1000+ icons
- **Recharts**: Powerful charting library for analytics

### **Backend & Database**
- **Supabase**: Backend-as-a-Service with PostgreSQL database
- **Row Level Security (RLS)**: Secure data access patterns
- **Real-time Subscriptions**: Live data synchronization
- **Database Triggers**: Automated user profile creation

### **State Management**
- **Custom Hooks**: Modular state management with React hooks
- **Real-time Sync**: Automatic data synchronization across components
- **Error Boundaries**: Comprehensive error handling and recovery

## 🗄️ Database Schema

### **Core Tables**

#### `people`
- Stores group participants
- Simple name-based identification
- Used for expense attribution and settlement calculations

#### `expenses`
- Central expense tracking with JSONB fields for flexibility
- Supports multiple split methods (equal, unequal, itemwise)
- Stores payer information and calculated shares
- Optional celebration contributions

#### `categories`
- Customizable expense categories
- Lucide icon integration
- Ranking system for custom ordering

#### `settlement_payments`
- Tracks actual payments between people
- Audit trail with user attribution
- Timestamped settlement records

#### `user_profiles`
- User role management (admin/user)
- Profile information (first_name, last_name)
- Links to Supabase Auth users

#### `feature_flags`
- Granular feature control per user
- Real-time feature rollout capabilities
- Admin-controlled feature management

#### `feature_notifications`
- User notifications for feature changes
- Read/unread status tracking
- Automatic notification generation

#### `activity_feed`
- Comprehensive activity logging
- JSONB metadata for flexible event data
- User attribution and timestamps

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git

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
   - Set up your Supabase project
   - Run the database migrations (see Database Setup section)
   - Configure Row Level Security policies

5. **Build Lucide Icons**
   ```bash
   npm run prebuild
   ```

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

### **Feature Flags Configuration**
Features can be controlled through the admin interface:
- **Analytics**: Advanced spending analytics and insights
- **Activity Feed**: Real-time activity tracking and notifications

### **Theme Configuration**
The application supports light and dark themes with a custom green-based color palette:
- **Primary**: Forest Green (#388E3C)
- **Secondary**: Light Green variations
- **Accent**: Teal (#008080)
- **Charts**: Coordinated color scheme for data visualization

## 📱 User Interface

### **Responsive Design**
- Mobile-first approach with adaptive layouts
- Touch-friendly interfaces for mobile devices
- Desktop-optimized workflows for complex operations

### **Accessibility**
- WCAG 2.1 compliant components via Radix UI
- Keyboard navigation support
- Screen reader compatibility
- High contrast theme support

### **Component Architecture**
- **Shadcn/ui**: Base component library
- **Custom Components**: Domain-specific components for expense management
- **Error Boundaries**: Graceful error handling with recovery options
- **Loading States**: Comprehensive loading indicators and skeleton screens

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

When the Analytics feature is enabled, users can access:

### **Overall Statistics**
- Total expenses and average amounts
- Participant counts and date ranges
- Most expensive categories and largest expenses

### **Visual Analytics**
- Monthly spending trends
- Category spending breakdowns
- Individual vs. shared expense analysis
- Spending patterns by day of week

### **Participant Insights**
- Individual spending patterns
- Net balance calculations
- Most frequent categories per person
- Payment vs. consumption analysis

## 🔄 Real-time Features

### **Live Data Synchronization**
- Automatic updates when expenses are added/modified
- Real-time settlement calculations
- Live activity feed updates

### **Notifications**
- Feature enablement/disablement notifications
- Settlement completion confirmations
- Error and success feedback

## 🛠️ Customization

### **Categories**
- Add custom expense categories
- Choose from 1000+ Lucide icons
- Custom ranking and organization

### **Settlement Methods**
- Simplified transactions (optimized)
- Pairwise transactions (detailed)
- Historical settlement tracking

### **User Experience**
- Customizable user profiles
- Theme preferences (light/dark)
- Mobile-responsive interfaces

## 📈 Scalability

### **Database Design**
- Efficient JSONB usage for flexible data structures
- Indexed queries for performance
- Scalable real-time subscriptions

### **Frontend Performance**
- Component-level code splitting
- Optimized re-renders with React hooks
- Efficient state management patterns

### **Feature Management**
- Gradual feature rollouts
- A/B testing capabilities via feature flags
- User-specific feature enablement

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Test thoroughly including mobile responsiveness
5. Submit a pull request

### **Code Standards**
- TypeScript strict mode compliance
- Consistent component patterns
- Comprehensive error handling
- Mobile-first responsive design

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please:
1. Check the comprehensive debug interface in the application
2. Review the database schema and RLS policies
3. Examine the real-time subscription logs
4. Contact the development team with detailed error information

---

**SettleEase** - Making group expense management simple, transparent, and efficient.