import SwiftUI
import Observation

// MARK: - Insights View Model
// Manages insights screen data including charts and statistics

@Observable
final class InsightsViewModel {
    // MARK: - Cached Formatters (expensive to create)

    private static let monthInputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter
    }()

    private static let monthOutputFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        return formatter
    }()

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - State

    var isLoading = false
    var error: Error?

    // MARK: - Streak Data

    var currentStreak: Int = 0
    var longestStreak: Int = 0
    var thisWeekDays: Int = 0
    var lastWeekDays: Int = 0

    // MARK: - Average Stats

    var avgDistancePerRun: Double = 0  // km
    var avgDurationPerRun: Int = 0     // minutes
    var totalDays: Int = 0
    var totalDistance: Double = 0      // km
    var totalDuration: Int = 0         // seconds

    // MARK: - Chart Data

    var monthlyData: [MonthlyDataPoint] = []
    var weeklyData: [WeeklyDataPoint] = []
    var paceData: [PaceDataPoint] = []

    // MARK: - Personal Bests

    var bestDistance: Double = 0       // km
    var bestDistanceDate: String?
    var bestPace: Double?              // min/km
    var bestPaceDate: String?

    // MARK: - Chart Models

    struct MonthlyDataPoint: Identifiable {
        var id: String { month }
        let month: String
        let distance: Double  // km
        let days: Int
        let pace: Double?     // min/km
    }

    struct WeeklyDataPoint: Identifiable {
        var id: String { week }
        let week: String
        let distance: Double  // km
        let days: Int
    }

    struct PaceDataPoint: Identifiable {
        let id: String
        let date: Date
        let pace: Double  // min/km
    }

    // MARK: - Initialization

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    // MARK: - Data Loading

    @MainActor
    func loadData() async {
        isLoading = true
        error = nil

        defer { isLoading = false }

        do {
            let response = try await apiClient.fetchInsights()
            updateFromResponse(response)
        } catch {
            self.error = error
        }
    }

    @MainActor
    func refresh() async {
        await loadData()
    }

    // MARK: - Private Methods

    private func updateFromResponse(_ response: InsightsResponse) {
        // Streaks
        currentStreak = response.streaks.current
        longestStreak = response.streaks.longest
        thisWeekDays = response.streaks.thisWeek
        lastWeekDays = response.streaks.lastWeek

        // Personal bests
        if let best = response.personalBests.longestRunKm {
            bestDistance = best
            bestDistanceDate = response.personalBests.longestRunDate
        }
        if let best = response.personalBests.fastestPaceMinPerKm {
            bestPace = best
            bestPaceDate = response.personalBests.fastestPaceDate
        }

        // Calculate averages from monthly data
        let totalRuns = response.monthlyData.reduce(0) { $0 + $1.runningDays }
        let totalDist = response.monthlyData.reduce(0.0) { $0 + $1.totalDistanceKm }

        totalDays = totalRuns
        totalDistance = totalDist

        if totalRuns > 0 {
            avgDistancePerRun = totalDist / Double(totalRuns)
        }

        // Transform monthly data for charts
        monthlyData = response.monthlyData.map { data in
            let monthName = formatMonthName(data.month)
            return MonthlyDataPoint(
                month: monthName,
                distance: data.totalDistanceKm,
                days: data.runningDays,
                pace: nil
            )
        }

        // Transform weekly data
        weeklyData = response.weeklyData.enumerated().map { index, data in
            WeeklyDataPoint(
                week: "W\(index + 1)",
                distance: data.distanceKm,
                days: data.runningDays
            )
        }

        // Transform pace data
        paceData = response.paceData.suffix(30).map { data in
            PaceDataPoint(
                id: data.id,
                date: data.date,
                pace: data.paceMinPerKm
            )
        }
    }

    private func formatMonthName(_ monthString: String) -> String {
        // Convert "2024-01" to "Jan" using cached formatters
        guard let date = Self.monthInputFormatter.date(from: monthString) else {
            return monthString
        }
        return Self.monthOutputFormatter.string(from: date)
    }
}

// MARK: - Formatted Values

extension InsightsViewModel {
    var formattedAvgDistance: String {
        String(format: "%.1f", avgDistancePerRun)
    }

    var formattedAvgDuration: String {
        "\(avgDurationPerRun)"
    }

    var formattedBestDistance: String {
        String(format: "%.1f", bestDistance)
    }

    var formattedBestPace: String {
        guard let pace = bestPace else { return "--:--" }
        let minutes = Int(pace)
        let seconds = Int((pace - Double(minutes)) * 60)
        return String(format: "%d:%02d", minutes, seconds)
    }
}
