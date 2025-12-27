import SwiftUI
import Observation

// MARK: - Dashboard View Model
// Manages dashboard state and data loading

@Observable
final class DashboardViewModel {
    // MARK: - Dependencies

    private let healthKitManager: HealthKitManager
    private let apiClient: APIClient

    // MARK: - State

    /// Loading state
    var isLoading = false

    /// Error state
    var error: Error?

    /// Whether HealthKit is authorized
    var isHealthKitAuthorized: Bool {
        healthKitManager.isAuthorized
    }

    // MARK: - Goal Data

    var year: Int = Calendar.current.component(.year, from: Date())
    var targetDays: Int = 300
    var daysCompleted: Int = 0

    /// Progress percentage (0-100)
    var progressPercent: Double {
        guard targetDays > 0 else { return 0 }
        return min(Double(daysCompleted) / Double(targetDays) * 100, 100)
    }

    /// Days remaining to reach goal
    var daysRemaining: Int {
        max(targetDays - daysCompleted, 0)
    }

    // MARK: - Pace Tracking

    /// Days in the current year
    var daysInYear: Int {
        let calendar = Calendar.current
        let year = calendar.component(.year, from: Date())
        let isLeapYear = calendar.range(of: .day, in: .year, for: Date())?.count == 366
        return isLeapYear ? 366 : 365
    }

    /// Current day of year (1-365/366)
    var dayOfYear: Int {
        let calendar = Calendar.current
        return calendar.ordinality(of: .day, in: .year, for: Date()) ?? 1
    }

    /// Expected days completed if on pace
    var expectedDays: Int {
        Int(round(Double(dayOfYear) / Double(daysInYear) * Double(targetDays)))
    }

    /// Days ahead (+) or behind (-) pace
    var daysAhead: Int {
        daysCompleted - expectedDays
    }

    /// Year progress percentage
    var yearProgress: Double {
        Double(dayOfYear) / Double(daysInYear) * 100
    }

    /// Whether on track to meet goal
    var isOnTrack: Bool {
        daysAhead >= 0
    }

    /// Motivational message based on progress
    var motivationalMessage: String {
        if daysAhead >= 10 { return "You're crushing it!" }
        if daysAhead >= 5 { return "Ahead of pace, keep going!" }
        if daysAhead >= 0 { return "Right on track!" }
        if daysAhead >= -5 { return "Almost there, you got this!" }
        return "Time to lace up!"
    }

    // MARK: - Stats

    var totalDistanceKm: Double = 0
    var totalDurationHours: Double = 0
    var avgPaceMinPerKm: Double?

    // MARK: - Recent Runs

    var recentRuns: [WorkoutSummary] = []

    // MARK: - Initialization

    init(
        healthKitManager: HealthKitManager = .shared,
        apiClient: APIClient = .shared
    ) {
        self.healthKitManager = healthKitManager
        self.apiClient = apiClient
    }

    // MARK: - Data Loading

    /// Load all dashboard data
    @MainActor
    func loadData() async {
        isLoading = true
        error = nil

        defer { isLoading = false }

        do {
            let response = try await apiClient.fetchDashboard()
            updateFromResponse(response)
        } catch {
            self.error = error
        }
    }

    /// Refresh data (sync HealthKit first, then reload)
    @MainActor
    func refresh() async {
        // Sync HealthKit data first if authorized
        if healthKitManager.isAuthorized {
            do {
                let newWorkouts = try await healthKitManager.queryNewWorkouts()
                if !newWorkouts.isEmpty {
                    let apiWorkouts = healthKitManager.convertToAPIWorkouts(newWorkouts)
                    try await apiClient.uploadWorkouts(apiWorkouts)
                    healthKitManager.markSyncComplete()
                }
            } catch {
                // Log error but continue with refresh
                print("HealthKit sync failed: \(error)")
            }
        }

        // Reload dashboard data
        await loadData()
    }

    /// Request HealthKit authorization
    @MainActor
    func requestHealthKitAuth() async throws {
        try await healthKitManager.requestAuthorization()
    }

    // MARK: - Private Methods

    private func updateFromResponse(_ response: DashboardResponse) {
        year = response.goal.year
        targetDays = response.goal.targetDays
        daysCompleted = response.progress.daysCompleted

        totalDistanceKm = response.stats.totalDistanceKm
        totalDurationHours = response.stats.totalDurationHours
        avgPaceMinPerKm = response.stats.avgPaceMinPerKm

        recentRuns = response.recentRuns.map { WorkoutSummary(from: $0) }
    }
}

// MARK: - Formatted Values

extension DashboardViewModel {
    var formattedDistance: String {
        if totalDistanceKm >= 1000 {
            return String(format: "%.0f", totalDistanceKm)
        }
        return String(format: "%.1f", totalDistanceKm)
    }

    var formattedDuration: String {
        String(format: "%.0f", totalDurationHours)
    }

    var formattedPace: String {
        guard let pace = avgPaceMinPerKm else { return "--:--" }
        let minutes = Int(pace)
        let seconds = Int((pace - Double(minutes)) * 60)
        return String(format: "%d:%02d", minutes, seconds)
    }
}
