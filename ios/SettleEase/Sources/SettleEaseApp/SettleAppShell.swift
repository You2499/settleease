#if os(iOS)
import SwiftUI

struct DashboardOnlyShell: View {
    @Environment(DashboardStore.self) private var store
    @Namespace private var navNamespace
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    var body: some View {
        VStack(spacing: 0) {
            appHeader

            DashboardView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            bottomNav
                .padding(.horizontal, 14)
                .padding(.bottom, 8)
        }
        .background(SettleTheme.page.ignoresSafeArea())
        .sheet(item: futurePhaseBinding) { message in
            FuturePhaseSheet(message: message.value)
                .presentationDetents([.height(260)])
                .presentationDragIndicator(.visible)
        }
    }

    private var appHeader: some View {
        HStack(spacing: 10) {
            Image("SettleEaseBrandMark")
                .resizable()
                .scaledToFit()
                .frame(width: 32, height: 32)

            Text("SettleEase")
                .font(.headline.weight(.semibold))
                .foregroundStyle(SettleTheme.primary)

            Spacer()

            if case .ready = store.phase {
                Label("Live", systemImage: "dot.radiowaves.left.and.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(SettleTheme.positive)
                    .labelStyle(.iconOnly)
                    .accessibilityLabel("Live backend connected")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(SettleTheme.page)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(SettleTheme.border.opacity(0.7))
                .frame(height: 0.6)
        }
    }

    private var bottomNav: some View {
        Group {
            if #available(iOS 26.0, *), !reduceTransparency {
                GlassEffectContainer(spacing: 7) {
                    HStack(spacing: 5) {
                        ForEach(BottomNavDestination.allCases) { item in
                            navButton(item)
                        }
                    }
                    .padding(7)
                    .glassEffect(.regular.interactive(), in: Capsule())
                }
            } else {
                HStack(spacing: 5) {
                    ForEach(BottomNavDestination.allCases) { item in
                        navButton(item)
                    }
                }
                .padding(7)
                .background(.regularMaterial, in: Capsule())
                .overlay {
                    Capsule().stroke(SettleTheme.border.opacity(0.85), lineWidth: 0.8)
                }
            }
        }
        .shadow(color: Color.black.opacity(0.08), radius: 16, x: 0, y: 8)
    }

    @ViewBuilder
    private func navButton(_ item: BottomNavDestination) -> some View {
        let isHome = item == .home
        Button {
            if !isHome {
                store.selectFuturePhase(item.title)
            }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: item.symbol)
                    .font(.system(size: 19, weight: .semibold))
                    .frame(height: 22)
                Text(item.title)
                    .font(.caption2.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.68)
            }
            .foregroundStyle(isHome ? SettleTheme.primary : SettleTheme.warmAccent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 7)
            .background {
                if isHome {
                    if #available(iOS 26.0, *), !reduceTransparency {
                        Capsule()
                            .fill(Color.clear)
                            .glassEffect(.regular.interactive(), in: Capsule())
                            .glassEffectID("home-active", in: navNamespace)
                    } else {
                        Capsule()
                            .fill(SettleTheme.card.opacity(0.92))
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.title)
    }

    private var futurePhaseBinding: Binding<FuturePhaseMessage?> {
        Binding(
            get: { store.futurePhaseMessage.map(FuturePhaseMessage.init(value:)) },
            set: { store.futurePhaseMessage = $0?.value }
        )
    }
}

private enum BottomNavDestination: CaseIterable, Identifiable {
    case home
    case analytics
    case smartScan
    case add
    case menu

    var id: Self { self }

    var title: String {
        switch self {
        case .home: "Home"
        case .analytics: "Analytics"
        case .smartScan: "Smart Scan"
        case .add: "Add"
        case .menu: "Menu"
        }
    }

    var symbol: String {
        switch self {
        case .home: "house.fill"
        case .analytics: "chart.xyaxis.line"
        case .smartScan: "viewfinder"
        case .add: "plus"
        case .menu: "line.3.horizontal"
        }
    }
}

private struct FuturePhaseMessage: Identifiable {
    var id: String { value }
    var value: String
}

private struct FuturePhaseSheet: View {
    @Environment(\.dismiss) private var dismiss
    var message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            WebSectionHeader(
                title: "Dashboard first",
                subtitle: message,
                systemImage: "sparkles"
            )

            Text("No fake screens, no sample-mode shortcuts. The next phase can build this area once the live Dashboard is completely trustworthy.")
                .font(.subheadline)
                .foregroundStyle(SettleTheme.mutedText)
                .fixedSize(horizontal: false, vertical: true)

            SettleGlassActionGroup {
                Button("Got it") { dismiss() }
                    .buttonStyle(WebPillButtonStyle(kind: .primary))
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(SettleTheme.page)
    }
}
#endif
