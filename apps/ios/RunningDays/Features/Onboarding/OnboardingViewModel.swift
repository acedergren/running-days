import SwiftUI
import Observation

// MARK: - Onboarding View Model
// State machine for multi-step onboarding flow

@Observable
final class OnboardingViewModel {
    // MARK: - Types

    enum Step: Int, CaseIterable {
        case welcome = 0
        case healthKit = 1
        case goal = 2
        case auth = 3

        var title: String {
            switch self {
            case .welcome: return "Welcome"
            case .healthKit: return "Connect Health"
            case .goal: return "Set Your Goal"
            case .auth: return "Get Started"
            }
        }

        var next: Step? {
            Step(rawValue: rawValue + 1)
        }

        var previous: Step? {
            Step(rawValue: rawValue - 1)
        }
    }

    // MARK: - Dependencies

    private let healthKitManager: HealthKitManager
    private let authService: AuthService
    private let apiClient: APIClient

    // MARK: - State

    var currentStep: Step = .welcome
    var isAnimating: Bool = false
    var error: Error?

    // HealthKit
    var isHealthKitAuthorized: Bool = false
    var isRequestingHealthKit: Bool = false

    // Goal
    var targetDays: Int = 300

    // Auth
    var email: String = ""
    var password: String = ""
    var isCreatingAccount: Bool = true
    var isAuthenticating: Bool = false

    // Completion
    var isComplete: Bool = false

    // MARK: - Computed

    var progress: Double {
        Double(currentStep.rawValue + 1) / Double(Step.allCases.count)
    }

    var canGoBack: Bool {
        currentStep.previous != nil
    }

    var isLastStep: Bool {
        currentStep == .auth
    }

    // MARK: - Initialization

    init(
        healthKitManager: HealthKitManager = .shared,
        authService: AuthService = .shared,
        apiClient: APIClient = .shared
    ) {
        self.healthKitManager = healthKitManager
        self.authService = authService
        self.apiClient = apiClient
    }

    // MARK: - Navigation

    @MainActor
    func goToNext() {
        guard let next = currentStep.next else {
            completeOnboarding()
            return
        }

        withAnimation(AppAnimation.cardEntrance) {
            isAnimating = true
            currentStep = next
        }

        // Reset animation state
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(300))
            isAnimating = false
        }
    }

    @MainActor
    func goToPrevious() {
        guard let previous = currentStep.previous else { return }

        withAnimation(AppAnimation.cardEntrance) {
            isAnimating = true
            currentStep = previous
        }

        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(300))
            isAnimating = false
        }
    }

    // MARK: - HealthKit

    @MainActor
    func requestHealthKitAccess() async {
        isRequestingHealthKit = true
        defer { isRequestingHealthKit = false }

        do {
            try await healthKitManager.requestAuthorization()
            isHealthKitAuthorized = healthKitManager.isAuthorized
            HapticFeedback.success.trigger()

            // Auto-advance on success
            if isHealthKitAuthorized {
                try? await Task.sleep(for: .milliseconds(500))
                goToNext()
            }
        } catch {
            self.error = error
            HapticFeedback.error.trigger()
        }
    }

    func skipHealthKit() {
        goToNext()
    }

    // MARK: - Goal

    func confirmGoal() {
        HapticFeedback.success.trigger()
        goToNext()
    }

    // MARK: - Authentication

    @MainActor
    func authenticate() async {
        guard !email.isEmpty, !password.isEmpty else {
            error = OnboardingError.invalidCredentials
            return
        }

        isAuthenticating = true
        defer { isAuthenticating = false }

        do {
            if isCreatingAccount {
                try await authService.register(email: email, password: password)
            } else {
                try await authService.login(email: email, password: password)
            }

            // Save initial goal
            let year = Calendar.current.component(.year, from: Date())
            try await apiClient.updateGoal(year: year, targetDays: targetDays)

            HapticFeedback.success.trigger()
            completeOnboarding()
        } catch {
            self.error = error
            HapticFeedback.error.trigger()
        }
    }

    // MARK: - Completion

    @MainActor
    private func completeOnboarding() {
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        isComplete = true
    }
}

// MARK: - Errors

enum OnboardingError: LocalizedError {
    case invalidCredentials

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Please enter a valid email and password"
        }
    }
}
