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
        .library(name: "SettleEaseAppSource", targets: ["SettleEaseApp"]),
        .executable(name: "SettleEaseCoreChecks", targets: ["SettleEaseCoreChecks"])
    ],
    targets: [
        .target(name: "SettleEaseCore"),
        .target(
            name: "SettleEaseServices",
            dependencies: ["SettleEaseCore"]
        ),
        .target(
            name: "SettleEaseApp",
            dependencies: ["SettleEaseCore", "SettleEaseServices"]
        ),
        .executableTarget(
            name: "SettleEaseCoreChecks",
            dependencies: ["SettleEaseCore"],
            path: "Checks/SettleEaseCoreChecks"
        ),
        .testTarget(
            name: "SettleEaseCoreTests",
            dependencies: ["SettleEaseCore"]
        )
    ]
)
