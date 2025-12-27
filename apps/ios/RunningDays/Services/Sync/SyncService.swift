import Foundation
import HealthKit
import BackgroundTasks
import os.log

// MARK: - Sync Service
/// Centralized sync orchestration for HealthKit → API synchronization
/// Handles both foreground and background sync scenarios

actor SyncService {
    // MARK: - Singleton

    static let shared = SyncService()

    // MARK: - Constants

    /// Background task identifier - must match Info.plist
    static let backgroundTaskIdentifier = "com.runningdays.sync"

    /// Minimum interval between background syncs (in seconds)
    private let minimumSyncInterval: TimeInterval = 15 * 60 // 15 minutes

    /// Maximum retries for failed sync attempts
    private let maxRetries = 3

    /// Delay between retries (exponential backoff base)
    private let retryBaseDelay: TimeInterval = 5

    // MARK: - State

    private var isSyncing = false
    private var lastSyncAttempt: Date?
    private var pendingWorkouts: [ProcessedWorkout] = []
    private var retryCount = 0

    private let logger = Logger(subsystem: "com.runningdays", category: "SyncService")

    // MARK: - Initialization

    private init() {}

    // MARK: - Public Interface

    /// Perform a full sync cycle
    /// - Parameter isBackground: Whether this is a background sync (affects timeout and retry behavior)
    /// - Returns: Sync result indicating success/failure and statistics
    func performSync(isBackground: Bool = false) async -> SyncResult {
        guard !isSyncing else {
            logger.info("Sync already in progress, skipping")
            return .skipped(reason: "Already syncing")
        }

        // Rate limiting for background syncs
        if isBackground, let lastAttempt = lastSyncAttempt {
            let timeSinceLastSync = Date().timeIntervalSince(lastAttempt)
            if timeSinceLastSync < minimumSyncInterval {
                logger.info("Too soon since last sync, skipping")
                return .skipped(reason: "Rate limited")
            }
        }

        isSyncing = true
        lastSyncAttempt = Date()
        defer { isSyncing = false }

        do {
            // 1. Query new workouts from HealthKit
            let healthKitManager = await HealthKitManager.shared
            let newWorkouts = try await healthKitManager.queryNewWorkouts()

            guard !newWorkouts.isEmpty else {
                logger.info("No new workouts to sync")
                return .success(created: 0, updated: 0, unchanged: 0)
            }

            // 2. Convert to API format
            let apiWorkouts = await healthKitManager.convertToAPIWorkouts(newWorkouts)

            // 3. Sync with backend
            let result = try await syncWithRetry(workouts: apiWorkouts, isBackground: isBackground)

            // 4. Handle conflicts if any
            if !result.conflicts.isEmpty {
                await healthKitManager.handleConflicts(result.conflicts)
            }

            // 5. Clear pending queue on success
            pendingWorkouts.removeAll()
            retryCount = 0

            logger.info("Sync completed: \(result.created) created, \(result.updated) updated")
            return .success(created: result.created, updated: result.updated, unchanged: result.unchanged)

        } catch {
            logger.error("Sync failed: \(error.localizedDescription)")
            return .error(error)
        }
    }

    /// Add workouts to pending queue (for offline support)
    func queueForSync(workouts: [ProcessedWorkout]) {
        pendingWorkouts.append(contentsOf: workouts)
        logger.info("Queued \(workouts.count) workouts for sync")
    }

    /// Retry pending workouts
    func retryPending() async -> SyncResult {
        guard !pendingWorkouts.isEmpty else {
            return .skipped(reason: "No pending workouts")
        }

        do {
            let result = try await syncWithRetry(workouts: pendingWorkouts, isBackground: false)
            pendingWorkouts.removeAll()
            retryCount = 0
            return .success(created: result.created, updated: result.updated, unchanged: result.unchanged)
        } catch {
            return .error(error)
        }
    }

    // MARK: - Background Task Registration

    /// Register background tasks with the system
    /// Call this from AppDelegate.didFinishLaunching
    nonisolated func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.backgroundTaskIdentifier,
            using: nil
        ) { [self] task in
            guard let appRefreshTask = task as? BGAppRefreshTask else { return }
            self.handleBackgroundSync(task: appRefreshTask)
        }
    }

    /// Schedule the next background sync
    func scheduleBackgroundSync() {
        let request = BGAppRefreshTaskRequest(identifier: Self.backgroundTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: minimumSyncInterval)

        do {
            try BGTaskScheduler.shared.submit(request)
            logger.info("Scheduled background sync")
        } catch {
            logger.error("Failed to schedule background sync: \(error.localizedDescription)")
        }
    }

    // MARK: - Private Methods

    /// Handle a background sync task from BGTaskScheduler
    private nonisolated func handleBackgroundSync(task: BGAppRefreshTask) {
        // Schedule the next sync before we start
        Task {
            await self.scheduleBackgroundSync()
        }

        // Create a task to perform the sync
        let syncTask = Task {
            await self.performSync(isBackground: true)
        }

        // Handle task expiration
        task.expirationHandler = {
            syncTask.cancel()
        }

        // Perform sync and complete task
        Task {
            let result = await syncTask.value

            switch result {
            case .success, .skipped:
                task.setTaskCompleted(success: true)
            case .error:
                task.setTaskCompleted(success: false)
            }
        }
    }

    /// Sync workouts with retry logic
    private func syncWithRetry(
        workouts: [ProcessedWorkout],
        isBackground: Bool
    ) async throws -> SyncResponse {
        var lastError: Error?
        let maxAttempts = isBackground ? 2 : maxRetries

        for attempt in 0..<maxAttempts {
            do {
                // Exponential backoff delay (skip on first attempt)
                if attempt > 0 {
                    let delay = retryBaseDelay * pow(2, Double(attempt - 1))
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }

                return try await APIClient.shared.syncWorkouts(workouts)

            } catch NetworkError.noConnection {
                // Queue for later if no connection
                pendingWorkouts.append(contentsOf: workouts)
                throw SyncError.offline

            } catch NetworkError.serverError(let code) where code >= 500 {
                // Retry on server errors
                lastError = NetworkError.serverError(code)
                logger.warning("Sync attempt \(attempt + 1) failed with server error \(code)")

            } catch NetworkError.unauthorized {
                // Don't retry auth errors
                throw SyncError.authenticationRequired

            } catch {
                lastError = error
                logger.warning("Sync attempt \(attempt + 1) failed: \(error.localizedDescription)")
            }
        }

        throw lastError ?? SyncError.unknown
    }
}

// MARK: - Sync Result

enum SyncResult {
    case success(created: Int, updated: Int, unchanged: Int)
    case skipped(reason: String)
    case error(Error)

    var isSuccess: Bool {
        if case .success = self { return true }
        return false
    }
}

// MARK: - Sync Errors

enum SyncError: LocalizedError {
    case offline
    case authenticationRequired
    case rateLimited
    case unknown

    var errorDescription: String? {
        switch self {
        case .offline:
            return "No internet connection. Workouts will sync when you're back online."
        case .authenticationRequired:
            return "Please sign in to sync your workouts."
        case .rateLimited:
            return "Too many sync requests. Please try again later."
        case .unknown:
            return "Unable to sync workouts. Please try again."
        }
    }
}
