import UIKit
import HealthKit
import WidgetKit
import BackgroundTasks

// MARK: - App Delegate
// Handles app lifecycle events, HealthKit background delivery, and BGTaskScheduler

class AppDelegate: NSObject, UIApplicationDelegate {
    // MARK: - Application Lifecycle

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Register background tasks BEFORE app finishes launching
        registerBackgroundTasks()

        // Setup HealthKit background delivery if authorized
        setupHealthKitBackgroundDelivery()

        // Schedule next background sync
        scheduleBackgroundSync()

        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Schedule background sync when entering background
        scheduleBackgroundSync()
    }

    // MARK: - Background Task Registration

    private func registerBackgroundTasks() {
        // Register for app refresh task
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: SyncService.backgroundTaskIdentifier,
            using: nil
        ) { task in
            self.handleBackgroundSync(task: task as! BGAppRefreshTask)
        }
    }

    private func scheduleBackgroundSync() {
        Task {
            await SyncService.shared.scheduleBackgroundSync()
        }
    }

    private func handleBackgroundSync(task: BGAppRefreshTask) {
        // Schedule the next sync first
        scheduleBackgroundSync()

        // Create sync task
        let syncTask = Task {
            await SyncService.shared.performSync(isBackground: true)
        }

        // Handle expiration
        task.expirationHandler = {
            syncTask.cancel()
        }

        // Complete based on result
        Task {
            let result = await syncTask.value
            task.setTaskCompleted(success: result.isSuccess)

            // Refresh widgets on success
            if result.isSuccess {
                await refreshWidgetData()
                WidgetCenter.shared.reloadAllTimelines()
            }
        }
    }

    // MARK: - HealthKit Background Delivery

    private func setupHealthKitBackgroundDelivery() {
        guard HealthKitManager.shared.isAuthorized else {
            return
        }

        Task {
            do {
                try await HealthKitManager.shared.enableBackgroundDelivery()

                // Observe new workouts
                HealthKitManager.shared.observeNewWorkouts { workouts in
                    guard !workouts.isEmpty else { return }

                    Task {
                        await self.handleNewWorkouts(workouts)
                    }
                }

                print("HealthKit background delivery enabled")
            } catch {
                print("Failed to enable HealthKit background delivery: \(error)")
            }
        }
    }

    /// Handle new workouts from HealthKit observer
    private func handleNewWorkouts(_ workouts: [HKWorkout]) async {
        // Use SyncService for all sync operations
        let result = await SyncService.shared.performSync(isBackground: false)

        switch result {
        case .success(let created, let updated, _):
            print("Synced workouts: \(created) created, \(updated) updated")

            // Update widget data
            await refreshWidgetData()

            // Reload widget timelines
            WidgetCenter.shared.reloadAllTimelines()

        case .skipped(let reason):
            print("Sync skipped: \(reason)")

        case .error(let error):
            print("Failed to sync workouts: \(error)")

            // Queue workouts for retry
            let apiWorkouts = await HealthKitManager.shared.convertToAPIWorkouts(workouts)
            await SyncService.shared.queueForSync(workouts: apiWorkouts)
        }
    }

    /// Refresh widget data from API
    private func refreshWidgetData() async {
        do {
            let dashboard = try await APIClient.shared.fetchDashboard()

            SharedDataStore.shared.updateFromDashboard(
                daysCompleted: dashboard.progress.daysCompleted,
                targetDays: dashboard.goal.targetDays,
                daysAhead: dashboard.progress.daysAhead
            )
        } catch {
            print("Failed to refresh widget data: \(error)")
        }
    }

    // MARK: - Background Tasks

    func application(
        _ application: UIApplication,
        handleEventsForBackgroundURLSession identifier: String,
        completionHandler: @escaping () -> Void
    ) {
        // Handle background URL session events if needed
        completionHandler()
    }
}
