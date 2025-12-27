import UIKit
import HealthKit
import WidgetKit

// MARK: - App Delegate
// Handles app lifecycle events and HealthKit background delivery

class AppDelegate: NSObject, UIApplicationDelegate {
    // MARK: - Application Lifecycle

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Setup HealthKit background delivery if authorized
        setupHealthKitBackgroundDelivery()

        return true
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

    /// Handle new workouts from HealthKit
    private func handleNewWorkouts(_ workouts: [HKWorkout]) async {
        do {
            // Convert and upload workouts
            let apiWorkouts = HealthKitManager.shared.convertToAPIWorkouts(workouts)
            try await APIClient.shared.uploadWorkouts(apiWorkouts)
            HealthKitManager.shared.markSyncComplete()

            // Update widget data
            await refreshWidgetData()

            // Reload widget timelines
            WidgetCenter.shared.reloadAllTimelines()

            print("Synced \(workouts.count) new workouts")
        } catch {
            print("Failed to sync workouts: \(error)")
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
