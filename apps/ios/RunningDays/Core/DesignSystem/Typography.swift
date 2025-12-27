import SwiftUI

// MARK: - Typography System
// Uses SF Pro family as iOS-native equivalent to the web's Inter/Space Grotesk
// SF Pro Rounded for display numbers, SF Mono for pace/time displays

struct AppFont {
    // MARK: - Font Builders

    /// Body text - SF Pro (system default)
    static func body(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    /// Display text - SF Pro Rounded (similar feel to Space Grotesk)
    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    /// Monospace text - SF Mono (for pace, time displays)
    static func mono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    // MARK: - Predefined Sizes (matching web design system)

    /// Hero number: Large progress count (64pt, bold, rounded)
    static let heroNumber = display(64, weight: .bold)

    /// Stat value: Key statistics in cards (32pt, bold, rounded)
    static let statValue = display(32, weight: .bold)

    /// Stat label: Card labels, uppercase (12pt, medium)
    static let statLabel = body(12, weight: .medium)

    /// Stat unit: Unit text like "km", "min" (14pt, medium)
    static let statUnit = body(14, weight: .medium)

    /// Section header: Section titles (14pt, semibold)
    static let sectionHeader = body(14, weight: .semibold)

    /// Body large: Primary body text (17pt)
    static let bodyLarge = body(17)

    /// Body medium: Secondary body text (15pt)
    static let bodyMedium = body(15)

    /// Caption: Small text, metadata (13pt)
    static let caption = body(13)

    /// Caption small: Very small text (11pt)
    static let captionSmall = body(11)

    /// Pace badge: Pace display like "5:42" (20pt, semibold, mono)
    static let paceBadge = mono(20, weight: .semibold)

    /// Status pill: Badge text (13pt, semibold)
    static let statusPill = body(13, weight: .semibold)
}

// MARK: - View Modifiers

extension View {
    /// Apply tabular (monospaced) numbers for aligned numeric displays
    func tabularNumbers() -> some View {
        self.monospacedDigit()
    }

    /// Apply uppercase with letter spacing for labels
    func labelStyle() -> some View {
        self
            .textCase(.uppercase)
            .tracking(0.5)
    }

    /// Apply negative letter spacing for large display numbers
    func displayStyle() -> some View {
        self.tracking(-1)
    }
}

// MARK: - Text Styles

extension Text {
    /// Style for hero numbers (large progress count)
    func heroStyle() -> Text {
        self
            .font(AppFont.heroNumber)
            .foregroundStyle(Color.textPrimary)
    }

    /// Style for stat values in cards
    func statValueStyle(accent: Bool = false) -> Text {
        self
            .font(AppFont.statValue)
            .foregroundStyle(accent ? Color.accentPrimary : Color.textPrimary)
    }

    /// Style for stat labels (uppercase)
    func statLabelStyle() -> Text {
        self
            .font(AppFont.statLabel)
            .foregroundStyle(Color.textMuted)
    }

    /// Style for pace badges
    func paceBadgeStyle() -> Text {
        self
            .font(AppFont.paceBadge)
            .foregroundStyle(Color.accentPrimary)
    }
}
