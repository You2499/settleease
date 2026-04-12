#if os(iOS)
import SwiftUI
import SettleEaseCore

struct ContentCard<Content: View>: View {
    var spacing: CGFloat = 12
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .padding(16)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(.separator.opacity(0.24), lineWidth: 1)
        }
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
        ContentCard {
            HStack(alignment: .top) {
                Image(systemName: symbol)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(tint)
                    .frame(width: 34, height: 34)
                    .background(tint.opacity(0.14), in: RoundedRectangle(cornerRadius: 10, style: .continuous))

                Spacer(minLength: 8)
            }

            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.secondary)

            AnimatedMoneyText(value: value, style: .title2.bold(), compact: true)

            Text(footnote)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
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
        .padding(22)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
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
        .background(.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
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
            .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .padding(16)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}
#endif
