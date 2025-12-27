import SwiftUI

// MARK: - Welcome Step
// First onboarding screen with brand intro

struct WelcomeStep: View {
    let onContinue: () -> Void

    @State private var showContent = false
    @State private var ringProgress: Double = 0

    var body: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            // Animated Logo/Ring
            ZStack {
                // Background glow
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.accentPrimary.opacity(0.2),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 60,
                            endRadius: 140
                        )
                    )
                    .frame(width: 280, height: 280)
                    .blur(radius: 20)

                // Progress ring
                Circle()
                    .stroke(Color.surfaceBase, lineWidth: 12)
                    .frame(width: 160, height: 160)

                Circle()
                    .trim(from: 0, to: ringProgress)
                    .stroke(
                        AngularGradient(
                            colors: [
                                Color.accentPrimary,
                                Color.accentPrimary.opacity(0.8),
                                Color.accentPrimary
                            ],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 12, lineCap: .round)
                    )
                    .frame(width: 160, height: 160)
                    .rotationEffect(.degrees(-90))

                // Center content
                VStack(spacing: Spacing.xs) {
                    Text("300")
                        .font(AppFont.displayLarge)
                        .foregroundStyle(Color.textPrimary)

                    Text("days")
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            .opacity(showContent ? 1 : 0)
            .scaleEffect(showContent ? 1 : 0.8)

            // Text content
            VStack(spacing: Spacing.lg) {
                Text("Running Days")
                    .font(AppFont.displayLarge)
                    .foregroundStyle(Color.textPrimary)

                Text("Track your daily running habit and build consistency toward your yearly goal.")
                    .font(AppFont.bodyLarge)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
            }
            .opacity(showContent ? 1 : 0)
            .offset(y: showContent ? 0 : 20)

            Spacer()

            // Continue button
            Button(action: onContinue) {
                Text("Get Started")
                    .font(AppFont.labelLarge)
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.xl)
                            .fill(Color.accentPrimary)
                    )
            }
            .opacity(showContent ? 1 : 0)
            .offset(y: showContent ? 0 : 20)
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxl)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                showContent = true
            }

            withAnimation(AppAnimation.ringFill.delay(0.3)) {
                ringProgress = 0.82
            }
        }
    }
}

// MARK: - Preview

#Preview {
    WelcomeStep(onContinue: {})
        .background(Color.surfaceGround)
}
