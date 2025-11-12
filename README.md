# SettleEase

A modern expense management and settlement application for groups. Built with Next.js 15, TypeScript, and Supabase.

**Version:** 3.0.0

---

## Overview

SettleEase helps groups track shared expenses, calculate settlements, and manage finances efficiently. It supports multiple split methods, provides AI-powered insights, and offers comprehensive analytics.

### Key Features

- **AI-Powered Summaries** - Get intelligent expense insights using Google Gemini
- **Flexible Splitting** - Equal, unequal, or item-by-item expense splits
- **Advanced Analytics** - 20+ interactive charts and visualizations
- **Smart Settlements** - Optimized payment calculations to minimize transactions
- **Real-time Sync** - Live updates across all users
- **Customizable Categories** - 1000+ icons with drag-and-drop ranking

---

## Tech Stack

**Frontend**
- Next.js 15.3.3 (App Router)
- TypeScript 5
- Tailwind CSS 3.4.1
- Radix UI (accessible components)
- Lucide React 0.523.0 (icons)
- Recharts 2.15.1 (charts)

**Backend**
- Supabase (PostgreSQL + Auth + Realtime)
- Google Gemini AI (expense summaries)
- Row Level Security (RLS) policies

---

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Google Gemini API key (optional, for AI summaries)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd settleease
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Download Lucide icons (required)
npm run prebuild

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## Database Schema

### Tables

**people**
- Stores group participants
- Fields: `id`, `name`, `created_at`

**expenses**
- Central expense tracking with JSONB for flexibility
- Fields: `id`, `description`, `total_amount`, `category`, `paid_by`, `split_method`, `shares`, `items`, `celebration_contribution`, `created_at`, `updated_at`
- Split methods: equal, unequal, itemwise

**categories**
- Customizable expense categories
- Fields: `id`, `name`, `icon_name`, `rank`, `created_at`

**settlement_payments**
- Tracks payments between people
- Fields: `id`, `debtor_id`, `creditor_id`, `amount_settled`, `marked_by_user_id`, `notes`, `settled_at`

**user_profiles**
- User information and roles
- Fields: `id`, `user_id`, `role`, `first_name`, `last_name`, `theme_preference`, `created_at`, `updated_at`
- Roles: `admin` (full access) or `user` (read-only)

**ai_summaries**
- Cached AI-generated summaries
- Fields: `id`, `user_id`, `data_hash`, `summary`, `model_name`, `created_at`, `updated_at`
- Global cache by `data_hash` to minimize API calls

All tables have Row Level Security (RLS) enabled.

---

## Features

### Authentication

- Email/password signup and login
- Google OAuth integration
- Automatic profile creation
- Role-based access control (admin/user)

### Expense Management

**Split Methods:**
1. **Equal** - Divide evenly among participants
2. **Unequal** - Custom amounts per person
3. **Itemwise** - Per-item categories and participant selection

**Additional Features:**
- Multiple payers per expense
- Celebration contributions (treats that don't affect regular splits)
- Real-time validation
- Comprehensive expense details modal

### Analytics

**Group Analytics:**
- Monthly/weekly spending trends
- Category breakdown
- Participant summaries
- Transaction heatmap calendar
- Expense distribution and velocity

**Personal Analytics:**
- Individual spending patterns
- Share vs. paid comparison
- Personal category preferences
- Balance tracking over time

### Settlement System

- Automated settlement calculations
- Transaction minimization algorithm
- Manual payment recording
- Complete audit trail
- Real-time balance updates

### AI Summaries

- Powered by Google Gemini
- Streaming responses with real-time updates
- Global caching by data hash
- Markdown formatting with rich text

---

## Development

### Scripts

```bash
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run typecheck  # TypeScript checking
npm run prebuild   # Download Lucide icons
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── settleease/        # Feature components
│   │   ├── dashboard/     # Dashboard views
│   │   ├── analytics/     # Analytics charts
│   │   └── addexpense/    # Expense forms
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
└── lib/                   # Utilities
```

### Custom Hooks

- `useSupabaseAuth` - Authentication state
- `useSupabaseData` - Data fetching and caching
- `useSupabaseRealtime` - Real-time subscriptions
- `useUserProfile` - User profile management
- `useThemeSync` - Theme synchronization

---

## Deployment

### Vercel (Recommended)

1. Connect repository to Vercel
2. Add environment variables
3. Deploy

### Manual

```bash
npm run build
npm start
```

Ensure all environment variables are set in your hosting platform.

---

## Configuration

### User Roles

Assign roles in the `user_profiles` table:

```sql
-- Promote user to admin
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id = 'user-uuid';
```

### Supabase Setup

1. Create Supabase project
2. Apply database migrations
3. Configure Google OAuth in Auth settings
4. Enable Realtime for all tables

---

## Troubleshooting

**Icons not loading**
```bash
npm run prebuild
```

**Real-time not working**
- Check Supabase connection in console
- Verify RLS policies
- Ensure Realtime is enabled

**OAuth issues**
- Verify OAuth config in Supabase
- Check redirect URLs
- Ensure production URL is set

**Permission errors**
- Check user role in `user_profiles`
- Verify RLS policies
- Confirm user is authenticated

---

## License

MIT License - see LICENSE file for details.

---

## Credits

Built with Next.js, Supabase, Radix UI, Lucide, Recharts, and Google Gemini.
