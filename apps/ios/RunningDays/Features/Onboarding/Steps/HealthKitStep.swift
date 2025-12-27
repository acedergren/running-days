import SwiftUI

// MARK: - HealthKit Step
// Request HealthKit permissions with explanation

struct HealthKitStep: View {
    let isAuthorized: Bool
    let isRequesting: Bool
    let onConnect: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            // Icon
            ZStack {
                Circle()
                    .fill(Color.statusError.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: "heart.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.statusError)
            }

            // Content
            VStack(spacing: Spacing.lg) {
                Text("Connect Apple Health")
                    .font(AppFont.displayMedium)
                    .foregroundStyle(Color.textPrimary)

                Text("Automatically sync your running workouts from Apple Health. We only read workout data - we never write to your health records.")
                    .font(AppFont.bodyLarge)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }

            // Benefits list
            VStack(alignment: .leading, spacing: Spacing.md) {
                BenefitRow(
                    iconName: "arrow.triangle.2.circlepath",
                    text: "Automatic workout sync"
                )

                BenefitRow(
                    iconName: "bell.badge",
                    text: "Real-time progress updates"
                )

                BenefitRow(
                    iconName: "lock.shield",
                    text: "Private & secure"
                )
            }
            .padding(.horizontal, Spacing.xl)

            Spacer()

            // Buttons
            VStack(spacing: Spacing.md) {
                if isAuthorized {
                    // Success state
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Color.statusSuccess)

                        Text("Connected!")
                            .font(AppFont.labelMedium)
                            .foregroundStyle(Color.statusSuccess)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.xl)
                            .fill(Color.statusSuccess.opacity(0.15))
                    )
                } else {
                    // Connect button
                    Button(action: onConnect) {
                        HStack(spacing: Spacing.sm) {
                            if isRequesting {
                                ProgressView()
                                    .scaleEffect(0.9)
                                    .tint(.white)
                            } else {
                                Image(systemName: "heart.fill")
                            }

                            Text(isRequesting ? "Connecting..." : "Connect HealthKit")
                        }
                        .font(AppFont.labelLarge)
                        .foregroundStyle(Color.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.lg)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xl)
                                .fill(Color.statusError)
                        )
                    }
                    .disabled(isRequesting)

                    // Skip button
                    Button(action: onSkip) {
                        Text("Skip for now")
                            .font(AppFont.labelMedium)
                            .foregroundStyle(Color.textMuted)
                    }
                    .disabled(isRequesting)
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxl)
        }
    }
}

// MARK: - Benefit Row

private struct BenefitRow: View {
    let iconName: String
    let text: String

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: iconName)
                .font(.system(size: 16))
                .foregroundStyle(Color.accentPrimary)
                .frame(width: 24)

            Text(text)
                .font(AppFont.bodyMedium)
                .foregroundStyle(Color.textSecondary)
        }
    }
}

// MARK: - Preview

#Preview("Default") {
    HealthKitStep(
        isAuthorized: false,
        isRequesting: false,
        onConnect: {},
        onSkip: {}
    )
    .background(Color.surfaceGround)
}

#Preview("Authorized") {
    HealthKitStep(
        isAuthorized: true,
        isRequesting: false,
        onConnect: {},
        onSkip: {}
    )
    .background(Color.surfaceGround)
}
