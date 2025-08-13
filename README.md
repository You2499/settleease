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
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
