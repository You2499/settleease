import Foundation

public enum SettleHapticEvent: Sendable {
    case settlementRecorded
    case receiptParsed
    case validationWarning
    case destructiveConfirmation
}

public protocol HapticsProviding: Sendable {
    @MainActor
    func play(_ event: SettleHapticEvent)
}

public struct NoopHapticsService: HapticsProviding {
    public init() {}
    @MainActor
    public func play(_ event: SettleHapticEvent) {}
}

#if canImport(UIKit)
import UIKit

public struct HapticsService: HapticsProviding {
    public init() {}

    @MainActor
    public func play(_ event: SettleHapticEvent) {
        switch event {
        case .settlementRecorded, .receiptParsed:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .validationWarning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .destructiveConfirmation:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }
    }
}
#endif
