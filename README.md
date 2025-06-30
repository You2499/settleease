# SettleEase

SettleEase is a comprehensive, self-hostable expense management and settlement application designed to simplify group finances. It provides a detailed and user-friendly interface for tracking shared expenses, calculating settlements, and visualizing financial data. Built with Next.js and Supabase, SettleEase offers real-time data synchronization and a robust set of features for transparent and efficient financial management among groups.

## Features

- **Real-Time Expense Tracking**: Expenses are updated in real-time for all users, ensuring everyone has the most current information.
- **Flexible Expense Splitting**:
    - **Equal Split**: Divide expenses equally among all participants.
    - **Unequal Split**: Manually enter different amounts for each person.
    - **Itemized Split**: Assign specific items to individuals from a single bill.
- **Centralized Dashboard**: Get an at-a-glance overview of who owes whom, recent expenses, and overall group balances.
- **Detailed Analytics**: Visualize your group's spending habits with a variety of charts and tables:
    - Monthly Spending Trends
    - Spending by Category (Pie Chart)
    - Expense Distribution Analysis
    - Share vs. Paid Comparisons
    - Spending by Day of the Week
    - Top Expenses
- **User & Category Management**: Easily add, remove, or edit people and expense categories.
- **Settlement Tracking**: Log payments between users to settle debts and keep balances accurate.
- **Authentication**: Secure user authentication is handled by Supabase Auth.

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) 15
- **Backend & Database**: [Supabase](https://supabase.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Forms**: [React Hook Form](https://react-hook-form.com/)
- **AI (Optional)**: [Google Genkit](https://firebase.google.com/docs/genkit) for potential future AI-powered features.

## Architecture

SettleEase is a single-page application (SPA) built with Next.js. The entire user interface is rendered from a single page (`src/app/page.tsx`), and client-side state management (using React Hooks) controls which view is displayed. Data is fetched from a Supabase PostgreSQL database, and Supabase's real-time capabilities are used to keep all connected clients synchronized.

## Project Structure

Here is a high-level overview of the most important files and directories:

```
.
├── src/
│   ├── app/
│   │   ├── page.tsx        # Main application component, handles state and logic
│   │   └── layout.tsx      # Root layout for the application
│   ├── components/
│   |   ├── settleease/     # Core application components (Tabs, Modals, Views)
│   |   └── ui/             # Reusable UI components from Shadcn/UI
│   ├── lib/
│   │   ├── settleease/     # Supabase client, types, and utility functions
│   │   └── utils.ts        # General utility functions
│   └── hooks/
│       ├── use-toast.ts    # Custom hook for displaying toast notifications
│       └── use-mobile.tsx  # Custom hook to detect mobile devices
├── supabase/               # (You will create this for migrations)
├── public/                 # Static assets
└── package.json            # Project dependencies and scripts
```

## Getting Started: Replicating SettleEase

Follow these instructions to set up your own instance of SettleEase.

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)
- A [Supabase](https://supabase.com/) account (free tier is sufficient)

### 1. Set Up Your Supabase Project

1.  **Create a new Supabase project**:
    - Go to the [Supabase Dashboard](https://app.supabase.io/).
    - Click "New project" and give it a name (e.g., "SettleEase").
    - Save your **Project URL** and **`anon` key**. You will need these later.

2.  **Set up the database schema**:
    - In your Supabase project, go to the "SQL Editor".
    - Click "New query".
    - You will need to create the necessary tables. Since the schema is not provided in the repository, here is a basic schema based on the application's code. Execute these SQL commands one by one:

    ```sql
    -- Create People Table
    CREATE TABLE public.people (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create Categories Table
    CREATE TABLE public.categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        icon TEXT,
        rank INT,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create Expenses Table
    CREATE TABLE public.expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        category_id UUID REFERENCES public.categories(id),
        paid_by UUID REFERENCES public.people(id),
        split_method TEXT NOT NULL, -- 'equal', 'unequal', 'itemwise'
        shares JSONB, -- For unequal and itemwise splits
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create Settlement Payments Table
    CREATE TABLE public.settlement_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_person_id UUID REFERENCES public.people(id),
        to_person_id UUID REFERENCES public.people(id),
        amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Create User Profiles Table (for roles)
    CREATE TABLE public.user_profiles (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id),
      role TEXT DEFAULT 'user'
    );
    
    -- Function to create a user profile on new user signup
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.user_profiles (user_id, role)
      VALUES (new.id, 'user');
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Trigger to call the function on new user signup
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

    ```

3.  **Enable Row Level Security (RLS)**:
    - For simplicity in a self-hosted setup, you can leave RLS disabled. For a production environment with multiple users who shouldn't see each other's data, you would need to define RLS policies. The provided schema assumes a single group of users with access to all data.

### 2. Set Up the Application Locally

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd settleease
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Create an environment file**:
    - Create a new file named `.env.local` in the root of the project.
    - Add your Supabase credentials to this file:

    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

    - Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with the values from your Supabase project.

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

    The application should now be running at [http://localhost:9002](http://localhost:9002).

### 3. Hosting Your SettleEase Instance

You can host your SettleEase application on any platform that supports Next.js, such as [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).

#### Deploying with Vercel (Recommended)

1.  **Push your code to a Git repository** (e.g., GitHub, GitLab).
2.  **Import your project into Vercel**:
    - Go to your [Vercel Dashboard](https://vercel.com/dashboard).
    - Click "Add New..." -> "Project".
    - Import your Git repository.
3.  **Configure Environment Variables**:
    - In the Vercel project settings, go to "Environment Variables".
    - Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the values from your Supabase project.
4.  **Deploy**:
    - Vercel will automatically detect that it's a Next.js project and build and deploy it.

Once deployed, you will have your own live instance of SettleEase.
