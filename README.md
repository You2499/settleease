# SettleEase

SettleEase is a full-stack web application for managing shared expenses, receipt scans, settlement plans, analytics, health estimates, and exportable reports for a group.

The app is built as a web-first Next.js application with Convex as the realtime database/backend, Supabase as the production identity provider, and Google Gemini for AI-assisted receipt parsing, summaries, health estimates, budget classification, and report redaction.

SettleEase is open source under the MIT License.

## Contents

- [Feature Map](#feature-map)
- [System Architecture](#system-architecture)
- [Authentication And Authorization](#authentication-and-authorization)
- [Environment Separation](#environment-separation)
- [Data Model](#data-model)
- [Expense And Settlement Logic](#expense-and-settlement-logic)
- [AI Features](#ai-features)
- [Admin Console And Safety Controls](#admin-console-and-safety-controls)
- [Local Development](#local-development)
- [Production Setup](#production-setup)
- [Scripts And Quality Gates](#scripts-and-quality-gates)
- [Project Structure](#project-structure)
- [Operational Runbooks](#operational-runbooks)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Feature Map

| Area | Route/View | What It Does |
| --- | --- | --- |
| Auth landing | unauthenticated app | Production sign-in/sign-up page with Supabase email/password, Google OAuth, confirmation resend handling, provider detection, and account-status guidance. |
| Dashboard | `?view=dashboard` | Main settlement surface with simplified payments, pairwise debt tracing, manual override warnings, settlement actions, budget simulation entry point, AI summary, and transaction log. |
| Add Expense | `?view=addExpense` | Admin expense form with equal, unequal, itemwise, multi-payer, quantity-based, and celebration-contribution splits. |
| Smart Scan | `?view=scanReceipt` | AI receipt parser that turns receipt images into editable expense drafts. |
| Edit Expenses | `?view=editExpenses` | Admin editing, deletion, and settlement-exclusion controls for saved expenses. |
| Settlements | `?view=manageSettlements` | Admin payment ledger, manual settlement overrides, outstanding payments, and settlement history. |
| People | `?view=managePeople` | Admin participant CRUD. |
| Categories | `?view=manageCategories` | Admin category CRUD, Lucide icon selection, and ordering. |
| Analytics | `?view=analytics` | Spending, participation, balance, trend, activity, category, and data-quality analytics. |
| Health | `?view=health` | AI-assisted nutrition and alcohol estimates for food/alcohol expenses. |
| Export | `?view=exportExpense` | Printable/downloadable group and personal reports with optional AI label redaction. |
| Settings | `?view=settings` | Admin console for environment status, preferences, AI config, maintenance, and danger-zone operations. |
| Shortcuts | global | Cmd/Ctrl shortcuts for navigation, actions, focus targets, shortcut hints, and shortcuts modal. |

### Primary Workflows

1. Add people and categories.
2. Add expenses manually or create drafts from Smart Scan.
3. Review the Dashboard to see balances, simplified payments, pairwise debts, and transaction history.
4. Record settlement payments or create manual settlement overrides when the default optimizer is not the desired plan.
5. Use Analytics and Health to understand spending patterns and food/alcohol estimates.
6. Export group or personal reports when the group needs a record.
7. Use Settings for admin-only maintenance, AI configuration, environment verification, and destructive operations.

## System Architecture

```mermaid
flowchart LR
  Browser["Browser / Next.js UI"] --> Supabase["Supabase Auth"]
  Browser --> ConvexReact["Convex React Client"]
  Browser --> NextApi["Next.js API Routes"]

  Supabase --> TokenRoute["/api/convex-token"]
  TokenRoute --> ConvexJwt["Short-lived Convex JWT"]
  ConvexJwt --> ConvexAuth["Convex customJwt auth"]
  ConvexReact --> Convex["Convex Queries, Mutations, Actions"]

  Convex --> Tables["Convex Tables"]
  Convex --> Gemini["Google Gemini"]
  NextApi --> Gemini
  NextApi --> ConvexHttp["Convex HTTP Client"]
```

SettleEase has three main runtime layers:

- `src/app` contains the Next.js App Router shell, auth bridge API routes, and AI API routes.
- `src/components/settleease`, `src/hooks`, and `src/lib/settleease` contain the web UI, client hooks, domain models, settlement math, analytics, health surface models, shortcut registry, and shared utilities.
- `convex` contains the schema, queries, mutations, actions, auth guards, environment guards, AI caches, and admin/danger operations.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Web framework | Next.js 16 App Router |
| UI runtime | React 19, TypeScript 6 |
| Styling | Tailwind CSS, Radix/shadcn primitives, `next-themes`, Inter default typography |
| Icons | Lucide React plus generated Lucide metadata for icon picking |
| Data/backend | Convex schema, queries, mutations, actions, auth config |
| Identity | Supabase email/password and Google OAuth |
| Auth bridge | RS256 JWT minted by Next.js and verified by Convex custom JWT auth |
| AI | Google Gemini via `@google/generative-ai` |
| Charts | Visx primitives plus SettleEase analytics models |
| Deployment | Vercel web app plus Convex deploy flow |

## Authentication And Authorization

SettleEase uses Supabase Auth for production identity and Convex for application authorization.

### Production Auth Flow

```mermaid
sequenceDiagram
  participant User
  participant Browser
  participant Supabase
  participant TokenAPI as Next API /api/convex-token
  participant Convex

  User->>Browser: Sign in with email/password or Google
  Browser->>Supabase: Create or retrieve Supabase session
  Browser->>TokenAPI: Send Supabase access token
  TokenAPI->>Supabase: Validate token with getUser()
  TokenAPI->>TokenAPI: Mint short-lived RS256 JWT
  Browser->>Convex: Connect with Convex JWT
  Convex->>Convex: Verify JWKS / customJwt config
  Convex->>Convex: Enforce profile, role, and environment guards
```

Key files:

- `src/components/ConvexClientProvider.tsx` chooses plain Convex in local development and `ConvexProviderWithAuth` elsewhere.
- `src/hooks/useSupabaseAuth.ts` owns Supabase session state and local development bypass behavior.
- `src/app/api/convex-token/route.ts` validates Supabase tokens and mints Convex JWTs.
- `src/app/api/convex-token/jwks/route.ts` exposes the public JWKS used by Convex.
- `convex/auth.config.ts` and `convex/jwtConfig.ts` configure Convex custom JWT auth.
- `convex/authGuards.ts` enforces authenticated/self/admin behavior server-side.

### Auth Page Behavior

The official auth page is `src/components/settleease/AuthForm.tsx`; the behavior lives in `src/hooks/useAuthFormLogic.ts`.

It supports:

- email/password sign in
- email/password sign up with first and last name
- Google OAuth
- password visibility toggle
- loading states and Google redirect loading recovery
- resend confirmation for unconfirmed email accounts
- account-status checks before sign-up
- Google-account detection for password attempts
- toast messages and inline suggestions for known failure cases
- Convex `userProfiles` upsert/mark-sign-in after successful Supabase auth

The Supabase RPC `check_email_status` is expected to accept:

```text
email_to_check text
```

and return a row/object with:

```text
status: "new" | "confirmed" | "unconfirmed" | "pending" | "unknown"
is_google_account: boolean
```

That RPC is used to preserve the user-facing edge cases such as:

- detected Google account: ask the user to continue with Google
- existing confirmed email: ask the user to sign in instead
- unconfirmed email with matching password: show resend confirmation
- unconfirmed email with non-matching password: do not leak more than necessary
- unknown status lookup: block the flow and ask the user to retry

### Profiles And Roles

Convex `userProfiles` maps Supabase user ids into SettleEase roles and preferences.

Profile fields include:

- Supabase user id and email
- `admin` or `user` role
- first and last name
- font and theme preferences
- last active view
- welcome-toast flags
- sign-in timestamps

Admin-only views and mutations are guarded in both the UI and Convex. The client hides or blocks admin-only destinations for non-admin users, while Convex still performs the final authorization check.

## Environment Separation

SettleEase intentionally separates local development and production so a local session cannot accidentally mutate production, and production cannot target the development database.

| Environment | Convex URL | Auth Mode |
| --- | --- | --- |
| Development | `https://shocking-panda-595.convex.cloud` | Synthetic local admin when Convex has `SETTLEEASE_DISABLE_AUTH=true` |
| Production | `https://fortunate-fox-427.convex.cloud` | Supabase Auth bridged into Convex JWT |

Client-side environment:

```text
NEXT_PUBLIC_SETTLEEASE_ENV=development | production
NEXT_PUBLIC_CONVEX_URL=https://...
```

Convex server environment:

```text
SETTLEEASE_ENV=development | production
SETTLEEASE_DISABLE_AUTH=true            # development only
SETTLEEASE_ALLOW_PRODUCTION_DANGER_ACTIONS=true  # optional production-only unlock flag
```

Local development uses this synthetic admin identity:

```text
supabaseUserId: settleease-development-admin
email: development@settleease.local
name: Development Admin
role: admin
```

The Settings page compares:

- client environment
- Convex URL host
- Convex server environment
- auth mode
- destructive-action policy

If those values do not match the expected deployment, Settings becomes read-only and all mutations are disabled.

## Data Model

Convex is the source of truth for application data.

| Table | Purpose |
| --- | --- |
| `userProfiles` | Supabase mapping, role, name, theme/font preference, last active view, welcome state, sign-in metadata. |
| `people` | Group participants. |
| `categories` | Expense categories with Lucide icon names and ordering. |
| `expenses` | Expense records, paid-by rows, shares, itemwise data, celebration contributions, settlement exclusion, timestamps. |
| `budgetItems` | Budget catalog entries from historical and custom observations. |
| `settlementPayments` | Recorded payments from one person to another. |
| `manualSettlementOverrides` | Admin-defined settlement paths that override simplified settlement recommendations while active. |
| `aiPrompts` | Prompt templates for AI features. |
| `aiConfigs` | Active Gemini model and fallback model order. |
| `aiSummaries` | Cached AI summaries and health ledger chunks. |
| `aiRedactions` | Cached report label redactions. |
| `reportGenerationEvents` | Analytics for report preview, print, download, redaction, cache hit, and fallback events. |

Important Convex exports include:

| Area | Functions |
| --- | --- |
| Health/check | `health` |
| Admin settings | `getAdminSettingsSnapshot`, `updateAiConfig`, danger and maintenance mutations |
| Profiles | `getUserProfile`, `upsertUserProfile`, `markSignIn`, `updateUserProfile` |
| People | `listPeople`, `addPerson`, `updatePerson`, `removePerson`, `ensureDefaultPeople` |
| Categories | `listCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `seedDefaultCategories` |
| Expenses | `listExpenses`, `saveExpense`, `updateExpenseExcludeFromSettlement`, `deleteExpense` |
| Budget catalog | `listBudgetItems`, `upsertCustomBudgetItem`, `backfillBudgetItemsFromExpenses` |
| Settlements | `listSettlementPayments`, payment CRUD, manual override CRUD, clear active overrides |
| AI config/cache | `getActiveAiPrompt`, `getActiveAiConfig`, summary/redaction get/store functions |
| Reports | `trackReportGenerationEvent`, `getReportGenerationAnalytics`, `clearReportGenerationEvents` |
| Danger zone | `clearAiCaches`, `clearSettlementRecords`, `resetSettleEaseData` |

## Expense And Settlement Logic

The settlement engine lives mainly in `src/lib/settleease/settlementCalculations.ts` and `src/lib/settleease/itemwiseCalculations.ts`.

### Expense Split Methods

SettleEase supports:

- equal split: everyone selected owes the same share
- unequal split: admins enter explicit share amounts per participant
- itemwise split: receipt/bill items are assigned to participants
- quantity-based itemwise split: individual units of an item can be assigned to different people
- multi-payer expenses: multiple people can pay different portions of the total
- celebration contribution: special extra contributions per participant
- excluded expenses: records can remain in history while being excluded from settlement math

### Net Balance Calculation

`calculateNetBalances` processes:

1. Expense payments as credits to payers.
2. Expense shares as debits to participants.
3. Celebration contributions as additional debits.
4. Settlement payments as completed transfers that reduce outstanding balances.
5. Exclusions for expenses marked `exclude_from_settlement`.

Positive balances mean a person should receive money. Negative balances mean a person owes money.

### Simplified Transactions

`calculateSimplifiedTransactions` turns net balances into a smaller set of recommended payments:

- debtors are matched against creditors
- payments are rounded to cents
- tiny residuals below the threshold are ignored
- active manual settlement overrides take precedence over the automatic optimizer

This is the main recommendation shown on the Dashboard.

### Pairwise Debt Tracing

`calculatePairwiseTransactions` traces who owes whom at the expense level. It powers the "why does this person owe this?" experience by keeping links back to contributing expense ids.

Pairwise tracing is intentionally separate from the simplified optimizer:

- pairwise view explains the source of debts
- simplified view minimizes the number of payments

### Manual Overrides And Settlement Payments

Admins can create manual settlement overrides when the group wants a custom payment path. Active overrides replace the automatic simplified settlement recommendations until cleared/deactivated.

Settlement payments are recorded separately from expenses. They reduce outstanding balances without deleting the original expense history.

## AI Features

SettleEase uses Gemini in both Next.js API routes and Convex actions.

```mermaid
flowchart TB
  ExpenseData["Expenses, People, Categories"] --> Payloads["Stable Payload Builders"]
  Payloads --> Hashes["Stable Hash Keys"]
  Hashes --> Cache["Convex AI Cache Tables"]
  Cache -->|hit| UI["UI Result"]
  Cache -->|miss| Gemini["Gemini Model + Fallbacks"]
  Gemini --> Normalize["Schema Validation / Normalization"]
  Normalize --> Cache
  Normalize --> UI
```

### Smart Scan

`src/app/api/scan-receipt/route.ts` accepts receipt images and asks Gemini to extract structured receipt data:

- merchant/restaurant name
- date
- line items
- quantities
- unit prices
- subtotal, tax, tip, and total
- category hints

The UI reviews the result before saving an expense.

### Settlement Summaries

`convex/aiSummaryActions.ts` generates settlement summaries from a stable payload. It uses:

- stable JSON payloads
- SHA-256 cache keys
- Convex cache reservation/lock behavior
- active AI model config
- fallback Gemini models
- structured output normalization

The default model configuration is:

```text
active: gemini-3.1-flash-lite-preview
fallbacks: gemini-3-flash-preview, gemini-2.5-flash
```

### Health Estimates

Health estimates are generated for qualifying food and alcohol expenses. The health system:

- builds a health ledger payload
- chunks work so large histories can be processed incrementally
- caches generated estimates
- exposes health surface state and coverage through Convex queries
- displays calories, macros, alcohol servings, confidence, trends, and per-person/category summaries

Health estimates are informational and depend on the quality of expense descriptions/items.

### Budget And VAT Classification

`src/app/api/classify-budget-vat/route.ts` uses Gemini to classify budget/catalog entries and VAT-related metadata where available.

### Report Redaction

`src/app/api/redact-report-labels/route.ts` can produce safer report labels for exports. Redaction outputs are cached in Convex by hash so repeated report generation does not call Gemini unnecessarily.

### Report Analytics

Export actions write `reportGenerationEvents` so admins can inspect preview, print, download, redaction, cache-hit, and fallback activity in Settings.

## Admin Console And Safety Controls

The Settings tab is admin-only. It is the operational console for:

- environment status
- admin identity and role
- Convex deployment label and data counts
- app version
- theme/font/default-view preferences
- active AI model and fallback order
- report analytics
- seed/default category setup
- budget catalog backfill
- settlement override cleanup
- report log cleanup
- AI cache cleanup
- operational or factory data reset

Danger-zone mutations are protected by server-side checks, not only UI checks.

Every destructive mutation validates:

- authenticated admin user
- expected environment
- matching Convex server environment
- allowed host/deployment
- required confirmation phrase
- production danger-zone unlock policy when targeting production

Reset modes:

| Mode | Effect |
| --- | --- |
| `operational` | Clears expenses, settlements, overrides, budget items, report events, AI summaries, and AI redactions. Keeps people, categories, profiles, prompts, config, and environment settings. |
| `factory` | Clears operational data plus people and categories. Keeps user profiles, auth, AI prompts/config, and environment settings. |

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example`.

For normal local development, use the development Convex deployment and no Supabase values:

```bash
NEXT_PUBLIC_SETTLEEASE_ENV=development
NEXT_PUBLIC_CONVEX_URL=https://shocking-panda-595.convex.cloud
CONVEX_DEPLOYMENT=dev:shocking-panda-595
```

Set the matching Convex environment values on the development deployment:

```bash
npx convex env set --deployment dev SETTLEEASE_ENV development
npx convex env set --deployment dev SETTLEEASE_DISABLE_AUTH true
```

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

In local development:

- Supabase is bypassed.
- The app uses the synthetic admin user.
- The sidebar shows a development-environment warning.
- Convex calls are allowed only if the development deployment has auth disabled.
- Local dev should point to `https://shocking-panda-595.convex.cloud`.

Deploy Convex functions/schema to development:

```bash
npm run convex:dev
```

## Production Setup

Production requires Supabase, Convex, Gemini, and Vercel configuration.

### Required Client/Server Env

```bash
NEXT_PUBLIC_SETTLEEASE_ENV=production
NEXT_PUBLIC_CONVEX_URL=https://fortunate-fox-427.convex.cloud
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
CONVEX_JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GEMINI_API_KEY=...
```

For Vercel production Convex deploys:

```bash
CONVEX_DEPLOY_KEY=...
```

On the production Convex deployment:

```bash
npx convex env set --prod SETTLEEASE_ENV production
```

Only set this if you intentionally want production danger-zone actions to be unlockable:

```bash
npx convex env set --prod SETTLEEASE_ALLOW_PRODUCTION_DANGER_ACTIONS true
```

Do not set `SETTLEEASE_DISABLE_AUTH=true` in production.

### Supabase Requirements

Supabase must be configured for:

- email/password auth
- Google OAuth if Google login is enabled
- redirect URL matching `AUTH_REDIRECT_URL` in `useAuthFormLogic.ts`
- email templates for confirmation links
- the `check_email_status` RPC used by sign-up/provider detection

The Convex JWT bridge requires a private RSA key in `CONVEX_JWT_PRIVATE_KEY`. The matching public JWKS is served by:

```text
/api/convex-token/jwks
```

Convex custom JWT auth then verifies JWTs minted by:

```text
/api/convex-token
```

### Vercel Build Flow

`npm run build:vercel` runs `scripts/vercel-build.js`.

Behavior:

- Vercel preview/staging builds skip Convex deploy and run `npm run build`.
- Vercel production builds require `CONVEX_DEPLOY_KEY`.
- Production builds run `convex deploy --cmd "npm run build"` and ask Convex to provide `NEXT_PUBLIC_CONVEX_URL`.
- Convex deploy retries are controlled by `CONVEX_DEPLOY_RETRIES`.

## Scripts And Quality Gates

| Script | Purpose |
| --- | --- |
| `npm run predev` | Ensures generated Lucide metadata exists before development. |
| `npm run dev` | Starts Next.js on port 3000. |
| `npm run prebuild` | Downloads Lucide icon data and regenerates metadata. |
| `npm run build` | Builds the Next.js app. |
| `npm run build:vercel` | Vercel-aware Convex/Next production build flow. |
| `npm run convex:dev` | Deploys Convex functions/schema once to the configured dev deployment. |
| `npm run convex:deploy` | Runs `convex deploy`. |
| `npm run start` | Starts the production Next.js server. |
| `npm run lint` | Runs ESLint. |
| `npm run typecheck` | Runs `tsc --noEmit`. |

Important: `next.config.ts` currently has `typescript.ignoreBuildErrors: true`, so `npm run typecheck` is the authoritative TypeScript quality gate.

Recommended pre-merge checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Project Structure

```text
.
+-- convex/
|   +-- app.ts                  # Main Convex queries, mutations, admin guards, data operations
|   +-- schema.ts               # Convex table schema and indexes
|   +-- authGuards.ts           # Auth/self/admin/dev-bypass helpers
|   +-- auth.config.ts          # Convex custom JWT provider config
|   +-- jwtConfig.ts            # JWT issuer/audience/JWKS settings
|   +-- aiSummaryActions.ts     # Settlement summary action
|   +-- aiSummaryCache.ts       # Internal summary cache lock/update helpers
|   +-- healthActions.ts        # Health ledger/chunk actions
|   +-- healthQueries.ts        # Health availability and surface queries
+-- scripts/
|   +-- vercel-build.js         # Production Convex deploy + Next build wrapper
|   +-- download-lucide-icons.js
|   +-- generate-lucide-metadata.js
|   +-- ensure-lucide-metadata.js
+-- src/app/
|   +-- page.tsx                # Main app shell, route query state, auth gate
|   +-- layout.tsx              # App providers and global shell setup
|   +-- globals.css             # App, dashboard, auth page, and design-system styles
|   +-- api/                    # Auth bridge and AI API routes
+-- src/components/settleease/
|   +-- AuthForm.tsx            # Official production auth landing page
|   +-- DashboardView.tsx       # Main dashboard
|   +-- AddExpenseTab.tsx       # Expense entry surface
|   +-- ScanReceiptTab.tsx      # Smart Scan UI
|   +-- SettingsTab.tsx         # Admin settings console
|   +-- ...                     # Feature tabs, dashboard subcomponents, sidebar, modals
+-- src/hooks/
|   +-- useAuthFormLogic.ts     # Supabase auth behavior
|   +-- useSupabaseAuth.ts      # Session/dev synthetic auth state
|   +-- useUserProfile.ts       # Convex profile sync
|   +-- useConvexData.ts        # App data query/mutation wiring
|   +-- useSettleEaseShortcuts.ts
+-- src/lib/settleease/
    +-- settlementCalculations.ts
    +-- itemwiseCalculations.ts
    +-- analyticsModel.ts
    +-- healthSurfaceModel.ts
    +-- aiSummarization.ts
    +-- aiRedaction.ts
    +-- developmentAuth.ts
    +-- convexUrl.ts
    +-- shortcuts.ts
    +-- types.ts
```

## Keyboard Shortcuts

The shortcut registry is in `src/lib/settleease/shortcuts.ts`; execution is centralized in `src/hooks/useSettleEaseShortcuts.ts`.

Navigation shortcuts:

| Shortcut | Destination |
| --- | --- |
| Cmd/Ctrl + 1 | Home/Dashboard |
| Cmd/Ctrl + 2 | Health |
| Cmd/Ctrl + 3 | Analytics |
| Cmd/Ctrl + 4 | Add Expense |
| Cmd/Ctrl + 5 | Smart Scan |
| Cmd/Ctrl + 6 | Edit Expenses |
| Cmd/Ctrl + 7 | Settlements |
| Cmd/Ctrl + 8 | People |
| Cmd/Ctrl + 9 | Categories |
| Cmd/Ctrl + 0 | Settings |

Action/focus shortcuts include Add Expense, Export, dashboard search, and the shortcuts modal. Holding Cmd on macOS or Ctrl on Windows/Linux reveals shortcut hints in the sidebar and supported controls.

## Operational Runbooks

### Add Or Change A Convex Table

1. Update `convex/schema.ts`.
2. Update affected Convex queries/mutations/actions.
3. Update DTO mapping if the UI consumes snake_case fields.
4. Update domain types in `src/lib/settleease/types.ts`.
5. Run `npm run typecheck`.
6. Deploy to development with `npm run convex:dev`.
7. Test local app behavior against the development Convex deployment.

### Add A New Admin Mutation

1. Add the mutation in Convex.
2. Require admin role server-side.
3. For destructive behavior, require `expectedEnvironment` and an exact confirmation phrase.
4. Add the client control in Settings.
5. Disable the control on environment mismatch.
6. Include affected counts or target environment in the dialog.

### Sync Production Data Into Development

This is intentionally destructive to development data.

```bash
npx convex export --prod --include-file-storage --path /tmp/settleease-prod-snapshot.zip
npx convex import --deployment dev --replace-all -y /tmp/settleease-prod-snapshot.zip
```

After importing:

```bash
npm run convex:dev
```

Then verify Settings shows:

- client environment: development
- server environment: development
- Convex host: `shocking-panda-595.convex.cloud`
- auth disabled: true

### Production Danger-Zone Access

Production destructive actions are intentionally locked by default.

To make them unlockable, production Convex must explicitly set:

```bash
npx convex env set --prod SETTLEEASE_ALLOW_PRODUCTION_DANGER_ACTIONS true
```

The UI still requires an unlock confirmation and every destructive mutation validates its own confirmation phrase server-side.

## Troubleshooting

### Local Dev Opens Without Login

That is expected. Local development uses the synthetic admin user when `NODE_ENV=development`.

Check:

```bash
NEXT_PUBLIC_SETTLEEASE_ENV=development
NEXT_PUBLIC_CONVEX_URL=https://shocking-panda-595.convex.cloud
SETTLEEASE_DISABLE_AUTH=true
```

### Local Dev Shows Supabase Configuration Errors

Local no-auth mode should not need Supabase. Confirm the app is running with `npm run dev` and `NODE_ENV=development`, and that `NEXT_PUBLIC_SETTLEEASE_ENV` is not set to production.

### Convex Auth Errors In Production

Check:

- Supabase URL/anon key are present.
- `CONVEX_JWT_PRIVATE_KEY` is present and valid.
- `/api/convex-token` can validate the Supabase access token.
- `/api/convex-token/jwks` exposes the matching public key.
- Convex `auth.config.ts` issuer/audience settings match the minted JWT.

### Auth Edge Cases Are Not Showing Correct Messages

Check the Supabase `check_email_status` RPC. The auth page depends on that RPC to distinguish:

- new email
- confirmed existing email
- unconfirmed email
- pending email
- Google-backed account

If the RPC fails, the UI intentionally blocks the flow with "Account Check Unavailable".

### Settings Is Read-Only

Settings becomes read-only when the client environment, Convex URL, or server environment does not match.

Use the admin snapshot in Settings to compare:

- `NEXT_PUBLIC_SETTLEEASE_ENV`
- `NEXT_PUBLIC_CONVEX_URL`
- Convex `SETTLEEASE_ENV`
- Convex auth-disabled state
- expected host

### Production Danger Zone Is Locked

Production danger-zone actions require:

- admin role
- matching production environment
- server-side production unlock flag
- UI unlock confirmation
- per-action typed phrase

Without `SETTLEEASE_ALLOW_PRODUCTION_DANGER_ACTIONS=true`, production danger actions stay locked.

### Gemini Features Fail

Check:

- `GEMINI_API_KEY` exists in the runtime environment.
- active AI config in Settings has a supported model.
- fallback models are configured.
- Convex function logs or Next.js API route logs for schema/JSON parsing failures.

### Build Passes But TypeScript Has Errors

`next.config.ts` ignores TypeScript build errors. Always run:

```bash
npm run typecheck
```

before trusting a build.

## Security

SettleEase implements comprehensive security measures to protect your application and data. For complete security documentation, see [SECURITY.md](./SECURITY.md).

### Key Security Features

- **Source Maps Disabled**: Production builds do not include source maps (`productionBrowserSourceMaps: false`)
- **Security Headers**: Comprehensive security headers configured in `next.config.ts` and `vercel.json`
- **Environment Variable Protection**: All secrets managed via environment variables, never hardcoded
- **Authentication**: Supabase Auth with JWT bridge to Convex
- **Authorization**: Server-side role-based access control with admin guards
- **API Security**: Bearer token validation and input sanitization

### Security Scripts

```bash
# Run comprehensive security check
node scripts/security-check.js

# Remove source maps from build
node scripts/remove-source-maps.js

# Check for vulnerabilities
npm audit
```

### Pre-Deployment Security Checklist

Before deploying to production:

1. Run `node scripts/security-check.js` - all checks must pass
2. Verify no source maps in `.next/` directory
3. Ensure all environment variables are set in Vercel dashboard
4. Rotate JWT private keys and API keys
5. Review [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)

### Security Best Practices

- Do not commit `.env.local`, private keys, deploy keys, Gemini keys, or Supabase secrets
- Local no-auth mode is only for local development against the development Convex deployment
- Convex server-side guards are the final authorization layer
- Destructive mutations must never rely only on client-side disabling
- Production data reset features should stay locked unless there is a deliberate operational reason to unlock them
- Regularly update dependencies and run `npm audit`
- Use separate API keys for development and production

For detailed security guidelines, incident response procedures, and deployment checklists, see [SECURITY.md](./SECURITY.md).

## License

SettleEase is released under the MIT License. See [LICENSE](./LICENSE).
