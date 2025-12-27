import UIKit

// MARK: - Haptic Feedback
// Convenience wrapper for iOS haptic feedback

enum HapticFeedback {
    case light
    case medium
    case heavy
    case success
    case warning
    case error
    case selection

    func trigger() {
        switch self {
        case .light:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case .medium:
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case .heavy:
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case .success:
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case .warning:
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case .error:
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        case .selection:
            UISelectionFeedbackGenerator().selectionChanged()
        }
    }
}

// MARK: - View Modifier

import SwiftUI

extension View {
    /// Trigger haptic feedback when a value changes
    func hapticFeedback(_ type: HapticFeedback, trigger: Bool) -> some View {
        self.onChange(of: trigger) { _, newValue in
            if newValue {
                type.trigger()
            }
        }
    }

    /// Trigger haptic feedback on tap
    func hapticOnTap(_ type: HapticFeedback = .light) -> some View {
        self.onTapGesture {
            type.trigger()
        }
    }
}
