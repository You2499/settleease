#if os(iOS)
import SwiftUI
import SettleEaseCore

enum SettleTheme {
    static let page = Color(red: 0.985, green: 0.985, blue: 0.975)
    static let card = Color(uiColor: .systemBackground)
    static let stone = Color(red: 245.0 / 255.0, green: 242.0 / 255.0, blue: 239.0 / 255.0)
    static let stoneStrong = Color(red: 238.0 / 255.0, green: 234.0 / 255.0, blue: 229.0 / 255.0)
    static let primary = Color.primary
    static let mutedText = Color.secondary
    static let warmAccent = Color(red: 119.0 / 255.0, green: 113.0 / 255.0, blue: 105.0 / 255.0)
    static let positive = Color(red: 40.0 / 255.0, green: 117.0 / 255.0, blue: 74.0 / 255.0)
    static let warning = Color(red: 176.0 / 255.0, green: 111.0 / 255.0, blue: 45.0 / 255.0)
}

extension View {
    func settleScreenChrome() -> some View {
        self
            .background(SettleTheme.page.ignoresSafeArea())
            .toolbarBackground(SettleTheme.page, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(.visible, for: .tabBar)
            .tint(SettleTheme.primary)
    }
}

struct ContentCard<Content: View>: View {
    var spacing: CGFloat = 12
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .padding(18)
        .background(SettleTheme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.black.opacity(0.08), lineWidth: 0.6)
        }
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        .shadow(color: Color(red: 78.0 / 255.0, green: 50.0 / 255.0, blue: 23.0 / 255.0).opacity(0.035), radius: 16, x: 0, y: 6)
    }
}

struct AnimatedMoneyText: View {
    var value: Double
    var style: Font = .title.bold()
    var compact = false

    var body: some View {
        Text(compact ? SettleEaseFormatters.compactCurrency(value) : SettleEaseFormatters.currency(value))
            .font(style)
            .monospacedDigit()
            .contentTransition(.numericText(value: value))
            .animation(.settleEaseState, value: value)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
    }
}

struct MetricCard: View {
    var title: String
    var value: Double
    var footnote: String
    var symbol: String
    var tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: symbol)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(tint)
                    .frame(width: 24, height: 24)
                    .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                Text(title)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            AnimatedMoneyText(value: value, style: .headline.weight(.semibold), compact: true)

            Text(footnote)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(SettleTheme.stone.opacity(0.82), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.black.opacity(0.05), lineWidth: 0.5)
        }
        .accessibilityElement(children: .combine)
    }
}

struct SettlePillButtonStyle: ButtonStyle {
    var prominent = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(prominent ? Color.white : Color.primary)
            .padding(.horizontal, prominent ? 16 : 14)
            .padding(.vertical, 10)
            .background(prominent ? Color.black : SettleTheme.stone, in: Capsule())
            .overlay {
                if !prominent {
                    Capsule().stroke(Color.black.opacity(0.08), lineWidth: 0.6)
                }
            }
            .shadow(color: Color.black.opacity(prominent ? 0.12 : 0.04), radius: prominent ? 8 : 4, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.settleEaseFast, value: configuration.isPressed)
    }
}

struct SettleGlassActionGroup<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 8) {
                HStack(spacing: 8) {
                    content
                }
            }
        } else {
            HStack(spacing: 8) {
                content
            }
        }
    }
}

struct SettleGlassToolbarButton: View {
    var title: String
    var systemImage: String
    var tint: Color = .primary
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: systemImage)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(tint)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .background {
            SettleGlass {
                Color.clear
            }
        }
    }
}

struct EmptyState: View {
    var title: String
    var message: String
    var symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: symbol)
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.title2.bold())

            Text(message)
                .font(.body)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct ErrorBanner: View {
    var message: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
            Text(message)
                .font(.subheadline)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .background(SettleTheme.stone.opacity(0.9), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(SettleTheme.warning.opacity(0.28), lineWidth: 0.7)
        }
    }
}

struct LoadingState: View {
    var title = "Syncing SettleEase"

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(30)
    }
}

struct ConcentricFormSection<Content: View>: View {
    var title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
            VStack(spacing: 12) {
                content
            }
            .padding(14)
            .background(SettleTheme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(16)
        .background(SettleTheme.stone.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.black.opacity(0.06), lineWidth: 0.6)
        }
    }
}
#endif
