#if os(iOS)
import SwiftUI

extension Animation {
    static let settleEaseFast = Animation.smooth(duration: 0.16)
    static let settleEaseState = Animation.smooth(duration: 0.28)
    static let settleEaseEntrance = Animation.smooth(duration: 0.48)
}

struct SettleGlass<Content: View>: View {
    var shape: AnyShape
    var interactive: Bool
    @ViewBuilder var content: Content

    init(
        shape: AnyShape = AnyShape(Capsule()),
        interactive: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.shape = shape
        self.interactive = interactive
        self.content = content()
    }

    var body: some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(interactive ? .regular.interactive() : .regular, in: shape)
        } else {
            content
                .background(.regularMaterial, in: shape)
        }
    }
}

struct AnyShape: Shape, @unchecked Sendable {
    private let pathBuilder: @Sendable (CGRect) -> Path

    init<S: Shape & Sendable>(_ shape: S) {
        self.pathBuilder = { rect in
            shape.path(in: rect)
        }
    }

    func path(in rect: CGRect) -> Path {
        pathBuilder(rect)
    }
}

struct MotionAwareModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var offset: CGFloat = 12
    var delay: Double = 0

    func body(content: Content) -> some View {
        content
            .transition(reduceMotion ? .opacity : .asymmetric(
                insertion: .opacity.combined(with: .move(edge: .bottom)),
                removal: .opacity
            ))
            .animation(reduceMotion ? .easeInOut(duration: 0.12) : .settleEaseEntrance.delay(delay), value: reduceMotion)
    }
}

extension View {
    func settleEntrance(delay: Double = 0) -> some View {
        modifier(MotionAwareModifier(delay: delay))
    }
}
#endif
