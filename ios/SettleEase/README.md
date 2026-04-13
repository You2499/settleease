# SettleEase iOS

Native SwiftUI source for the iOS 26 SettleEase app.

This folder is intentionally split into three modules:

- `SettleEaseCore`: portable models, formatting, dashboard helpers, sample fixtures for tests, and settlement math.
- `SettleEaseServices`: Supabase auth, Convex realtime, Convex token minting, AI routes, receipt images, and haptics.
- `SettleEaseApp`: dashboard-only SwiftUI shell, Liquid Glass controls, auth, and dashboard view models.

## Current Build Notes

The generated project is `SettleEase.xcodeproj`. It was generated from
`project.yml` with XcodeGen and verified with Xcode 26.4 / iOS Simulator 26.4.

Useful checks:

```sh
cd ios/SettleEase
swift test
swift run SettleEaseCoreChecks
xcodebuild -quiet -project SettleEase.xcodeproj -scheme SettleEase -sdk iphonesimulator26.4 -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.4' build
```

The app boots through real backend gates only. If Supabase or Convex config is
missing, the first SwiftUI frame shows a recoverable setup card instead of
falling back to sample dashboard data.

## Xcode Setup

1. Open `SettleEase.xcodeproj` in Xcode 26.
2. Select your personal development team for local signing.
3. Choose an iPhone or iPhone simulator running iOS 26.
4. Build and run the `SettleEase` scheme.
5. Configure backend constants in `XcodeApp/Secrets.xcconfig`.

## Backend Config

Create a local, gitignored config file from the example:

```sh
cp XcodeApp/Secrets.xcconfig.example XcodeApp/Secrets.xcconfig
```

Then set:

- `SETTLEEASE_SUPABASE_URL`
- `SETTLEEASE_SUPABASE_ANON_KEY`
- `SETTLEEASE_CONVEX_URL`
- `SETTLEEASE_WEB_BASE_URL` if you need to override `https://settleease-navy.vercel.app`
- `SETTLEEASE_OAUTH_REDIRECT_URL` if you need to override `settleease://auth-callback`

The Supabase project must allow `settleease://auth-callback` as an auth redirect
URL for Google sign-in. The app uses the official Supabase Swift package for
email/password and Google OAuth, and the official Convex Swift package for the
live dashboard stream.
