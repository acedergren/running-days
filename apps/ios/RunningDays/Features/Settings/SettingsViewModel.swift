import SwiftUI
import Observation

// MARK: - Settings View Model
// Manages settings screen state and user preferences

@Observable
final class SettingsViewModel {
    // MARK: - Dependencies

    private let authService: AuthService
    private let healthKitManager: HealthKitManager
    private let apiClient: APIClient

    // MARK: - User State

    var userEmail: String = ""
    var isAuthenticated: Bool = false

    // MARK: - Goal Settings

    var targetDays: Int = 300
    var currentYear: Int = Calendar.current.component(.year, from: Date())
    var isEditingGoal: Bool = false
    var isSavingGoal: Bool = false

    // MARK: - HealthKit State

    var isHealthKitAuthorized: Bool = false
    var lastSyncDate: Date?
    var isSyncing: Bool = false

    // MARK: - UI State

    var showLogoutConfirmation: Bool = false
    var showDeleteAccountConfirmation: Bool = false
    var error: Error?

    // MARK: - App Info

    var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }

    var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }

    // MARK: - Initialization

    init(
        authService: AuthService = .shared,
        healthKitManager: HealthKitManager = .shared,
        apiClient: APIClient = .shared
    ) {
        self.authService = authService
        self.healthKitManager = healthKitManager
        self.apiClient = apiClient
    }

    // MARK: - Load Data

    @MainActor
    func loadSettings() async {
        // Load auth state
        isAuthenticated = authService.isAuthenticated
        userEmail = authService.currentUserEmail ?? ""

        // Load HealthKit state
        isHealthKitAuthorized = healthKitManager.isAuthorized
        lastSyncDate = healthKitManager.lastSyncDate

        // Load goal from API
        do {
            let progress = try await apiClient.fetchGoalProgress(year: currentYear)
            targetDays = progress.targetDays
        } catch {
            // Use default if API fails
            print("Failed to load goal: \(error)")
        }
    }

    // MARK: - HealthKit Actions

    @MainActor
    func requestHealthKitAuthorization() async {
        do {
            try await healthKitManager.requestAuthorization()
            isHealthKitAuthorized = healthKitManager.isAuthorized
            HapticFeedback.success.trigger()
        } catch {
            self.error = error
            HapticFeedback.error.trigger()
        }
    }

    @MainActor
    func syncHealthKit() async {
        guard isHealthKitAuthorized else { return }

        isSyncing = true
        defer { isSyncing = false }

        do {
            let workouts = try await healthKitManager.fetchRecentWorkouts(limit: 100)
            let apiWorkouts = healthKitManager.convertToAPIWorkouts(workouts)

            if !apiWorkouts.isEmpty {
                try await apiClient.uploadWorkouts(apiWorkouts)
                healthKitManager.markSyncComplete()
                lastSyncDate = Date()
            }

            HapticFeedback.success.trigger()
        } catch {
            self.error = error
            HapticFeedback.error.trigger()
        }
    }

    // MARK: - Goal Actions

    @MainActor
    func saveGoal() async {
        isSavingGoal = true
        defer { isSavingGoal = false }

        do {
            try await apiClient.updateGoal(year: currentYear, targetDays: targetDays)
            isEditingGoal = false
            HapticFeedback.success.trigger()
        } catch {
            self.error = error
            HapticFeedback.error.trigger()
        }
    }

    // MARK: - Auth Actions

    @MainActor
    func logout() async {
        do {
            try await authService.logout()
            isAuthenticated = false
            userEmail = ""
            HapticFeedback.success.trigger()
        } catch {
            self.error = error
        }
    }

    @MainActor
    func deleteAccount() async {
        // TODO: Implement account deletion API call
        // For now, just logout
        await logout()
    }
}

// MARK: - Formatted Values

extension SettingsViewModel {
    var formattedLastSync: String {
        guard let date = lastSyncDate else {
            return "Never"
        }
        return Formatters.formatRelativeDate(date)
    }

    var healthKitStatusText: String {
        isHealthKitAuthorized ? "Connected" : "Not Connected"
    }

    var healthKitStatusColor: Color {
        isHealthKitAuthorized ? .statusSuccess : .textMuted
    }
}
