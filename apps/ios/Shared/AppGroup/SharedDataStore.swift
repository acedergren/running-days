import Foundation

// MARK: - Widget Data
// Shared data structure between main app and widget

struct WidgetData: Codable {
    let daysCompleted: Int
    let targetDays: Int
    let progress: Double
    let daysAhead: Int
    let lastUpdated: Date

    static let placeholder = WidgetData(
        daysCompleted: 247,
        targetDays: 300,
        progress: 82.3,
        daysAhead: 12,
        lastUpdated: Date()
    )
}

// MARK: - Shared Data Store
// Manages data sharing between main app and widget via App Groups

final class SharedDataStore {
    // MARK: - Singleton

    static let shared = SharedDataStore()

    // MARK: - Properties

    private let suiteName = "group.com.runningdays.shared"
    private let widgetDataKey = "widgetData"

    private var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    // MARK: - Initialization

    private init() {}

    // MARK: - Widget Data

    /// Save widget data to shared container
    func saveWidgetData(_ data: WidgetData) {
        guard let encoded = try? JSONEncoder().encode(data) else {
            print("Failed to encode widget data")
            return
        }
        defaults?.set(encoded, forKey: widgetDataKey)
    }

    /// Load widget data from shared container
    func loadWidgetData() -> WidgetData? {
        guard let data = defaults?.data(forKey: widgetDataKey),
              let decoded = try? JSONDecoder().decode(WidgetData.self, from: data) else {
            return nil
        }
        return decoded
    }

    /// Update widget data from dashboard response
    func updateFromDashboard(
        daysCompleted: Int,
        targetDays: Int,
        daysAhead: Int
    ) {
        let progress = targetDays > 0
            ? Double(daysCompleted) / Double(targetDays) * 100
            : 0

        let data = WidgetData(
            daysCompleted: daysCompleted,
            targetDays: targetDays,
            progress: progress,
            daysAhead: daysAhead,
            lastUpdated: Date()
        )

        saveWidgetData(data)
    }

    /// Clear all shared data
    func clearAll() {
        defaults?.removeObject(forKey: widgetDataKey)
    }
}
