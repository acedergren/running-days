import SwiftUI

// MARK: - Progress Ring View
// Circular progress indicator matching the web design
// Features: gradient stroke, ambient glow, breathing end cap

struct ProgressRingView: View {
    // MARK: - Properties

    /// Progress value (0-100)
    let value: Double

    /// Ring diameter
    let size: CGFloat

    /// Stroke width
    let strokeWidth: CGFloat

    /// Optional center label (defaults to progress value)
    let label: String?

    /// Optional sublabel below the main label
    let sublabel: String?

    /// Whether to animate on appear
    let animate: Bool

    // MARK: - State

    @State private var animatedProgress: Double = 0

    // MARK: - Computed Properties

    private var progress: Double {
        min(max(value, 0), 100)
    }

    private var radius: CGFloat {
        (size - strokeWidth) / 2
    }

    // End cap position (in radians, starting from top)
    private var endCapAngle: Angle {
        .degrees(animatedProgress / 100 * 360 - 90)
    }

    private var endCapOffset: CGPoint {
        let angle = endCapAngle.radians
        return CGPoint(
            x: cos(angle) * radius,
            y: sin(angle) * radius
        )
    }

    // MARK: - Initializer

    init(
        value: Double,
        size: CGFloat = 200,
        strokeWidth: CGFloat = 14,
        label: String? = nil,
        sublabel: String? = nil,
        animate: Bool = true
    ) {
        self.value = value
        self.size = size
        self.strokeWidth = strokeWidth
        self.label = label
        self.sublabel = sublabel
        self.animate = animate
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            // Ambient glow layer
            ambientGlowLayer

            // Ring layers
            ZStack {
                // Background track
                backgroundTrack

                // Inner highlight track
                innerHighlight

                // Progress arc with gradient
                progressArc

                // Breathing end cap
                if animatedProgress > 2 {
                    endCap
                }
            }
            .frame(width: size, height: size)

            // Center label
            centerLabel
        }
        .frame(width: size * 1.3, height: size * 1.3)
        .onAppear {
            if animate {
                withAnimation(AppAnimation.ringFill) {
                    animatedProgress = progress
                }
            } else {
                animatedProgress = progress
            }
        }
        .onChange(of: value) { _, newValue in
            let clampedValue = min(max(newValue, 0), 100)
            withAnimation(AppAnimation.normal) {
                animatedProgress = clampedValue
            }
        }
    }

    // MARK: - Subviews

    private var ambientGlowLayer: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [
                        Color.accentPrimary.opacity(0.5),
                        Color.clear
                    ],
                    center: .center,
                    startRadius: 0,
                    endRadius: size / 2
                )
            )
            .frame(width: size * 1.3, height: size * 1.3)
            .blur(radius: 30)
            .opacity(0.4)
    }

    private var backgroundTrack: some View {
        Circle()
            .stroke(
                Color(red: 0.2, green: 0.15, blue: 0.12).opacity(0.4),
                style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round)
            )
            .frame(width: size - strokeWidth, height: size - strokeWidth)
    }

    private var innerHighlight: some View {
        Circle()
            .stroke(
                Color(red: 0.15, green: 0.12, blue: 0.10).opacity(0.3),
                lineWidth: 1
            )
            .frame(
                width: size - strokeWidth * 2 - 4,
                height: size - strokeWidth * 2 - 4
            )
    }

    private var progressArc: some View {
        Circle()
            .trim(from: 0, to: animatedProgress / 100)
            .stroke(
                progressGradient,
                style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round)
            )
            .frame(width: size - strokeWidth, height: size - strokeWidth)
            .rotationEffect(.degrees(-90))
            .shadow(color: Color.accentPrimary.opacity(0.6), radius: 8, x: 0, y: 0)
    }

    private var progressGradient: AngularGradient {
        AngularGradient(
            colors: [
                Color(red: 1.0, green: 0.55, blue: 0.35),    // oklch(0.78 0.22 35)
                Color.accentPrimary,                         // oklch(0.72 0.24 25)
                Color(red: 0.88, green: 0.38, blue: 0.18)   // oklch(0.65 0.20 15)
            ],
            center: .center,
            startAngle: .degrees(0),
            endAngle: .degrees(360)
        )
    }

    private var endCap: some View {
        Circle()
            .fill(Color(red: 0.95, green: 0.75, blue: 0.55))  // oklch(0.9 0.15 30)
            .frame(width: strokeWidth - 2, height: strokeWidth - 2)
            .offset(x: endCapOffset.x, y: endCapOffset.y)
            .opacity(0.8)
            .breathing(minScale: 0.9, maxScale: 1.1)
    }

    private var centerLabel: some View {
        VStack(spacing: 4) {
            Text(label ?? "\(Int(animatedProgress))")
                .font(AppFont.heroNumber)
                .foregroundStyle(Color.textPrimary)
                .tabularNumbers()
                .displayStyle()

            if let sublabel {
                Text(sublabel)
                    .font(AppFont.caption)
                    .foregroundStyle(Color.textMuted)
            }
        }
    }
}

// MARK: - Preview

#Preview("Progress Ring - 75%") {
    ZStack {
        Color.surfaceGround.ignoresSafeArea()

        ProgressRingView(
            value: 75,
            size: 280,
            strokeWidth: 14,
            label: "225",
            sublabel: "of 300 days"
        )
    }
}

#Preview("Progress Ring - Small") {
    ZStack {
        Color.surfaceGround.ignoresSafeArea()

        ProgressRingView(
            value: 50,
            size: 100,
            strokeWidth: 8
        )
    }
}

#Preview("Progress Ring - Full") {
    ZStack {
        Color.surfaceGround.ignoresSafeArea()

        ProgressRingView(
            value: 100,
            size: 200,
            strokeWidth: 12,
            label: "300",
            sublabel: "Goal achieved!"
        )
    }
}
