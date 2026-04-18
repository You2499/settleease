#if os(iOS)
import SwiftUI
import SettleEaseCore
import UIKit

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
    static let controlFill = adaptive(
        light: UIColor(red: 0.985, green: 0.982, blue: 0.972, alpha: 0.96),
        dark: UIColor(red: 0.145, green: 0.145, blue: 0.135, alpha: 0.96)
    )
    static let controlPressedFill = adaptive(
        light: UIColor(red: 0.935, green: 0.928, blue: 0.910, alpha: 0.98),
        dark: UIColor(red: 0.215, green: 0.215, blue: 0.200, alpha: 0.98)
    )
    static let controlTrackFill = adaptive(
        light: UIColor(red: 0.915, green: 0.910, blue: 0.895, alpha: 0.70),
        dark: UIColor(red: 0.195, green: 0.195, blue: 0.185, alpha: 0.82)
    )
    static let controlSelectedFill = adaptive(
        light: UIColor(red: 0.995, green: 0.992, blue: 0.982, alpha: 0.96),
        dark: UIColor(red: 0.350, green: 0.350, blue: 0.335, alpha: 0.92)
    )
    static let controlStroke = adaptive(
        light: UIColor(white: 0.0, alpha: 0.095),
        dark: UIColor(white: 1.0, alpha: 0.135)
    )
    static let controlFocusStroke = adaptive(
        light: UIColor(red: 0.18, green: 0.58, blue: 0.40, alpha: 0.62),
        dark: UIColor(red: 0.42, green: 0.88, blue: 0.63, alpha: 0.70)
    )
    static let controlPrimaryFill = adaptive(
        light: UIColor(red: 0.085, green: 0.090, blue: 0.080, alpha: 0.94),
        dark: UIColor(red: 0.865, green: 0.965, blue: 0.895, alpha: 0.96)
    )
    static let controlPrimaryPressedFill = adaptive(
        light: UIColor(red: 0.170, green: 0.175, blue: 0.155, alpha: 0.96),
        dark: UIColor(red: 0.750, green: 0.925, blue: 0.805, alpha: 0.98)
    )
    static let controlPrimaryText = adaptive(
        light: UIColor(red: 0.985, green: 0.985, blue: 0.970, alpha: 1),
        dark: UIColor(red: 0.035, green: 0.110, blue: 0.070, alpha: 1)
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

enum SettleControlRole {
    case primary
    case secondary
    case quiet
    case destructive
}

struct SettleControlSurface<Content: View>: View {
    var shape: AnyShape = AnyShape(Capsule())
    var fill: Color = SettleTheme.controlFill
    var stroke: Color = SettleTheme.controlStroke
    var focused = false
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(fill, in: shape)
            .overlay {
                shape.stroke(focused ? SettleTheme.controlFocusStroke : stroke, lineWidth: focused ? 1.2 : 0.75)
            }
    }
}

struct SettleGlassButton: View {
    var title: String
    var systemImage: String?
    var role: SettleControlRole = .secondary
    var isLoading = false
    var expands = false
    var action: () -> Void

    var body: some View {
        Button {
            guard !isLoading else { return }
            action()
        } label: {
            HStack(spacing: 7) {
                if isLoading {
                    ProgressView()
                        .controlSize(.small)
                } else if let systemImage {
                    Image(systemName: SettleIcon.symbol(for: systemImage))
                        .font(.caption.weight(.bold))
                }

                Text(title)
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)
            }
            .font(.subheadline.weight(.bold))
            .foregroundStyle(foreground)
            .frame(maxWidth: expands ? .infinity : nil, minHeight: 44)
            .padding(.horizontal, role == .primary ? 15 : 13)
        }
        .buttonStyle(SettleControlButtonStyle(role: role))
        .accessibilityLabel(title)
    }

    private var foreground: Color {
        switch role {
        case .primary:
            return SettleTheme.controlPrimaryText
        case .secondary, .quiet:
            return SettleTheme.primary
        case .destructive:
            return SettleTheme.destructive
        }
    }
}

private struct SettleControlButtonStyle: ButtonStyle {
    var role: SettleControlRole
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(background(isPressed: configuration.isPressed), in: Capsule())
            .overlay {
                Capsule().stroke(stroke, lineWidth: 0.75)
            }
            .contentShape(Capsule())
            .opacity(isEnabled ? 1 : 0.48)
            .scaleEffect(!reduceMotion && configuration.isPressed ? 0.985 : 1)
            .animation(reduceMotion ? .easeInOut(duration: 0.1) : .settleEaseFast, value: configuration.isPressed)
    }

    private func background(isPressed: Bool) -> Color {
        if isPressed {
            return role == .primary ? SettleTheme.controlPrimaryPressedFill : SettleTheme.controlPressedFill
        }
        switch role {
        case .primary:
            return SettleTheme.controlPrimaryFill
        case .secondary:
            return SettleTheme.controlFill
        case .quiet:
            return SettleTheme.controlTrackFill
        case .destructive:
            return SettleTheme.destructiveSurface
        }
    }

    private var stroke: Color {
        switch role {
        case .primary:
            return SettleTheme.controlStroke.opacity(0.72)
        case .secondary, .quiet:
            return SettleTheme.controlStroke
        case .destructive:
            return SettleTheme.destructive.opacity(0.28)
        }
    }
}

struct SettleMenuChip: View {
    var title: String
    var systemImage: String
    var alignment: Alignment = .center
    var isEnabled = true

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: SettleIcon.symbol(for: systemImage))
                .font(.caption.weight(.bold))
                .frame(width: 15)
            Text(title)
                .lineLimit(1)
                .minimumScaleFactor(0.82)
            Image(systemName: "chevron.up.chevron.down")
                .font(.caption2.weight(.bold))
                .foregroundStyle(SettleTheme.tertiaryText)
        }
        .font(.caption.weight(.bold))
        .foregroundStyle(SettleTheme.primary)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: alignment)
        .padding(.horizontal, 12)
        .background(SettleTheme.controlFill, in: Capsule())
        .overlay {
            Capsule().stroke(SettleTheme.controlStroke, lineWidth: 0.75)
        }
        .contentShape(Capsule())
        .opacity(isEnabled ? 1 : 0.45)
    }
}

struct SettleSegment<Value: Hashable>: Identifiable {
    var value: Value
    var title: String

    var id: Value { value }
}

struct SettleSegmentedControl<Value: Hashable>: View {
    @Binding var selection: Value
    var segments: [SettleSegment<Value>]
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        SettleControlSurface(
            shape: AnyShape(RoundedRectangle(cornerRadius: 13, style: .continuous)),
            fill: SettleTheme.controlTrackFill,
            stroke: SettleTheme.controlStroke.opacity(0.72)
        ) {
            HStack(spacing: 3) {
                ForEach(segments) { segment in
                    Button {
                        selection = segment.value
                    } label: {
                        Text(segment.title)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(selection == segment.value ? SettleTheme.primary : SettleTheme.mutedText)
                            .lineLimit(1)
                            .minimumScaleFactor(0.82)
                            .frame(maxWidth: .infinity, minHeight: 34)
                            .padding(.horizontal, 8)
                            .background {
                                if selection == segment.value {
                                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                                        .fill(SettleTheme.controlSelectedFill)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                    .contentShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
            }
            .padding(3)
        }
        .animation(reduceMotion ? .easeInOut(duration: 0.12) : .settleEaseFast, value: selection)
    }
}

struct SettleSearchField: View {
    var placeholder = "Search"
    @Binding var text: String
    var isFocused: FocusState<Bool>.Binding

    var body: some View {
        SettleControlSurface(
            shape: AnyShape(RoundedRectangle(cornerRadius: 14, style: .continuous)),
            fill: SettleTheme.controlFill,
            stroke: SettleTheme.controlStroke,
            focused: isFocused.wrappedValue
        ) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SettleTheme.mutedText)
                TextField(placeholder, text: $text)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .focused(isFocused)
                    .onSubmit { isFocused.wrappedValue = false }
                    .font(.subheadline)
                    .foregroundStyle(SettleTheme.primary)
            }
            .frame(minHeight: 44)
            .padding(.horizontal, 12)
        }
    }
}

struct SettleKeyboardDismissInstaller: UIViewRepresentable {
    var isEnabled: Bool
    var onDismiss: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.isUserInteractionEnabled = false
        DispatchQueue.main.async {
            context.coordinator.update(hostView: view, isEnabled: isEnabled, onDismiss: onDismiss)
        }
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            context.coordinator.update(hostView: uiView, isEnabled: isEnabled, onDismiss: onDismiss)
        }
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.remove()
    }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        private weak var installedWindow: UIWindow?
        private var recognizer: UITapGestureRecognizer?
        private var isEnabled = false
        private var onDismiss: (() -> Void)?

        func update(hostView: UIView, isEnabled: Bool, onDismiss: @escaping () -> Void) {
            self.isEnabled = isEnabled
            self.onDismiss = onDismiss

            guard let window = hostView.window else { return }
            if installedWindow !== window {
                remove()
                let recognizer = UITapGestureRecognizer(target: self, action: #selector(handleTap))
                recognizer.cancelsTouchesInView = false
                recognizer.delegate = self
                window.addGestureRecognizer(recognizer)
                installedWindow = window
                self.recognizer = recognizer
            }
        }

        func remove() {
            if let recognizer, let installedWindow {
                installedWindow.removeGestureRecognizer(recognizer)
            }
            recognizer = nil
            installedWindow = nil
        }

        @objc private func handleTap() {
            guard isEnabled else { return }
            onDismiss?()
        }

        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
            guard isEnabled else { return false }
            var view = touch.view
            while let current = view {
                if current is UIControl || current is UITextField || current is UITextView {
                    return false
                }
                view = current.superview
            }
            return true
        }
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
    var action: () -> Void

    var body: some View {
        SettleGlassButton(
            title: title,
            systemImage: systemImage,
            role: kind == .primary ? .primary : .secondary,
            action: action
        )
        .fixedSize(horizontal: true, vertical: false)
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
