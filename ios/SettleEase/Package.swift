// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "SettleEaseIOS",
    platforms: [
        .iOS("26.0"),
        .macOS(.v15)
    ],
    products: [
        .library(name: "SettleEaseCore", targets: ["SettleEaseCore"]),
        .library(name: "SettleEaseServices", targets: ["SettleEaseServices"]),
        .library(name: "SettleEaseAppSource", targets: ["SettleEaseApp"])
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.43.1"),
        .package(url: "https://github.com/get-convex/convex-swift.git", from: "0.8.1")
    ],
    targets: [
        .target(name: "SettleEaseCore"),
        .target(
            name: "SettleEaseServices",
            dependencies: [
                "SettleEaseCore",
                .product(name: "Auth", package: "supabase-swift"),
                .product(name: "Supabase", package: "supabase-swift"),
                .product(name: "ConvexMobile", package: "convex-swift")
            ]
        ),
        .target(
            name: "SettleEaseApp",
            dependencies: ["SettleEaseCore", "SettleEaseServices"]
        )
    ]
)
