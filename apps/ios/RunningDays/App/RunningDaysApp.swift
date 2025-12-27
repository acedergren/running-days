import SwiftUI
import WidgetKit

// MARK: - Running Days App
// Main entry point for the iOS application

@main
struct RunningDaysApp: App {
    // MARK: - App Delegate

    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    // MARK: - State

    @State private var authService = AuthService.shared
    @State private var healthKitManager = HealthKitManager.shared

    // MARK: - Body

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)  // Force dark mode to match design
                .environment(authService)
                .environment(healthKitManager)
        }
    }
}

// MARK: - Content View

struct ContentView: View {
    @Environment(AuthService.self) private var authService
    @State private var showOnboarding = false

    var body: some View {
        Group {
            if authService.isAuthenticated {
                MainTabView()
            } else {
                // Check if user has completed onboarding before
                if UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") {
                    // Show simple login (they've seen onboarding before)
                    QuickLoginView()
                } else {
                    // First time user - show full onboarding
                    OnboardingView()
                }
            }
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie.fill")
                }
                .tag(0)

            InsightsView()
                .tabItem {
                    Label("Insights", systemImage: "chart.xyaxis.line")
                }
                .tag(1)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .tint(Color.accentPrimary)
    }
}

// MARK: - Quick Login View
// Simplified login for returning users who've completed onboarding

struct QuickLoginView: View {
    @Environment(AuthService.self) private var authService

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var showOnboarding = false

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xxl) {
                Spacer()

                // Logo/Title
                VStack(spacing: Spacing.lg) {
                    ZStack {
                        Circle()
                            .fill(Color.accentPrimary.opacity(0.15))
                            .frame(width: 100, height: 100)

                        Image(systemName: "figure.run")
                            .font(.system(size: 44))
                            .foregroundStyle(Color.accentPrimary)
                    }

                    Text("Running Days")
                        .font(AppFont.displayLarge)
                        .foregroundStyle(Color.textPrimary)

                    Text("Welcome back!")
                        .font(AppFont.bodyMedium)
                        .foregroundStyle(Color.textSecondary)
                }

                Spacer()

                // Login form
                VStack(spacing: Spacing.lg) {
                    // Email field
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Email")
                            .font(AppFont.caption)
                            .foregroundStyle(Color.textMuted)

                        TextField("your@email.com", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .font(AppFont.bodyMedium)
                            .padding(Spacing.lg)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .fill(Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                                            .stroke(Color.borderSubtle, lineWidth: 1)
                                    )
                            )
                    }

                    // Password field
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Password")
                            .font(AppFont.caption)
                            .foregroundStyle(Color.textMuted)

                        SecureField("••••••••", text: $password)
                            .textContentType(.password)
                            .font(AppFont.bodyMedium)
                            .padding(Spacing.lg)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .fill(Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                                            .stroke(Color.borderSubtle, lineWidth: 1)
                                    )
                            )
                    }

                    if let error {
                        Text(error)
                            .font(AppFont.caption)
                            .foregroundStyle(Color.statusError)
                    }

                    // Sign in button
                    Button {
                        login()
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            if isLoading {
                                ProgressView()
                                    .scaleEffect(0.9)
                                    .tint(.white)
                            }

                            Text("Sign In")
                        }
                        .font(AppFont.labelLarge)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.lg)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.xl)
                                .fill(Color.accentPrimary)
                        )
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1.0)

                    // Create account button
                    Button {
                        // Reset onboarding flag to show full flow
                        UserDefaults.standard.set(false, forKey: "hasCompletedOnboarding")
                        showOnboarding = true
                    } label: {
                        Text("Create new account")
                            .font(AppFont.bodyMedium)
                            .foregroundStyle(Color.textMuted)
                    }
                }
                .padding(.horizontal, Spacing.xl)

                Spacer()
            }
            .background(Color.surfaceGround)
            .fullScreenCover(isPresented: $showOnboarding) {
                OnboardingView()
            }
        }
    }

    @MainActor
    private func login() {
        isLoading = true
        error = nil

        Task { @MainActor in
            do {
                try await authService.login(email: email, password: password)
                HapticFeedback.success.trigger()
            } catch {
                self.error = error.localizedDescription
                HapticFeedback.error.trigger()
            }
            isLoading = false
        }
    }
}
