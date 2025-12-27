import SwiftUI

// MARK: - Settings Row
// Reusable row component for settings lists

struct SettingsRow<Trailing: View>: View {
    let iconName: String
    let iconColor: Color
    let title: String
    let trailing: Trailing

    init(
        iconName: String,
        iconColor: Color,
        title: String,
        @ViewBuilder trailing: () -> Trailing
    ) {
        self.iconName = iconName
        self.iconColor = iconColor
        self.title = title
        self.trailing = trailing()
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(iconColor.opacity(0.15))
                    .frame(width: 28, height: 28)

                Image(systemName: iconName)
                    .font(.system(size: 14))
                    .foregroundStyle(iconColor)
            }

            // Title
            Text(title)
                .font(AppFont.bodyMedium)
                .foregroundStyle(Color.textPrimary)

            Spacer()

            // Trailing content
            trailing
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.md)
        .contentShape(Rectangle())
    }
}

// MARK: - Simple Trailing Variants

extension SettingsRow where Trailing == EmptyView {
    init(
        iconName: String,
        iconColor: Color,
        title: String
    ) {
        self.iconName = iconName
        self.iconColor = iconColor
        self.title = title
        self.trailing = EmptyView()
    }
}

// MARK: - Settings Section Header

struct SettingsSectionHeader: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(AppFont.caption)
            .foregroundStyle(Color.textMuted)
            .tracking(0.5)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.lg)
            .padding(.bottom, Spacing.sm)
    }
}

// MARK: - Settings Group

struct SettingsGroup<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        VStack(spacing: 0) {
            content
        }
        .background(Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.xl))
    }
}

// MARK: - Divider for Settings

struct SettingsDivider: View {
    var body: some View {
        Divider()
            .background(Color.borderSubtle)
            .padding(.leading, 52)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: Spacing.lg) {
        SettingsSectionHeader(title: "Account")

        SettingsGroup {
            SettingsRow(
                iconName: "person.fill",
                iconColor: .accentSecondary,
                title: "Profile"
            ) {
                Text("john@example.com")
                    .font(AppFont.bodyMedium)
                    .foregroundStyle(Color.textSecondary)
            }

            SettingsDivider()

            SettingsRow(
                iconName: "bell.fill",
                iconColor: .statusWarning,
                title: "Notifications"
            ) {
                Toggle("", isOn: .constant(true))
                    .labelsHidden()
                    .tint(Color.accentPrimary)
            }
        }
    }
    .padding()
    .background(Color.surfaceGround)
}
