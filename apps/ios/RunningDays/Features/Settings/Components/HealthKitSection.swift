import SwiftUI

// MARK: - HealthKit Settings Section
// Displays HealthKit connection status and sync controls

struct HealthKitSection: View {
    @Binding var isAuthorized: Bool
    @Binding var isSyncing: Bool
    let lastSyncDate: String
    let onAuthorize: () async -> Void
    let onSync: () async -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Connection Status Row
            SettingsRow(
                iconName: "heart.fill",
                iconColor: .statusError,
                title: "Apple Health",
                trailing: {
                    HStack(spacing: Spacing.sm) {
                        Circle()
                            .fill(isAuthorized ? Color.statusSuccess : Color.textMuted)
                            .frame(width: 8, height: 8)

                        Text(isAuthorized ? "Connected" : "Not Connected")
                            .font(AppFont.bodyMedium)
                            .foregroundStyle(isAuthorized ? Color.statusSuccess : Color.textMuted)
                    }
                }
            )

            if isAuthorized {
                Divider()
                    .background(Color.borderSubtle)
                    .padding(.leading, 52)

                // Last Sync Row
                SettingsRow(
                    iconName: "arrow.triangle.2.circlepath",
                    iconColor: .accentSecondary,
                    title: "Last Sync",
                    trailing: {
                        Text(lastSyncDate)
                            .font(AppFont.bodyMedium)
                            .foregroundStyle(Color.textSecondary)
                    }
                )

                Divider()
                    .background(Color.borderSubtle)
                    .padding(.leading, 52)

                // Sync Now Button
                Button {
                    Task { await onSync() }
                } label: {
                    SettingsRow(
                        iconName: "arrow.clockwise",
                        iconColor: .accentPrimary,
                        title: "Sync Now",
                        trailing: {
                            if isSyncing {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(Color.accentPrimary)
                            } else {
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.textMuted)
                            }
                        }
                    )
                }
                .disabled(isSyncing)
            } else {
                Divider()
                    .background(Color.borderSubtle)
                    .padding(.leading, 52)

                // Connect Button
                Button {
                    Task { await onAuthorize() }
                } label: {
                    HStack {
                        Text("Connect HealthKit")
                            .font(AppFont.bodyMedium)
                            .foregroundStyle(Color.accentPrimary)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.textMuted)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                }
            }
        }
        .background(Color.surfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.xl))
    }
}

// MARK: - Preview

#Preview("Connected") {
    VStack(spacing: Spacing.lg) {
        HealthKitSection(
            isAuthorized: .constant(true),
            isSyncing: .constant(false),
            lastSyncDate: "Today, 2:30 PM",
            onAuthorize: {},
            onSync: {}
        )

        HealthKitSection(
            isAuthorized: .constant(false),
            isSyncing: .constant(false),
            lastSyncDate: "Never",
            onAuthorize: {},
            onSync: {}
        )
    }
    .padding()
    .background(Color.surfaceGround)
}
