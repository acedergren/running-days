import SwiftUI

// MARK: - Animation System
// Timing curves and animations matching the web design system

enum AppAnimation {
    // MARK: - Ring Animations

    /// Ring fill animation: 1.2s with spring curve
    /// Used when progress ring animates to its value
    static let ringFill = Animation.spring(
        response: 1.2,
        dampingFraction: 0.65,
        blendDuration: 0
    )

    /// Breathing pulse: 3s infinite ease-in-out
    /// Used for the glowing end cap on the progress ring
    static let breathingPulse = Animation.easeInOut(duration: 3)
        .repeatForever(autoreverses: true)

    // MARK: - Entrance Animations

    /// Card entrance: 0.5s ease-out
    /// Used when cards appear on screen
    static let cardEntrance = Animation.easeOut(duration: 0.5)

    /// Staggered entrance delay
    /// Used to stagger multiple cards appearing
    static func staggeredEntrance(index: Int) -> Animation {
        cardEntrance.delay(Double(index) * 0.1)
    }

    // MARK: - Standard Transitions

    /// Fast: 150ms - Quick interactions
    static let fast = Animation.easeOut(duration: 0.15)

    /// Normal: 250ms - Standard transitions
    static let normal = Animation.easeOut(duration: 0.25)

    /// Slow: 400ms - Entrance animations
    static let slow = Animation.easeOut(duration: 0.4)

    // MARK: - Interactive Animations

    /// Spring for interactive elements (buttons, taps)
    static let interactive = Animation.spring(
        response: 0.3,
        dampingFraction: 0.7
    )

    /// Bounce for celebratory moments
    static let bounce = Animation.spring(
        response: 0.4,
        dampingFraction: 0.5
    )

    // MARK: - Easing Curves (for reference)
    // Web CSS: cubic-bezier(0.16, 1, 0.3, 1) -> SwiftUI .easeOut equivalent
    // Web CSS: cubic-bezier(0.65, 0, 0.35, 1) -> SwiftUI .easeInOut equivalent
}

// MARK: - View Modifiers

/// Modifier for breathing/pulsing effect
struct BreathingModifier: ViewModifier {
    @State private var scale: CGFloat = 1.0
    @State private var opacity: Double = 0.8

    let minScale: CGFloat
    let maxScale: CGFloat

    init(minScale: CGFloat = 1.0, maxScale: CGFloat = 1.1) {
        self.minScale = minScale
        self.maxScale = maxScale
    }

    func body(content: Content) -> some View {
        content
            .scaleEffect(scale)
            .opacity(opacity)
            .onAppear {
                withAnimation(AppAnimation.breathingPulse) {
                    scale = maxScale
                    opacity = 1.0
                }
            }
    }
}

/// Modifier for staggered card entrance
struct CardEntranceModifier: ViewModifier {
    let index: Int
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)
            .onAppear {
                withAnimation(AppAnimation.staggeredEntrance(index: index)) {
                    appeared = true
                }
            }
    }
}

/// Modifier for fade-in effect
struct FadeInModifier: ViewModifier {
    @State private var appeared = false
    let delay: Double

    init(delay: Double = 0) {
        self.delay = delay
    }

    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .onAppear {
                withAnimation(AppAnimation.normal.delay(delay)) {
                    appeared = true
                }
            }
    }
}

// MARK: - View Extensions

extension View {
    /// Apply breathing/pulsing animation
    func breathing(minScale: CGFloat = 1.0, maxScale: CGFloat = 1.1) -> some View {
        modifier(BreathingModifier(minScale: minScale, maxScale: maxScale))
    }

    /// Apply staggered card entrance animation
    func cardEntrance(index: Int = 0) -> some View {
        modifier(CardEntranceModifier(index: index))
    }

    /// Apply fade-in animation
    func fadeIn(delay: Double = 0) -> some View {
        modifier(FadeInModifier(delay: delay))
    }

    /// Apply press animation (scale down on press)
    func pressAnimation() -> some View {
        self.buttonStyle(PressButtonStyle())
    }
}

// MARK: - Button Styles

/// Button style that scales down slightly on press
struct PressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(AppAnimation.fast, value: configuration.isPressed)
    }
}

/// Button style for primary actions with scale and brightness
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .brightness(configuration.isPressed ? -0.05 : 0)
            .animation(AppAnimation.fast, value: configuration.isPressed)
    }
}
