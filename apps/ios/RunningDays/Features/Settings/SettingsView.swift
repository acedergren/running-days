import SwiftUI

// MARK: - Settings View
// Main settings screen with all configuration options

struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Spacing.md) {
                    // Profile Section
                    if viewModel.isAuthenticated {
                        profileSection
                    }

                    // Goal Section
                    SettingsSectionHeader(title: "Goal")
                    GoalSettingsView(
                        targetDays: $viewModel.targetDays,
                        isEditing: $viewModel.isEditingGoal,
                        year: viewModel.currentYear,
                        isSaving: viewModel.isSavingGoal,
                        onSave: { await viewModel.saveGoal() }
                    )

                    // HealthKit Section
                    SettingsSectionHeader(title: "Data")
                    HealthKitSection(
                        isAuthorized: $viewModel.isHealthKitAuthorized,
                        isSyncing: $viewModel.isSyncing,
                        lastSyncDate: viewModel.formattedLastSync,
                        onAuthorize: { await viewModel.requestHealthKitAuthorization() },
                        onSync: { await viewModel.syncHealthKit() }
                    )

                    // About Section
                    aboutSection

                    // Account Section
                    if viewModel.isAuthenticated {
                        accountSection
                    }

                    // Version Footer
                    versionFooter
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.md)
            }
            .background(Color.surfaceGround)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .task {
                await viewModel.loadSettings()
            }
            .alert("Sign Out", isPresented: $viewModel.showLogoutConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task { await viewModel.logout() }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .alert("Delete Account", isPresented: $viewModel.showDeleteAccountConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task { await viewModel.deleteAccount() }
                }
            } message: {
                Text("This action cannot be undone. All your data will be permanently deleted.")
            }
        }
    }

    // MARK: - Profile Section

    private var profileSection: some View {
        VStack(spacing: 0) {
            SettingsSectionHeader(title: "Profile")

            SettingsGroup {
                SettingsRow(
                    iconName: "person.fill",
                    iconColor: .accentSecondary,
                    title: "Email"
                ) {
                    Text(viewModel.userEmail)
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(1)
                }
            }
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        VStack(spacing: 0) {
            SettingsSectionHeader(title: "About")

            SettingsGroup {
                Button {
                    if let url = URL(string: "https://runningdays.app/privacy") {
                        openURL(url)
                    }
                } label: {
                    SettingsRow(
                        iconName: "hand.raised.fill",
                        iconColor: .accentTertiary,
                        title: "Privacy Policy"
                    ) {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.textMuted)
                    }
                }

                SettingsDivider()

                Button {
                    if let url = URL(string: "https://runningdays.app/terms") {
                        openURL(url)
                    }
                } label: {
                    SettingsRow(
                        iconName: "doc.text.fill",
                        iconColor: .accentTertiary,
                        title: "Terms of Service"
                    ) {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.textMuted)
                    }
                }

                SettingsDivider()

                Button {
                    if let url = URL(string: "mailto:support@runningdays.app") {
                        openURL(url)
                    }
                } label: {
                    SettingsRow(
                        iconName: "envelope.fill",
                        iconColor: .accentSecondary,
                        title: "Contact Support"
                    ) {
                        Image(systemName: "arrow.up.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.textMuted)
                    }
                }
            }
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        VStack(spacing: 0) {
            SettingsSectionHeader(title: "Account")

            SettingsGroup {
                Button {
                    HapticFeedback.warning.trigger()
                    viewModel.showLogoutConfirmation = true
                } label: {
                    SettingsRow(
                        iconName: "rectangle.portrait.and.arrow.right",
                        iconColor: .statusWarning,
                        title: "Sign Out"
                    ) {
                        EmptyView()
                    }
                }

                SettingsDivider()

                Button {
                    HapticFeedback.warning.trigger()
                    viewModel.showDeleteAccountConfirmation = true
                } label: {
                    SettingsRow(
                        iconName: "trash.fill",
                        iconColor: .statusError,
                        title: "Delete Account"
                    ) {
                        EmptyView()
                    }
                }
            }
        }
    }

    // MARK: - Version Footer

    private var versionFooter: some View {
        VStack(spacing: Spacing.xs) {
            Text("Running Days")
                .font(AppFont.caption)
                .foregroundStyle(Color.textMuted)

            Text("Version \(viewModel.appVersion) (\(viewModel.buildNumber))")
                .font(AppFont.captionSmall)
                .foregroundStyle(Color.textMuted.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Spacing.xl)
        .padding(.bottom, Spacing.xxl)
    }
}

// MARK: - Preview

#Preview {
    SettingsView()
}
