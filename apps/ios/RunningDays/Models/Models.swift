import Foundation

// MARK: - User

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt
    }
}

// MARK: - Goal

struct Goal: Codable, Identifiable {
    var id: String { "\(year)" }
    let year: Int
    let targetDays: Int
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case year
        case targetDays
        case createdAt
        case updatedAt
    }
}

// MARK: - Progress

struct Progress: Codable {
    let daysCompleted: Int
    let daysRemaining: Int
    let percentComplete: Double
    let daysAhead: Int
}

// MARK: - Dashboard Response

struct DashboardResponse: Codable {
    let goal: Goal
    let progress: Progress
    let stats: DashboardStats
    let recentRuns: [Workout]
    let chartData: [ChartDataPoint]?
}

struct DashboardStats: Codable {
    let totalDistanceKm: Double
    let totalDurationHours: Double
    let avgPaceMinPerKm: Double?
    let daysLeft: Int?

    static let empty = DashboardStats(
        totalDistanceKm: 0,
        totalDurationHours: 0,
        avgPaceMinPerKm: nil,
        daysLeft: nil
    )
}

// MARK: - Insights Response

struct InsightsResponse: Codable {
    let streaks: StreakInfo
    let monthlyData: [MonthlyDataPoint]
    let weeklyData: [WeeklyDataPoint]
    let paceData: [PaceDataPoint]
    let personalBests: PersonalBests
    let achievements: [Achievement]
}

// MARK: - Workout

struct Workout: Codable, Identifiable {
    let id: String
    let date: String
    let startTime: String
    let endTime: String
    let durationSeconds: Int
    let distanceMeters: Double
    let avgPaceSecondsPerKm: Double?
    let avgHeartRate: Int?
    let maxHeartRate: Int?
    let energyBurnedKcal: Double?
    let source: String

    var parsedDate: Date {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: date) ?? Date()
    }
}

// MARK: - Goal Progress Response

struct GoalProgressResponse: Codable {
    let goal: Goal
    let progress: Progress
    let paceMetrics: PaceMetrics
    let streaks: StreakInfo
    let achievements: [Achievement]
}

// MARK: - Pace Metrics

struct PaceMetrics: Codable {
    let requiredDaysPerWeek: Double
    let currentPacePerWeek: Double
    let projectedCompletion: String?
    let willMeetGoal: Bool
}

// MARK: - Streak Info

struct StreakInfo: Codable {
    let current: Int
    let longest: Int
    let thisWeek: Int
    let lastWeek: Int
}

// MARK: - Chart Data Points

struct ChartDataPoint: Codable, Identifiable {
    var id: String { date }
    let date: String
    let distance: Double
    let duration: Int
    let pace: Double?
}

struct MonthlyDataPoint: Codable, Identifiable {
    var id: String { month }
    let month: String
    let runningDays: Int
    let totalDistanceKm: Double
}

struct WeeklyDataPoint: Codable, Identifiable {
    var id: String { weekLabel }
    let weekLabel: String
    let distanceKm: Double
    let runningDays: Int
}

struct PaceDataPoint: Codable, Identifiable {
    let id: String
    let date: Date
    let paceMinPerKm: Double

    enum CodingKeys: String, CodingKey {
        case id
        case date
        case paceMinPerKm
    }
}

// MARK: - Personal Bests

struct PersonalBests: Codable {
    let longestRunKm: Double?
    let longestRunDate: String?
    let fastestPaceMinPerKm: Double?
    let fastestPaceDate: String?
}

// MARK: - Achievement

struct Achievement: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let milestone: Int
    let unlockedAt: Date?
    let isUnlocked: Bool
}

// MARK: - Sync Response

struct SyncResponse: Codable {
    let success: Bool
    let syncId: String
    let serverTimestamp: String
    let nextCursor: String?
    let created: Int
    let updated: Int
    let unchanged: Int
    let conflicts: [SyncConflict]
}

struct SyncConflict: Codable, Identifiable {
    var id: String { serverId }
    let clientId: String?
    let serverId: String
    let reason: String
    let resolution: String
}

// MARK: - Sync Request

struct SyncRequest: Encodable {
    let workouts: [ProcessedWorkout]
    let mode: String
    let idempotencyKey: String
    let clientSyncTimestamp: String

    init(workouts: [ProcessedWorkout], mode: SyncMode = .incremental) {
        self.workouts = workouts
        self.mode = mode.rawValue
        self.idempotencyKey = UUID().uuidString
        self.clientSyncTimestamp = ISO8601DateFormatter().string(from: Date())
    }
}

enum SyncMode: String {
    case full
    case incremental
}

// MARK: - Processed Workout (for HealthKit sync)

struct ProcessedWorkout: Codable, Identifiable {
    let id: String
    let clientId: String
    let startTime: String
    let endTime: String
    let durationSeconds: Int
    let distanceMeters: Double
    let energyBurnedKcal: Double?
    let avgHeartRate: Int?
    let maxHeartRate: Int?
    let avgPaceSecondsPerKm: Double?
    let source: String

    init(
        id: String = UUID().uuidString,
        clientId: String,
        startTime: Date,
        endTime: Date,
        durationSeconds: Int,
        distanceMeters: Double,
        energyBurnedKcal: Double? = nil,
        avgHeartRate: Int? = nil,
        maxHeartRate: Int? = nil,
        avgPaceSecondsPerKm: Double? = nil,
        source: String = "healthkit"
    ) {
        self.id = id
        self.clientId = clientId
        self.startTime = ISO8601DateFormatter().string(from: startTime)
        self.endTime = ISO8601DateFormatter().string(from: endTime)
        self.durationSeconds = durationSeconds
        self.distanceMeters = distanceMeters
        self.energyBurnedKcal = energyBurnedKcal
        self.avgHeartRate = avgHeartRate
        self.maxHeartRate = maxHeartRate
        self.avgPaceSecondsPerKm = avgPaceSecondsPerKm
        self.source = source
    }
}

// MARK: - Sync Status Response

struct SyncStatusResponse: Codable {
    let lastSyncAt: String?
    let serverCursor: String
    let totalWorkouts: Int
    let pendingSync: Int
    let oldestWorkout: String?
    let newestWorkout: String?
}

// MARK: - Workouts List Response

struct WorkoutsListResponse: Codable {
    let workouts: [Workout]
    let nextCursor: String?
    let hasMore: Bool
}

// MARK: - Workout Summary (for UI)

struct WorkoutSummary: Identifiable {
    let id: String
    let date: Date
    let distanceMeters: Double
    let durationSeconds: Int
    let avgPaceSecondsPerKm: Double?

    init(from workout: Workout) {
        self.id = workout.id
        self.date = workout.parsedDate
        self.distanceMeters = workout.distanceMeters
        self.durationSeconds = workout.durationSeconds
        self.avgPaceSecondsPerKm = workout.avgPaceSecondsPerKm
    }

    init(
        id: String,
        date: Date,
        distanceMeters: Double,
        durationSeconds: Int,
        avgPaceSecondsPerKm: Double?
    ) {
        self.id = id
        self.date = date
        self.distanceMeters = distanceMeters
        self.durationSeconds = durationSeconds
        self.avgPaceSecondsPerKm = avgPaceSecondsPerKm
    }
}
