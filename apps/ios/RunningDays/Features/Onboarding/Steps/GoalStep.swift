import SwiftUI

// MARK: - Goal Step
// Set initial yearly running days goal

struct GoalStep: View {
    @Binding var targetDays: Int
    let onContinue: () -> Void

    @State private var showContent = false

    private let minDays = 50
    private let maxDays = 365

    private var percentOfYear: Int {
        Int(Double(targetDays) / 365 * 100)
    }

    private var daysPerWeek: Double {
        Double(targetDays) / 52
    }

    var body: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            // Header
            VStack(spacing: Spacing.lg) {
                Text("Set Your Goal")
                    .font(AppFont.displayMedium)
                    .foregroundStyle(Color.textPrimary)

                Text("How many days do you want to run this year?")
                    .font(AppFont.bodyLarge)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .opacity(showContent ? 1 : 0)

            // Big number display
            VStack(spacing: Spacing.sm) {
                HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
                    Text("\(targetDays)")
                        .font(.system(size: 72, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.accentPrimary)
                        .contentTransition(.numericText())

                    Text("days")
                        .font(AppFont.displaySmall)
                        .foregroundStyle(Color.textSecondary)
                }

                Text("~\(String(format: "%.1f", daysPerWeek)) runs per week")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textMuted)
            }
            .opacity(showContent ? 1 : 0)
            .scaleEffect(showContent ? 1 : 0.9)

            // Slider
            VStack(spacing: Spacing.md) {
                Slider(
                    value: Binding(
                        get: { Double(targetDays) },
                        set: { targetDays = Int($0) }
                    ),
                    in: Double(minDays)...Double(maxDays),
                    step: 5
                ) { _ in
                    HapticFeedback.selection.trigger()
                }
                .tint(Color.accentPrimary)

                HStack {
                    Text("\(minDays)")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)

                    Spacer()

                    Text("\(percentOfYear)% of year")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textSecondary)

                    Spacer()

                    Text("\(maxDays)")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)
                }
            }
            .padding(.horizontal, Spacing.xl)
            .opacity(showContent ? 1 : 0)

            // Quick presets
            HStack(spacing: Spacing.md) {
                GoalPresetButton(value: 150, isSelected: targetDays == 150) {
                    withAnimation(.spring(response: 0.3)) {
                        targetDays = 150
                    }
                    HapticFeedback.light.trigger()
                }

                GoalPresetButton(value: 200, isSelected: targetDays == 200) {
                    withAnimation(.spring(response: 0.3)) {
                        targetDays = 200
                    }
                    HapticFeedback.light.trigger()
                }

                GoalPresetButton(value: 250, isSelected: targetDays == 250) {
                    withAnimation(.spring(response: 0.3)) {
                        targetDays = 250
                    }
                    HapticFeedback.light.trigger()
                }

                GoalPresetButton(value: 300, isSelected: targetDays == 300, recommended: true) {
                    withAnimation(.spring(response: 0.3)) {
                        targetDays = 300
                    }
                    HapticFeedback.light.trigger()
                }
            }
            .padding(.horizontal, Spacing.xl)
            .opacity(showContent ? 1 : 0)

            Spacer()

            // Continue button
            Button(action: onContinue) {
                Text("Continue")
                    .font(AppFont.labelLarge)
                    .foregroundStyle(Color.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.lg)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.xl)
                            .fill(Color.accentPrimary)
                    )
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxl)
            .opacity(showContent ? 1 : 0)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                showContent = true
            }
        }
    }
}

// MARK: - Goal Preset Button

private struct GoalPresetButton: View {
    let value: Int
    let isSelected: Bool
    var recommended: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: Spacing.xs) {
                Text("\(value)")
                    .font(AppFont.labelMedium)
                    .foregroundStyle(isSelected ? Color.white : Color.textSecondary)

                if recommended {
                    Text("rec")
                        .font(AppFont.captionSmall)
                        .foregroundStyle(isSelected ? Color.white.opacity(0.8) : Color.textMuted)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(isSelected ? Color.accentPrimary : Color.surfaceRaised)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(
                                isSelected ? Color.clear : Color.borderSubtle,
                                lineWidth: 1
                            )
                    )
            )
        }
    }
}

// MARK: - Preview

#Preview {
    GoalStep(
        targetDays: .constant(300),
        onContinue: {}
    )
    .background(Color.surfaceGround)
}
