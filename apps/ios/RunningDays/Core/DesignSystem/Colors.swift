import SwiftUI

// MARK: - Design System Colors
// Translated from OKLCH color space (apps/web/src/app.css)
// Running Days uses a dark mode theme with orange/coral accents

extension Color {
    // MARK: - Accent Colors (oklch(0.72 0.2 25) -> Orange/Coral)
    static let accentPrimary = Color(red: 1.0, green: 0.42, blue: 0.21)
    static let accentPrimaryHover = Color(red: 1.0, green: 0.55, blue: 0.35)
    static let accentPrimaryActive = Color(red: 0.92, green: 0.38, blue: 0.18)

    // MARK: - Neutral Scale (Warm undertone, hue 60)
    static let neutral50 = Color(red: 0.98, green: 0.97, blue: 0.96)
    static let neutral100 = Color(red: 0.96, green: 0.95, blue: 0.94)
    static let neutral200 = Color(red: 0.90, green: 0.89, blue: 0.87)
    static let neutral300 = Color(red: 0.80, green: 0.78, blue: 0.76)
    static let neutral400 = Color(red: 0.65, green: 0.63, blue: 0.61)
    static let neutral500 = Color(red: 0.50, green: 0.48, blue: 0.46)
    static let neutral600 = Color(red: 0.40, green: 0.38, blue: 0.36)
    static let neutral700 = Color(red: 0.30, green: 0.28, blue: 0.26)
    static let neutral800 = Color(red: 0.20, green: 0.18, blue: 0.17)
    static let neutral850 = Color(red: 0.15, green: 0.14, blue: 0.13)
    static let neutral900 = Color(red: 0.12, green: 0.11, blue: 0.10)
    static let neutral950 = Color(red: 0.08, green: 0.07, blue: 0.06)
    static let neutral1000 = Color(red: 0.05, green: 0.04, blue: 0.04)

    // MARK: - Surface Tokens (Dark mode hierarchy)
    static let surfaceGround = neutral1000   // Darkest - app background
    static let surfaceBase = neutral950      // Base layer
    static let surfaceRaised = neutral900    // Cards, containers
    static let surfaceOverlay = neutral850   // Modals, popovers
    static let surfaceElevated = neutral800  // Highest priority surfaces

    // MARK: - Text Tokens
    static let textPrimary = neutral50
    static let textSecondary = neutral300
    static let textMuted = neutral400
    static let textDisabled = neutral500

    // MARK: - Border Tokens
    static let borderSubtle = neutral700.opacity(0.4)
    static let borderDefault = neutral600.opacity(0.5)
    static let borderStrong = neutral500.opacity(0.6)

    // MARK: - Status Colors
    static let success = Color(red: 0.45, green: 0.85, blue: 0.50)       // oklch(0.72 0.2 145)
    static let successMuted = success.opacity(0.3)
    static let warning = Color(red: 0.95, green: 0.78, blue: 0.30)       // oklch(0.82 0.18 85)
    static let warningMuted = warning.opacity(0.3)
    static let error = Color(red: 0.90, green: 0.35, blue: 0.25)         // oklch(0.65 0.25 25)
    static let errorMuted = error.opacity(0.3)

    // MARK: - Gradients
    static var gradientAccent: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 1.0, green: 0.48, blue: 0.28),   // oklch(0.72 0.22 30)
                Color(red: 0.88, green: 0.35, blue: 0.18)  // oklch(0.65 0.2 15)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var gradientAccentHover: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 1.0, green: 0.55, blue: 0.35),
                Color(red: 0.92, green: 0.42, blue: 0.22)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // Angular gradient for progress ring
    static var ringGradient: AngularGradient {
        AngularGradient(
            colors: [
                Color(red: 1.0, green: 0.55, blue: 0.35),   // Lighter orange
                accentPrimary,                              // Primary orange
                Color(red: 0.88, green: 0.35, blue: 0.18)  // Deeper coral
            ],
            center: .center,
            startAngle: .degrees(0),
            endAngle: .degrees(360)
        )
    }

    // MARK: - Glow Effects
    static let accentGlow = accentPrimary.opacity(0.4)

    // Ambient glow for progress ring
    static var ambientGlow: RadialGradient {
        RadialGradient(
            colors: [accentPrimary.opacity(0.5), .clear],
            center: .center,
            startRadius: 0,
            endRadius: 150
        )
    }
}

// MARK: - ShapeStyle Extensions

extension ShapeStyle where Self == Color {
    static var accentPrimary: Color { .accentPrimary }
    static var surfaceGround: Color { .surfaceGround }
    static var surfaceRaised: Color { .surfaceRaised }
    static var textPrimary: Color { .textPrimary }
    static var textSecondary: Color { .textSecondary }
}
