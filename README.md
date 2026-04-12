# SettleEase

A modern expense management and settlement application for groups. Built with Next.js, TypeScript, Convex, and Supabase Auth.

**Version:** 7.7.1

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
- Next.js 16.2.2 (App Router)
- TypeScript 5
- Tailwind CSS 3.4.1
- Radix UI (accessible components)
- Lucide React 0.523.0 (icons)
- Recharts 2.15.1 (charts)

**Backend**
- Convex (database + live queries/realtime)
- Supabase Auth (email/password and Google OAuth only)
- Google Gemini AI (expense summaries)

---

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project for Auth
- Convex project for app data and realtime
- Google Gemini API key (optional, for AI summaries)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd settleease
npm install

# Set up environment variables
cp .env.example .env.local
# Add Supabase Auth and Convex credentials to .env.local

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
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_convex_deployment
CONVEX_JWT_PRIVATE_KEY=your_convex_jwt_private_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## Convex Schema

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

**settlementPayments**
- Tracks payments between people
- Fields: `id`, `debtor_id`, `creditor_id`, `amount_settled`, `marked_by_user_id`, `notes`, `settled_at`

**manualSettlementOverrides**
- Stores manual settlement path preferences
- Fields: `id`, `debtor_id`, `creditor_id`, `amount`, `notes`, `created_by_user_id`, `is_active`, `created_at`, `updated_at`
- Allows overriding optimized settlement calculations with preferred payment paths

**userProfiles**
- User information and roles
- Fields: `id`, `user_id`, `email`, `role`, `first_name`, `last_name`, `theme_preference`, `font_preference`, `last_active_view`, `has_seen_welcome_toast`, `should_show_welcome_toast`, `last_sign_in_at`, `created_at`, `updated_at`
- Roles: `admin` (full access) or `user` (read-only)

**aiPrompts**
- Stores editable AI prompt versions
- Fields: `id`, `name`, `prompt_text`, `is_active`, `version`, `description`, `created_by_user_id`, `created_at`, `updated_at`

**aiSummaries**
- Cached AI-generated summaries
- Fields: `id`, `user_id`, `data_hash`, `summary`, `model_name`, `created_at`, `updated_at`
- Global cache by `data_hash` to minimize API calls

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
- Convex-backed validation and live updates
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
- Manual settlement path overrides (admin only)
- Manual payment recording
- Complete audit trail
- Convex live balance updates
- Prominent alerts in Dashboard for active manual overrides

### AI Summaries

- Powered by Google Gemini
- Structured settlement summaries with deterministic analytics cards
- Shared Gemini model configuration for summaries and Smart Scan
- Global Convex caching by data hash
- Copy-ready Markdown export from structured summary data

---

## Development

### Scripts

```bash
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run typecheck    # TypeScript checking
npm run prebuild     # Download Lucide icons
npm run sync-version # Sync version from package.json to README
```

### Version Management

The version number is automatically synced across the application:

- **package.json** - Source of truth for version
- **README.md** - Auto-synced using `sync-version` script
- **AuthForm & AppSidebar** - Import version directly from package.json

**Updating the version:**

```bash
npm version patch  # 5.3.2 → 5.3.3
npm version minor  # 5.3.2 → 5.4.0
npm version major  # 5.3.2 → 6.0.0
```

This automatically updates package.json, syncs README.md, and creates a git commit with version tag.

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
- `useConvexData` - Live Convex queries for app data
- `useUserProfile` - Convex profile management
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

Assign roles in the Convex `userProfiles` table after the user's first login. New profiles default to `user`; promote trusted users by setting `role` to `admin` for their `supabaseUserId`.

### Supabase Auth Setup

1. Create Supabase project
2. Configure email/password auth
3. Configure Google OAuth in Auth settings
4. Add the public Supabase URL and anon key to your environment

### Convex Setup

1. Create Convex project
2. Add `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT`
3. Run `npx convex codegen`
4. Use the Convex dashboard to inspect data and promote admins

### Vercel + Convex Production Deploys

Vercel does not seed Convex data during a build. Production data starts empty unless users enter data, an admin inserts data in the Convex dashboard, or a seed function is run intentionally.

This repo includes `vercel.json`, which sets the Vercel Build Command to:

```bash
npm run build:vercel
```

`npm run build:vercel` deploys Convex only when `VERCEL_ENV=production`, then runs the Next build against the deployed Convex URL. Preview and Development builds skip Convex deployment and only run `npm run build`, so they do not need a deploy key and cannot push schema/function changes to production.

Add `CONVEX_DEPLOY_KEY` only to the Vercel Production environment so production builds can deploy to the production Convex deployment non-interactively.

Set `CONVEX_JWT_PRIVATE_KEY` in Vercel for the Supabase-to-Convex auth bridge. Supabase still owns login/session/email/OAuth; this key signs short-lived Convex-compatible JWTs only after `/api/convex-token` verifies the Supabase session with Supabase Auth.

---

## Troubleshooting

**Icons not loading**
```bash
npm run prebuild
```

**Real-time not working**
- Check Convex connection and deployment URL
- Verify the app is wrapped in `ConvexClientProvider`
- Confirm live queries are returning in the Convex dashboard

**OAuth issues**
- Verify OAuth config in Supabase
- Check redirect URLs
- Ensure production URL is set

**Permission errors**
- Check user role in Convex `userProfiles`
- Confirm user is authenticated

---

## License

MIT License - see LICENSE file for details.

---

## Credits

Built with Next.js, Convex, Supabase Auth, Radix UI, Lucide, Recharts, and Google Gemini.
