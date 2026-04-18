#if os(iOS)
import SwiftUI
import SettleEaseCore

enum SettleTheme {
    static let page = adaptive(
        light: UIColor(red: 0.995, green: 0.993, blue: 0.988, alpha: 1),
        dark: UIColor(red: 0.055, green: 0.058, blue: 0.055, alpha: 1)
    )
    static let card = Color(uiColor: .secondarySystemBackground)
    static let elevated = Color(uiColor: .systemBackground)
    static let stone = adaptive(
        light: UIColor(red: 245.0 / 255.0, green: 242.0 / 255.0, blue: 239.0 / 255.0, alpha: 1),
        dark: UIColor(red: 0.145, green: 0.137, blue: 0.125, alpha: 1)
    )
    static let stoneStrong = adaptive(
        light: UIColor(red: 238.0 / 255.0, green: 234.0 / 255.0, blue: 229.0 / 255.0, alpha: 1),
        dark: UIColor(red: 0.205, green: 0.193, blue: 0.172, alpha: 1)
    )
    static let muted = Color(uiColor: .tertiarySystemBackground)
    static let border = Color(uiColor: .separator)
    static let hairline = Color(uiColor: .opaqueSeparator)
    static let primary = Color(uiColor: .label)
    static let inverseSurface = Color(uiColor: .label)
    static let inverseText = Color(uiColor: .systemBackground)
    static let mutedText = Color(uiColor: .secondaryLabel)
    static let tertiaryText = Color(uiColor: .tertiaryLabel)
    static let warmAccent = adaptive(
        light: UIColor(red: 119.0 / 255.0, green: 113.0 / 255.0, blue: 105.0 / 255.0, alpha: 1),
        dark: UIColor(red: 0.74, green: 0.70, blue: 0.64, alpha: 1)
    )
    static let positive = adaptive(
        light: UIColor(red: 24.0 / 255.0, green: 125.0 / 255.0, blue: 82.0 / 255.0, alpha: 1),
        dark: UIColor(red: 0.36, green: 0.86, blue: 0.58, alpha: 1)
    )
    static let positiveSurface = adaptive(
        light: UIColor(red: 0.91, green: 0.98, blue: 0.94, alpha: 1),
        dark: UIColor(red: 0.05, green: 0.20, blue: 0.12, alpha: 1)
    )
    static let warning = adaptive(
        light: UIColor(red: 176.0 / 255.0, green: 111.0 / 255.0, blue: 45.0 / 255.0, alpha: 1),
        dark: UIColor(red: 0.98, green: 0.67, blue: 0.35, alpha: 1)
    )
    static let warningSurface = adaptive(
        light: UIColor(red: 1.0, green: 0.96, blue: 0.88, alpha: 1),
        dark: UIColor(red: 0.25, green: 0.14, blue: 0.04, alpha: 1)
    )
    static let destructive = Color(uiColor: .systemRed)
    static let destructiveSurface = adaptive(
        light: UIColor(red: 1.0, green: 0.93, blue: 0.92, alpha: 1),
        dark: UIColor(red: 0.25, green: 0.06, blue: 0.05, alpha: 1)
    )
    static let rowHighlight = adaptive(
        light: UIColor(red: 1, green: 1, blue: 1, alpha: 0.88),
        dark: UIColor(red: 0.16, green: 0.16, blue: 0.15, alpha: 0.92)
    )
    static let glassControlFill = adaptive(
        light: UIColor(white: 1.0, alpha: 0.72),
        dark: UIColor(white: 0.08, alpha: 0.74)
    )
    static let glassControlPressedFill = adaptive(
        light: UIColor(white: 0.94, alpha: 0.82),
        dark: UIColor(white: 0.18, alpha: 0.82)
    )
    static let glassControlStroke = adaptive(
        light: UIColor(white: 0.0, alpha: 0.09),
        dark: UIColor(white: 1.0, alpha: 0.16)
    )
    static let glassControlText = Color(uiColor: .label)
    static let glassControlMutedText = Color(uiColor: .secondaryLabel)
    static let glassPrimaryFill = adaptive(
        light: UIColor(red: 0.08, green: 0.08, blue: 0.075, alpha: 0.90),
        dark: UIColor(red: 0.88, green: 0.98, blue: 0.91, alpha: 0.92)
    )
    static let glassPrimaryPressedFill = adaptive(
        light: UIColor(red: 0.16, green: 0.16, blue: 0.14, alpha: 0.94),
        dark: UIColor(red: 0.74, green: 0.94, blue: 0.80, alpha: 0.96)
    )
    static let glassPrimaryText = adaptive(
        light: UIColor.white,
        dark: UIColor(red: 0.03, green: 0.13, blue: 0.08, alpha: 1)
    )
    static let glassPrimaryStroke = adaptive(
        light: UIColor(white: 1.0, alpha: 0.18),
        dark: UIColor(white: 0.0, alpha: 0.16)
    )
    static let shadow = adaptive(
        light: UIColor.black.withAlphaComponent(0.08),
        dark: UIColor.black.withAlphaComponent(0.34)
    )

    private static func adaptive(light: UIColor, dark: UIColor) -> Color {
        Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? dark : light
        })
    }
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
                .stroke(SettleTheme.border.opacity(0.72), lineWidth: 0.6)
        }
        .shadow(color: SettleTheme.shadow.opacity(0.45), radius: 4, x: 0, y: 2)
        .shadow(color: Color(red: 78.0 / 255.0, green: 50.0 / 255.0, blue: 23.0 / 255.0).opacity(0.035), radius: 16, x: 0, y: 6)
    }
}

struct WebBetaCard<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            content
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SettleTheme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(SettleTheme.border.opacity(0.95), lineWidth: 0.8)
        }
        .shadow(color: SettleTheme.shadow.opacity(0.45), radius: 8, x: 0, y: 3)
        .shadow(color: Color(red: 78.0 / 255.0, green: 50.0 / 255.0, blue: 23.0 / 255.0).opacity(0.035), radius: 20, x: 0, y: 10)
    }
}

struct WebSectionHeader: View {
    var title: String
    var subtitle: String?
    var systemImage: String

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            Image(systemName: SettleIcon.symbol(for: systemImage))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SettleTheme.primary)
                .frame(width: 32, height: 32)
                .background(SettleTheme.stone, in: RoundedRectangle(cornerRadius: 9, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.title3.weight(.bold))
                    .foregroundStyle(SettleTheme.primary)
                    .fixedSize(horizontal: false, vertical: true)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(SettleTheme.mutedText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }
}

struct SettleAmountText: View {
    var value: Double
    var font: Font = .headline.weight(.bold)
    var compact = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Text(compact ? SettleEaseFormatters.compactCurrency(value) : SettleEaseFormatters.currency(value))
            .font(font)
            .monospacedDigit()
            .contentTransition(reduceMotion ? .opacity : .numericText(value: value))
            .animation(reduceMotion ? .easeInOut(duration: 0.12) : .settleEaseState, value: value)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }
}

enum WebPillButtonKind {
    case primary
    case secondary
    case tertiary
    case destructive
}

struct WebPillButtonStyle: ButtonStyle {
    var kind: WebPillButtonKind = .tertiary
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(foreground)
            .padding(.horizontal, kind == .primary ? 16 : 13)
            .padding(.vertical, 10)
            .background(background, in: Capsule())
            .overlay {
                Capsule().stroke(stroke, lineWidth: 0.7)
            }
            .opacity(isEnabled ? 1 : 0.45)
            .scaleEffect(!reduceMotion && configuration.isPressed ? 0.975 : 1)
            .animation(reduceMotion ? .easeInOut(duration: 0.1) : .settleEaseFast, value: configuration.isPressed)
    }

    private var foreground: Color {
        switch kind {
        case .primary:
            return SettleTheme.inverseText
        case .secondary, .tertiary:
            return SettleTheme.primary
        case .destructive:
            return SettleTheme.destructive
        }
    }

    private var background: Color {
        switch kind {
        case .primary:
            return SettleTheme.inverseSurface
        case .secondary:
            return SettleTheme.elevated
        case .tertiary, .destructive:
            return SettleTheme.stone
        }
    }

    private var stroke: Color {
        switch kind {
        case .primary:
            return SettleTheme.hairline.opacity(0.35)
        case .secondary:
            return SettleTheme.border
        case .tertiary:
            return SettleTheme.hairline.opacity(0.28)
        case .destructive:
            return SettleTheme.destructive.opacity(0.22)
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
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(systemName: SettleIcon.symbol(for: symbol))
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
            .foregroundStyle(prominent ? SettleTheme.inverseText : SettleTheme.primary)
            .padding(.horizontal, prominent ? 16 : 14)
            .padding(.vertical, 10)
            .background(prominent ? SettleTheme.inverseSurface : SettleTheme.stone, in: Capsule())
            .overlay {
                if !prominent {
                    Capsule().stroke(SettleTheme.border.opacity(0.65), lineWidth: 0.6)
                }
            }
            .shadow(color: SettleTheme.shadow.opacity(prominent ? 0.75 : 0.35), radius: prominent ? 8 : 4, x: 0, y: 2)
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

enum SettleGlassToolbarButtonKind {
    case primary
    case secondary
}

struct SettleGlassToolbarButton: View {
    var title: String
    var systemImage: String
    var kind: SettleGlassToolbarButtonKind = .secondary
    var tint: Color?
    var action: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button {
            action()
        } label: {
            Label(title, systemImage: SettleIcon.symbol(for: systemImage))
                .font(.subheadline.weight(.bold))
                .foregroundStyle(foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.86)
                .frame(minHeight: 44)
                .padding(.horizontal, 14)
                .labelStyle(.titleAndIcon)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .background(background)
        .overlay {
            Capsule()
                .stroke(stroke, lineWidth: 0.8)
        }
        .contentShape(Capsule())
        .fixedSize(horizontal: true, vertical: false)
        .scaleEffect(reduceMotion ? 1 : 1)
    }

    private var foreground: Color {
        tint ?? (kind == .primary ? SettleTheme.glassPrimaryText : SettleTheme.glassControlText)
    }

    @ViewBuilder
    private var background: some View {
        SettleGlass {
            switch kind {
            case .primary:
                SettleTheme.glassPrimaryFill
            case .secondary:
                SettleTheme.glassControlFill
            }
        }
    }

    private var stroke: Color {
        switch kind {
        case .primary:
            SettleTheme.glassPrimaryStroke
        case .secondary:
            SettleTheme.glassControlStroke
        }
    }
}

struct EmptyState: View {
    var title: String
    var message: String
    var symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: SettleIcon.symbol(for: symbol))
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
