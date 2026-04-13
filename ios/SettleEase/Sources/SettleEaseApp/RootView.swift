#if os(iOS)
import SwiftUI

struct DashboardRootView: View {
    @Environment(DashboardStore.self) private var store

    var body: some View {
        NavigationStack {
            ZStack {
                SettleTheme.page.ignoresSafeArea()

                switch store.phase {
                case .launching:
                    StartupSurface(message: "Getting live balances ready")
                case .needsAuth, .authenticating:
                    AuthView()
                case .syncingDashboard:
                    StartupSurface(message: "Syncing your group")
                case .ready:
                    DashboardOnlyShell()
                case .recoverableError(let message):
                    RecoverableErrorView(message: message)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .background(SettleTheme.page.ignoresSafeArea())
    }
}

private struct StartupSurface: View {
    var message: String

    var body: some View {
        VStack(spacing: 14) {
            Image("SettleEaseBrandMark")
                .resizable()
                .scaledToFit()
                .frame(width: 58, height: 58)

            VStack(spacing: 5) {
                Text("SettleEase")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(SettleTheme.primary)

                Text(message)
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
        .accessibilityLabel("SettleEase is \(message)")
    }
}

private struct RecoverableErrorView: View {
    @Environment(DashboardStore.self) private var store
    var message: String

    var body: some View {
        VStack(spacing: 18) {
            Image("SettleEaseBrandMark")
                .resizable()
                .scaledToFit()
                .frame(width: 52, height: 52)

            WebBetaCard {
                VStack(alignment: .leading, spacing: 12) {
                    WebSectionHeader(
                        title: "Dashboard needs attention",
                        subtitle: message,
                        systemImage: "exclamationmark.triangle.fill"
                    )

                    Text("The app is staying on a real-backend path. It will not open sample dashboard data behind your back.")
                        .font(.subheadline)
                        .foregroundStyle(SettleTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 10) {
                        Button {
                            Task { await store.retry() }
                        } label: {
                            Label("Retry", systemImage: "arrow.clockwise")
                        }
                        .buttonStyle(WebPillButtonStyle(kind: .primary))

                        if store.hasAuthBackend {
                            Button {
                                Task { await store.signOut() }
                            } label: {
                                Text("Sign Out")
                            }
                            .buttonStyle(WebPillButtonStyle(kind: .secondary))
                        }
                    }
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(SettleTheme.page.ignoresSafeArea())
    }
}
#endif
