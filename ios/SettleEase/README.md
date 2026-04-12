# SettleEase iOS

Native SwiftUI source for the iOS 26 SettleEase app.

This folder is intentionally split into three modules:

- `SettleEaseCore`: portable models, formatting, sample data, and settlement math.
- `SettleEaseServices`: backend and device-service boundaries for Supabase, Convex token minting, AI routes, receipt images, and haptics.
- `SettleEaseApp`: SwiftUI app shell, Liquid Glass components, screens, and view models.

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

The app currently boots in sample-data mode while live credentials and realtime
adapters are wired.

## Xcode Setup

1. Open `SettleEase.xcodeproj` in Xcode 26.
2. Select your personal development team for local signing.
3. Choose an iPhone or iPhone simulator running iOS 26.
4. Build and run the `SettleEase` scheme.
5. Add Swift Package dependencies in Xcode when wiring live auth/realtime adapters:
   - `https://github.com/supabase/supabase-swift.git`
   - `https://github.com/get-convex/convex-swift.git`
   - `https://github.com/google/GoogleSignIn-iOS.git`
6. Configure app constants in `AppConfiguration.swift` or inject them from an `.xcconfig`.

The app source includes a sample-data mode so the UI can be opened and tuned before live backend credentials are wired.
