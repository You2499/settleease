# SettleEase

[![Netlify Status](https://api.netlify.com/api/v1/badges/0e6052f6-4cbd-4802-9641-1ab2b4109c50/deploy-status)](https://app.netlify.com/projects/settleease/deploys)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-blue?logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3FCF8E?logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.1-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)

---

## 🚀 SettleEase

**SettleEase** is a modern, full-featured group expense management application. Effortlessly track, split, and settle shared expenses with friends, family, or roommates. Enjoy real-time collaboration, rich analytics, customizable categories, and a beautiful, responsive UI.

---

## ✨ Features

- **Authentication**: Secure login/sign-up with email/password and Google OAuth (Supabase Auth).
- **Expense Management**:
  - Add, edit, and delete expenses.
  - Multiple split methods: equally, unequally, or item-wise.
  - Multiple payers per expense.
  - "Celebration" mode for special contributions (e.g., someone treats part of the bill).
- **People Management**: Add, edit, and remove participants. Prevents deletion if involved in transactions.
- **Category Management**: Create, edit, delete, and reorder categories. Pick from hundreds of Lucide icons.
- **Settlements**: Calculate who owes whom, mark debts as paid/unpaid, and minimize the number of transactions.
- **Analytics**: Group and personal stats, category breakdowns, spending trends, and more—visualized with charts and tables.
- **Dashboard**: Overview of balances, debts, and recent expenses.
- **Real-Time Sync**: All data updates live for all users (Supabase Realtime).
- **Role-Based Access**: Admin/user roles for access control.
- **Modern UI/UX**: Responsive, accessible, and themeable (light/dark/system).
- **Icon Picker**: Choose from hundreds of Lucide icons for categories.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/) primitives, [Lucide Icons](https://lucide.dev/)
- **Backend/Database**: [Supabase](https://supabase.com/) (Database, Auth, Realtime)
- **Charts**: [Recharts](https://recharts.org/)
- **Deployment**: [Netlify](https://www.netlify.com/)

---

## 📦 Getting Started

### 1. **Clone the Repository**

```bash
git clone https://github.com/your-username/settleease.git
cd settleease
```

### 2. **Install Dependencies**

```bash
npm install
```

### 3. **Configure Environment Variables**

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. **Run the Development Server**

```bash
npm run dev
```

Visit [http://localhost:9002](http://localhost:9002) to view the app.

---

## 🧑‍💻 Usage

- **Sign up or log in** (email/password or Google).
- **Add people** to your group.
- **Create categories** with custom icons.
- **Add expenses**—choose split method, payers, and category.
- **View analytics** for group or individual spending.
- **Settle up**: see who owes whom, and mark payments as complete.
- **Enjoy real-time updates**—all changes sync instantly for all users.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🌐 Links

- [Live App on Netlify](https://settleease.netlify.app/)
- [Supabase](https://supabase.com/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 🙏 Acknowledgements

- [Supabase](https://supabase.com/) for the backend platform
- [Next.js](https://nextjs.org/) for the React framework
- [Radix UI](https://www.radix-ui.com/) and [Lucide Icons](https://lucide.dev/) for beautiful UI components
- [Recharts](https://recharts.org/) for data visualization
