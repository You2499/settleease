#if os(iOS)
import SwiftUI
import SettleEaseServices

public struct SettleEaseRoot: View {
    @State private var model = AppModel.sample()
    @State private var isShowingStartupSurface = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init() {}

    public var body: some View {
        ZStack {
            RootView()
                .environment(model)

            if isShowingStartupSurface {
                StartupSurface()
                    .transition(.opacity)
            }
        }
        .background(SettleTheme.page.ignoresSafeArea())
        .task {
            await dismissStartupSurface()
        }
    }

    private func dismissStartupSurface() async {
        guard isShowingStartupSurface else { return }

        await Task.yield()
        try? await Task.sleep(nanoseconds: 420_000_000)

        withAnimation(reduceMotion ? .easeOut(duration: 0.12) : .settleEaseState) {
            isShowingStartupSurface = false
        }
    }
}

private struct StartupSurface: View {
    var body: some View {
        VStack(spacing: 14) {
            Image("SettleEaseBrandMark")
                .resizable()
                .scaledToFit()
                .frame(width: 54, height: 54)

            VStack(spacing: 5) {
                Text("SettleEase")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(SettleTheme.primary)

                Text("Getting balances ready")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(SettleTheme.warmAccent)
            }

            ProgressView()
                .controlSize(.small)
                .tint(SettleTheme.positive)
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SettleTheme.page.ignoresSafeArea())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("SettleEase is getting balances ready")
    }
}
#endif
