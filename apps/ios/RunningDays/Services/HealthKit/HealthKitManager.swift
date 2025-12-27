import HealthKit
import Observation

// MARK: - HealthKit Manager
// Handles authorization, workout queries, and background delivery for running workouts

@Observable
final class HealthKitManager {
    // MARK: - Singleton

    static let shared = HealthKitManager()

    // MARK: - Properties

    private let healthStore = HKHealthStore()

    /// Stored observer query for lifecycle management
    private var observerQuery: HKObserverQuery?

    /// Initialization task for cancellation support
    private var initializationTask: Task<Void, Never>?

    /// Authorization status for workouts
    var authorizationStatus: HKAuthorizationStatus = .notDetermined

    /// Whether HealthKit is available on this device
    var isAvailable: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    /// Whether we have authorization to read workouts
    var isAuthorized: Bool {
        authorizationStatus == .sharingAuthorized
    }

    /// Last sync timestamp
    private(set) var lastSyncDate: Date? {
        get {
            UserDefaults.standard.object(forKey: Keys.lastSync) as? Date
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.lastSync)
        }
    }

    // MARK: - Types

    private enum Keys {
        static let lastSync = "healthKitLastSync"
        static let serverCursor = "healthKitServerCursor"
    }

    /// Types we need to read from HealthKit
    private var typesToRead: Set<HKObjectType> {
        var types: Set<HKObjectType> = [HKObjectType.workoutType()]

        // Optional quantity types for additional metrics
        if let heartRate = HKObjectType.quantityType(forIdentifier: .heartRate) {
            types.insert(heartRate)
        }
        if let activeEnergy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
            types.insert(activeEnergy)
        }
        if let distance = HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning) {
            types.insert(distance)
        }

        return types
    }

    // MARK: - Initialization

    private init() {
        // Store task reference for potential cancellation
        initializationTask = Task { @MainActor in
            updateAuthorizationStatus()
        }
    }

    deinit {
        // Cancel any pending initialization
        initializationTask?.cancel()
        // Stop observer query to prevent resource leak
        stopObservingWorkouts()
    }

    // MARK: - Authorization

    /// Request HealthKit authorization
    @MainActor
    func requestAuthorization() async throws {
        guard isAvailable else {
            throw HealthKitError.notAvailable
        }

        try await healthStore.requestAuthorization(toShare: [], read: typesToRead)
        await updateAuthorizationStatus()
    }

    /// Update the current authorization status
    @MainActor
    private func updateAuthorizationStatus() {
        authorizationStatus = healthStore.authorizationStatus(for: HKObjectType.workoutType())
    }

    // MARK: - Workout Queries

    /// Query running workouts within a date range
    func queryRunningWorkouts(from startDate: Date, to endDate: Date) async throws -> [HKWorkout] {
        let workoutPredicate = HKQuery.predicateForWorkouts(with: .running)
        let datePredicate = HKQuery.predicateForSamples(
            withStart: startDate,
            end: endDate,
            options: .strictStartDate
        )
        let compound = NSCompoundPredicate(
            andPredicateWithSubpredicates: [workoutPredicate, datePredicate]
        )

        let sortDescriptor = NSSortDescriptor(
            key: HKSampleSortIdentifierEndDate,
            ascending: false
        )

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: HKObjectType.workoutType(),
                predicate: compound,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [sortDescriptor]
            ) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let workouts = (samples as? [HKWorkout]) ?? []
                continuation.resume(returning: workouts)
            }

            healthStore.execute(query)
        }
    }

    /// Query all running workouts for a specific year
    func queryWorkoutsForYear(_ year: Int) async throws -> [HKWorkout] {
        var components = DateComponents()
        components.year = year
        components.month = 1
        components.day = 1

        guard let startDate = Calendar.current.date(from: components) else {
            throw HealthKitError.invalidDateRange
        }

        components.year = year + 1
        guard let endDate = Calendar.current.date(from: components) else {
            throw HealthKitError.invalidDateRange
        }

        return try await queryRunningWorkouts(from: startDate, to: endDate)
    }

    /// Query workouts since the last sync
    func queryNewWorkouts() async throws -> [HKWorkout] {
        let startDate = lastSyncDate ?? Calendar.current.date(
            byAdding: .year, value: -1, to: Date()
        )!
        let endDate = Date()

        return try await queryRunningWorkouts(from: startDate, to: endDate)
    }

    // MARK: - Background Delivery

    /// Enable background delivery for workout updates
    func enableBackgroundDelivery() async throws {
        try await healthStore.enableBackgroundDelivery(
            for: HKObjectType.workoutType(),
            frequency: .immediate
        )
    }

    /// Observe new workouts in the background
    func observeNewWorkouts(handler: @escaping ([HKWorkout]) -> Void) {
        // Stop any existing observer before creating a new one
        stopObservingWorkouts()

        let workoutType = HKObjectType.workoutType()

        let query = HKObserverQuery(sampleType: workoutType, predicate: nil) { [weak self] _, completionHandler, error in
            guard error == nil else {
                completionHandler()
                return
            }

            // Fetch recent workouts when notified
            Task { [weak self] in
                let endDate = Date()
                guard let startDate = Calendar.current.date(byAdding: .day, value: -1, to: endDate) else {
                    completionHandler()
                    return
                }

                do {
                    let workouts = try await self?.queryRunningWorkouts(from: startDate, to: endDate) ?? []
                    await MainActor.run {
                        handler(workouts)
                    }
                } catch {
                    print("Failed to fetch workouts: \(error)")
                }

                completionHandler()
            }
        }

        // Store query reference for lifecycle management
        observerQuery = query
        healthStore.execute(query)
    }

    /// Stop observing workouts - call when no longer needed
    func stopObservingWorkouts() {
        if let query = observerQuery {
            healthStore.stop(query)
            observerQuery = nil
        }
    }

    // MARK: - Workout Conversion

    /// Convert HKWorkout to API-compatible format
    func convertToAPIWorkout(_ workout: HKWorkout) -> ProcessedWorkout {
        let distanceMeters = workout.totalDistance?.doubleValue(for: .meter()) ?? 0
        let durationSeconds = Int(workout.duration)
        let energyBurnedKcal = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie())

        // Calculate pace (seconds per kilometer)
        var paceSecondsPerKm: Double?
        if distanceMeters > 0 {
            let distanceKm = distanceMeters / 1000
            paceSecondsPerKm = Double(durationSeconds) / distanceKm
        }

        return ProcessedWorkout(
            clientId: workout.uuid.uuidString,
            startTime: workout.startDate,
            endTime: workout.endDate,
            durationSeconds: durationSeconds,
            distanceMeters: distanceMeters,
            energyBurnedKcal: energyBurnedKcal,
            avgPaceSecondsPerKm: paceSecondsPerKm,
            source: "healthkit"
        )
    }

    /// Convert multiple workouts to API format
    func convertToAPIWorkouts(_ workouts: [HKWorkout]) -> [ProcessedWorkout] {
        workouts.map { convertToAPIWorkout($0) }
    }

    // MARK: - Sync

    /// Sync result type
    enum SyncResult {
        case success(created: Int, updated: Int, unchanged: Int, conflicts: [SyncConflict])
        case noNewWorkouts
        case rateLimited(retryAfter: Int)
        case error(Error)
    }

    /// Server cursor for incremental sync (stored in UserDefaults)
    private(set) var serverCursor: String? {
        get {
            UserDefaults.standard.string(forKey: Keys.serverCursor)
        }
        set {
            UserDefaults.standard.set(newValue, forKey: Keys.serverCursor)
        }
    }

    /// Sync workouts with the backend using the new sync API
    func syncWorkouts() async throws -> SyncResult {
        let newWorkouts = try await queryNewWorkouts()

        guard !newWorkouts.isEmpty else {
            lastSyncDate = Date()
            return .noNewWorkouts
        }

        let apiWorkouts = convertToAPIWorkouts(newWorkouts)

        do {
            let response = try await APIClient.shared.syncWorkouts(apiWorkouts)

            // Store server cursor for next incremental sync
            if let cursor = response.nextCursor {
                serverCursor = cursor
            }

            // Update last sync timestamp
            lastSyncDate = Date()

            return .success(
                created: response.created,
                updated: response.updated,
                unchanged: response.unchanged,
                conflicts: response.conflicts
            )
        } catch NetworkError.serverError(429) {
            // Rate limited - extract retry-after if available
            return .rateLimited(retryAfter: 60) // Default to 60 seconds
        } catch {
            return .error(error)
        }
    }

    /// Mark sync as completed (call after successful API upload)
    func markSyncComplete() {
        lastSyncDate = Date()
    }

    /// Handle sync conflicts (e.g., log them or notify user)
    func handleConflicts(_ conflicts: [SyncConflict]) {
        // For now, just log the conflicts
        // In a real app, you might want to show these to the user
        for conflict in conflicts {
            print("Sync conflict: \(conflict.reason) for workout \(conflict.serverId)")
        }
    }
}

// MARK: - Error Types

enum HealthKitError: LocalizedError {
    case notAvailable
    case notAuthorized
    case queryFailed
    case invalidDateRange

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "HealthKit is not available on this device"
        case .notAuthorized:
            return "HealthKit access has not been authorized"
        case .queryFailed:
            return "Failed to query HealthKit data"
        case .invalidDateRange:
            return "Invalid date range for query"
        }
    }
}
