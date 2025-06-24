# SettleEase 💸

<p align="center">
  <strong>Effortlessly manage shared expenses and settle up with ease.</strong>
</p>

<br/>

SettleEase is a modern, full-stack application designed to simplify expense tracking and settlements within a group. Built with a powerful tech stack, it offers real-time updates and a user-friendly interface to make splitting bills and managing finances a seamless experience.

## ✨ Features

### Core Functionality
-   **📝 Expense Management:** Add, edit, and view expenses with detailed information.
-   **🗂️ Expense Categorization:** Organize expenses into customizable categories for better tracking.
-   **➗ Advanced Splitting Options:**
    -   **Equal:** Split the bill equally among all participants.
    -   **Unequal:** Manually assign different amounts to each person.
    -   **Item-wise:** Split the cost by individual items on a bill.
-   **🤝 Settlement Management:** Automatically calculate who owes whom and track payments to settle debts.
-   **👥 People Management:** Easily add and manage the people involved in your expense group.
-   **🔐 User Authentication:** Secure sign-up and login with email/password and Google Sign-In.

### 📊 Analytics & Insights
A powerful analytics dashboard provides a clear overview of spending habits:
-   **📈 Visual Dashboards:** Interactive charts for spending by category, monthly trends, and daily spending habits.
-   **🧑‍🤝‍🧑 Participant Summaries:** See who has paid the most and who has the largest share of expenses.
-   **🔝 Top Expenses:** Quickly identify the most significant expenses.
-   **⚖️ Paid vs. Share Comparison:** A clear breakdown of how much each person has paid versus their actual share.

### 🤖 AI Integration
-   The application is configured with **Google's Gemini AI model** via Genkit. This sets the foundation for future AI-powered features like intelligent expense categorization or receipt parsing.

## 🛠️ Tech Stack

-   **Frontend:** [Next.js](https://nextjs.org/), [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
-   **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Auth)
-   **AI:** [Firebase Genkit](https://firebase.google.com/docs/genkit), [Google Gemini](https://ai.google.dev/)
-   **Deployment:** Ready for deployment on platforms like Vercel or Firebase App Hosting.

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Supabase](https://supabase.com/) account

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd settleease
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up your Supabase backend:**
    *   Go to the [Supabase Dashboard](https://app.supabase.com) and create a new project.
    *   Navigate to the **SQL Editor** and run the SQL scripts provided during the backend setup to create the necessary tables and functions.
    *   Go to **Project Settings > API** to find your Project URL and `anon` public key.

4.  **Configure environment variables:**
    *   Create a new file named `.env.local` in the root of your project.
    *   Add your Supabase credentials to the `.env.local` file:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
        NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
    *   **Important:** The project currently has these keys hardcoded in `src/lib/settleease/constants.ts`. You should remove them from that file and rely on the environment variables for better security.

5.  **Configure Authentication Providers in Supabase:**
    *   In your Supabase project dashboard, go to the **Authentication** section.
    *   Under **Providers**, enable **Email** and **Google**.
    *   For Google, you will need to obtain a **Client ID** and **Client Secret** from the [Google API Console](https://console.developers.google.com/) and add them to the Supabase settings.

6.  **Run the development server:**
    ```sh
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
