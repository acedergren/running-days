import SwiftUI

// MARK: - Spacing System
// Consistent spacing scale matching the web design system

enum Spacing {
    /// 4pt - Extra small spacing
    static let xs: CGFloat = 4

    /// 8pt - Small spacing
    static let sm: CGFloat = 8

    /// 12pt - Medium spacing
    static let md: CGFloat = 12

    /// 16pt - Large spacing (default)
    static let lg: CGFloat = 16

    /// 24pt - Extra large spacing
    static let xl: CGFloat = 24

    /// 32pt - 2x large spacing
    static let xxl: CGFloat = 32

    /// 48pt - 3x large spacing
    static let xxxl: CGFloat = 48

    /// 64pt - 4x large spacing
    static let xxxxl: CGFloat = 64
}

// MARK: - Corner Radius

enum CornerRadius {
    /// 4pt - Small elements
    static let sm: CGFloat = 4

    /// 8pt - Badges, pills
    static let md: CGFloat = 8

    /// 12pt - Default corners
    static let lg: CGFloat = 12

    /// 16pt - Cards, larger elements
    static let xl: CGFloat = 16

    /// 20pt - Large cards
    static let xxl: CGFloat = 20

    /// 24pt - Very large elements
    static let xxxl: CGFloat = 24

    /// Full circle/pill shape
    static let full: CGFloat = 9999
}

// MARK: - Component Sizes

enum ComponentSize {
    /// Progress ring sizes
    enum ProgressRing {
        static let small: CGFloat = 80
        static let medium: CGFloat = 140
        static let large: CGFloat = 200
        static let hero: CGFloat = 280

        static let strokeSmall: CGFloat = 8
        static let strokeMedium: CGFloat = 10
        static let strokeLarge: CGFloat = 12
        static let strokeHero: CGFloat = 14
    }

    /// Button sizes
    enum Button {
        static let small: CGFloat = 32
        static let medium: CGFloat = 40
        static let large: CGFloat = 48
        static let icon: CGFloat = 40
    }

    /// Icon sizes
    enum Icon {
        static let small: CGFloat = 16
        static let medium: CGFloat = 20
        static let large: CGFloat = 24
        static let xlarge: CGFloat = 32
    }
}

// MARK: - View Extensions

extension View {
    /// Apply standard card padding
    func cardPadding() -> some View {
        self.padding(Spacing.lg)
    }

    /// Apply standard screen padding
    func screenPadding() -> some View {
        self.padding(.horizontal, Spacing.lg)
    }

    /// Apply section spacing
    func sectionSpacing() -> some View {
        self.padding(.vertical, Spacing.xl)
    }
}
