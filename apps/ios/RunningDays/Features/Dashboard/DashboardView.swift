import SwiftUI

// MARK: - Dashboard View
// Main dashboard screen with progress ring, stats, and recent runs

struct DashboardView: View {
    // MARK: - State

    @State private var viewModel = DashboardViewModel()
    @State private var hasLoadedInitialData = false

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    VStack(spacing: Spacing.xl) {
                        // Hero Section - Progress Ring
                        heroSection
                            .cardEntrance(index: 0)

                        // Year Progress Bar
                        yearProgressSection
                            .cardEntrance(index: 1)

                        Divider()
                            .background(Color.borderSubtle)
                            .padding(.horizontal)

                        // Stats Grid
                        statsSection
                            .cardEntrance(index: 2)

                        // Recent Runs
                        recentRunsSection
                            .cardEntrance(index: 3)
                    }
                    .padding(.vertical, Spacing.xl)
                }
                .background(Color.surfaceGround)
                .refreshable {
                    await viewModel.refresh()
                }

                // Loading overlay for initial load
                if viewModel.isLoading && !hasLoadedInitialData {
                    loadingOverlay
                }
            }
            .navigationTitle("Running Days")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: Text("Settings")) {
                        Image(systemName: "gearshape")
                            .foregroundStyle(Color.textSecondary)
                    }
                }
            }
        }
        .task {
            await viewModel.loadData()
            hasLoadedInitialData = true
        }
    }

    // MARK: - Loading Overlay

    private var loadingOverlay: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(Color.accentPrimary)

            Text("Loading your stats...")
                .font(AppFont.bodyMedium)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.surfaceGround.opacity(0.95))
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(spacing: Spacing.lg) {
            // Year badge
            HStack(spacing: Spacing.sm) {
                Image(systemName: "calendar")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.accentPrimary)

                Text("\(viewModel.year) Goal")
                    .font(AppFont.caption.weight(.medium))
                    .foregroundStyle(Color.textSecondary)

                Text("\(viewModel.targetDays) days")
                    .font(AppFont.caption.weight(.bold))
                    .foregroundStyle(Color.textPrimary)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.sm)
            .background(
                Capsule()
                    .fill(Color.surfaceRaised)
                    .overlay(
                        Capsule()
                            .stroke(Color.borderSubtle, lineWidth: 1)
                    )
            )

            // Progress Ring
            ProgressRingView(
                value: viewModel.progressPercent,
                size: 280,
                strokeWidth: 18,
                label: "\(viewModel.daysCompleted)",
                sublabel: "of \(viewModel.targetDays) days"
            )

            // Status pill and message
            VStack(spacing: Spacing.md) {
                statusPill

                Text(viewModel.motivationalMessage)
                    .font(AppFont.caption)
                    .foregroundStyle(Color.textMuted)
            }
        }
        .padding(.horizontal)
    }

    private var statusPill: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: viewModel.isOnTrack ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 14, weight: .semibold))

            Text("\(abs(viewModel.daysAhead)) days \(viewModel.isOnTrack ? "ahead" : "behind") of pace")
                .font(AppFont.statusPill)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.sm)
        .foregroundStyle(viewModel.isOnTrack ? Color.success : Color.warning)
        .background(
            Capsule()
                .fill(viewModel.isOnTrack ? Color.successMuted : Color.warningMuted)
                .overlay(
                    Capsule()
                        .stroke(
                            viewModel.isOnTrack
                                ? Color.success.opacity(0.25)
                                : Color.warning.opacity(0.25),
                            lineWidth: 1
                        )
                )
        )
    }

    // MARK: - Year Progress Section

    private var yearProgressSection: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                Text("Jan 1")
                    .font(AppFont.captionSmall)
                    .foregroundStyle(Color.textMuted)

                Spacer()

                Text("Day \(viewModel.dayOfYear) of \(viewModel.daysInYear)")
                    .font(AppFont.captionSmall.weight(.medium))
                    .foregroundStyle(Color.textSecondary)

                Spacer()

                Text("Dec 31")
                    .font(AppFont.captionSmall)
                    .foregroundStyle(Color.textMuted)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    Capsule()
                        .fill(Color.surfaceRaised)
                        .frame(height: 8)

                    // Progress fill
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.5, green: 0.35, blue: 0.25),
                                    Color(red: 0.4, green: 0.28, blue: 0.20)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(
                            width: geometry.size.width * CGFloat(viewModel.yearProgress / 100),
                            height: 8
                        )
                }
            }
            .frame(height: 8)
        }
        .padding(.horizontal)
    }

    // MARK: - Stats Section

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            HStack {
                Text("YEAR STATS")
                    .font(AppFont.sectionHeader)
                    .foregroundStyle(Color.textMuted)
                    .tracking(0.5)

                Spacer()

                NavigationLink(destination: Text("Insights")) {
                    HStack(spacing: 2) {
                        Text("View insights")
                            .font(AppFont.caption.weight(.medium))

                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundStyle(Color.accentPrimary)
                }
            }

            StatsGrid {
                StatCardView(
                    label: "Distance",
                    value: viewModel.formattedDistance,
                    unit: "km",
                    iconName: "figure.run"
                )

                StatCardView(
                    label: "Time",
                    value: viewModel.formattedDuration,
                    unit: "hrs",
                    iconName: "clock"
                )

                StatCardView(
                    label: "Avg Pace",
                    value: viewModel.formattedPace,
                    unit: "/km",
                    iconName: "speedometer"
                )

                StatCardView(
                    label: "Days Left",
                    value: viewModel.daysRemaining,
                    unit: "to go",
                    iconName: "calendar",
                    isAccent: true
                )
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Recent Runs Section

    private var recentRunsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            Text("RECENT RUNS")
                .font(AppFont.sectionHeader)
                .foregroundStyle(Color.textMuted)
                .tracking(0.5)
                .padding(.horizontal)

            if viewModel.recentRuns.isEmpty {
                EmptyActivityView()
                    .padding(.horizontal)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(Array(viewModel.recentRuns.prefix(5).enumerated()), id: \.element.id) { index, run in
                        ActivityCardView(
                            date: run.date,
                            distanceMeters: run.distanceMeters,
                            durationSeconds: run.durationSeconds,
                            paceSecondsPerKm: run.avgPaceSecondsPerKm
                        )
                    }
                }
                .padding(.horizontal)

                if viewModel.recentRuns.count > 5 {
                    Button {
                        // Navigate to all runs
                    } label: {
                        Text("View all \(viewModel.recentRuns.count) runs")
                            .font(AppFont.bodyMedium.weight(.medium))
                            .foregroundStyle(Color.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, Spacing.md)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.xl)
                                    .fill(Color.surfaceRaised)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.xl)
                                            .stroke(Color.borderSubtle, lineWidth: 1)
                                    )
                            )
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Dashboard") {
    DashboardView()
        .preferredColorScheme(.dark)
}

#Preview("Dashboard - Light") {
    DashboardView()
        .preferredColorScheme(.light)
}
