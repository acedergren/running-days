import SwiftUI

// MARK: - Onboarding View
// Multi-step onboarding flow container

struct OnboardingView: View {
    @State private var viewModel = OnboardingViewModel()
    @State private var showErrorAlert = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            Color.surfaceGround
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress indicator
                progressIndicator
                    .padding(.horizontal, Spacing.xl)
                    .padding(.top, Spacing.lg)

                // Step content
                stepContent
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
            }

            // Back button overlay
            if viewModel.canGoBack {
                VStack {
                    HStack {
                        Button {
                            viewModel.goToPrevious()
                            HapticFeedback.light.trigger()
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(Color.textSecondary)
                                .frame(width: 44, height: 44)
                                .background(
                                    Circle()
                                        .fill(Color.surfaceRaised)
                                )
                        }
                        .padding(.leading, Spacing.lg)

                        Spacer()
                    }
                    .padding(.top, Spacing.lg)

                    Spacer()
                }
            }
        }
        .onChange(of: viewModel.isComplete) { _, isComplete in
            if isComplete {
                dismiss()
            }
        }
        .onChange(of: viewModel.error) { _, newError in
            // Sync error state to local binding for proper alert dismissal
            showErrorAlert = newError != nil
        }
        .alert("Error", isPresented: $showErrorAlert) {
            Button("OK") {
                viewModel.error = nil
            }
        } message: {
            if let error = viewModel.error {
                Text(error.localizedDescription)
            }
        }
    }

    // MARK: - Progress Indicator

    private var progressIndicator: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(OnboardingViewModel.Step.allCases, id: \.rawValue) { step in
                Capsule()
                    .fill(
                        step.rawValue <= viewModel.currentStep.rawValue
                            ? Color.accentPrimary
                            : Color.surfaceBase
                    )
                    .frame(height: 4)
                    .animation(.easeInOut(duration: 0.3), value: viewModel.currentStep)
            }
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .welcome:
            WelcomeStep(onContinue: viewModel.goToNext)

        case .healthKit:
            HealthKitStep(
                isAuthorized: viewModel.isHealthKitAuthorized,
                isRequesting: viewModel.isRequestingHealthKit,
                onConnect: { Task { await viewModel.requestHealthKitAccess() } },
                onSkip: viewModel.skipHealthKit
            )

        case .goal:
            GoalStep(
                targetDays: $viewModel.targetDays,
                onContinue: viewModel.confirmGoal
            )

        case .auth:
            AuthStep(
                email: $viewModel.email,
                password: $viewModel.password,
                isCreatingAccount: $viewModel.isCreatingAccount,
                isAuthenticating: viewModel.isAuthenticating,
                onSubmit: { Task { await viewModel.authenticate() } }
            )
        }
    }
}

// MARK: - Onboarding Wrapper

/// Wrapper that conditionally shows onboarding
struct OnboardingWrapper<Content: View>: View {
    @State private var showOnboarding: Bool
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
        self._showOnboarding = State(
            initialValue: !UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
        )
    }

    var body: some View {
        content()
            .fullScreenCover(isPresented: $showOnboarding) {
                OnboardingView()
            }
    }
}

// MARK: - Preview

#Preview {
    OnboardingView()
}
