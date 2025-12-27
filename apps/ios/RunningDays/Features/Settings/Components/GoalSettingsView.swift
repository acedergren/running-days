import SwiftUI

// MARK: - Goal Settings View
// Inline editing for yearly running days goal

struct GoalSettingsView: View {
    @Binding var targetDays: Int
    @Binding var isEditing: Bool
    let year: Int
    let isSaving: Bool
    let onSave: () async -> Void

    // Local editing state
    @State private var editingValue: Int = 0

    private let minDays = 50
    private let maxDays = 365

    var body: some View {
        VStack(spacing: 0) {
            if isEditing {
                editingView
            } else {
                displayView
            }
        }
        .background(Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.xl))
        .onChange(of: isEditing) { _, newValue in
            if newValue {
                editingValue = targetDays
            }
        }
    }

    // MARK: - Display View

    private var displayView: some View {
        Button {
            HapticFeedback.light.trigger()
            isEditing = true
        } label: {
            SettingsRow(
                iconName: "target",
                iconColor: .accentPrimary,
                title: "\(year) Goal",
                trailing: {
                    HStack(spacing: Spacing.sm) {
                        Text("\(targetDays) days")
                            .font(AppFont.bodyMedium)
                            .foregroundStyle(Color.textSecondary)

                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.textMuted)
                    }
                }
            )
        }
    }

    // MARK: - Editing View

    private var editingView: some View {
        VStack(spacing: Spacing.lg) {
            // Header
            HStack {
                Image(systemName: "target")
                    .font(.system(size: 16))
                    .foregroundStyle(Color.accentPrimary)
                    .frame(width: 28)

                Text("Set Your \(year) Goal")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textPrimary)

                Spacer()
            }

            // Value display
            HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                Text("\(editingValue)")
                    .font(AppFont.displayLarge)
                    .foregroundStyle(Color.textPrimary)
                    .contentTransition(.numericText())

                Text("running days")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textSecondary)
            }

            // Slider
            VStack(spacing: Spacing.sm) {
                Slider(
                    value: Binding(
                        get: { Double(editingValue) },
                        set: { editingValue = Int($0) }
                    ),
                    in: Double(minDays)...Double(maxDays),
                    step: 5
                )
                .tint(Color.accentPrimary)

                // Labels
                HStack {
                    Text("\(minDays)")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)

                    Spacer()

                    Text("~\(Int(Double(editingValue) / 365 * 100))% of year")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textSecondary)

                    Spacer()

                    Text("\(maxDays)")
                        .font(AppFont.caption)
                        .foregroundStyle(Color.textMuted)
                }
            }

            // Quick presets
            HStack(spacing: Spacing.md) {
                PresetButton(value: 150, isSelected: editingValue == 150) {
                    editingValue = 150
                    HapticFeedback.selection.trigger()
                }

                PresetButton(value: 200, isSelected: editingValue == 200) {
                    editingValue = 200
                    HapticFeedback.selection.trigger()
                }

                PresetButton(value: 250, isSelected: editingValue == 250) {
                    editingValue = 250
                    HapticFeedback.selection.trigger()
                }

                PresetButton(value: 300, isSelected: editingValue == 300) {
                    editingValue = 300
                    HapticFeedback.selection.trigger()
                }
            }

            // Actions
            HStack(spacing: Spacing.md) {
                Button("Cancel") {
                    HapticFeedback.light.trigger()
                    isEditing = false
                }
                .buttonStyle(SecondaryButtonStyle())

                Button {
                    targetDays = editingValue
                    Task { await onSave() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .scaleEffect(0.8)
                            .tint(.white)
                    } else {
                        Text("Save")
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(isSaving)
            }
        }
        .padding(Spacing.lg)
    }
}

// MARK: - Preset Button

private struct PresetButton: View {
    let value: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text("\(value)")
                .font(AppFont.caption)
                .foregroundStyle(isSelected ? Color.white : Color.textSecondary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .fill(isSelected ? Color.accentPrimary : Color.surfaceBase)
                )
        }
    }
}

// MARK: - Button Styles

private struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppFont.labelMedium)
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(Color.accentPrimary)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}

private struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(AppFont.labelMedium)
            .foregroundStyle(Color.textSecondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(Color.surfaceBase)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
    }
}

// MARK: - Preview

#Preview("Display Mode") {
    GoalSettingsView(
        targetDays: .constant(300),
        isEditing: .constant(false),
        year: 2024,
        isSaving: false,
        onSave: {}
    )
    .padding()
    .background(Color.surfaceGround)
}

#Preview("Editing Mode") {
    GoalSettingsView(
        targetDays: .constant(300),
        isEditing: .constant(true),
        year: 2024,
        isSaving: false,
        onSave: {}
    )
    .padding()
    .background(Color.surfaceGround)
}
